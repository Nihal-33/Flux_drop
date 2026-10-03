import { Router, Response, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db, FileRecord } from '../../database/db.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { sanitizeFilename, calculateChecksum, generateSignedDownloadToken, verifySignedDownload } from '../../utils/security.js';
import { config } from '../../config.js';
import { ActivityService } from '../activity/activity.service.js';
import { supabaseService } from '../../database/supabase.js';

export const fileRouter = Router();

// Configure Multer storage to write directly into protected user subdirectories
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id || 'anonymous';
    const userDir = path.join(config.storageDir, 'users', userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const safeName = sanitizeFilename(file.originalname);
    const key = `${uuidv4()}_${safeName}`;
    cb(null, key);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize,
  }
});

// Detect category from MIME / Extension
function categorizeFile(mimeType: string, filename: string): FileRecord['category'] {
  const ext = path.extname(filename).toLowerCase();
  
  if (mimeType.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) {
    return 'images';
  }
  if (mimeType.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) {
    return 'videos';
  }
  if (mimeType.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext)) {
    return 'audio';
  }
  if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed')) {
    return 'archives';
  }
  if (
    ['.ts', '.js', '.tsx', '.jsx', '.json', '.py', '.cpp', '.c', '.h', '.java', '.go', '.rs', '.html', '.css', '.scss', '.sql', '.sh', '.yaml', '.yml', '.md'].includes(ext)
  ) {
    return 'code';
  }
  if (
    ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'].includes(ext) ||
    mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document')
  ) {
    return 'documents';
  }
  return 'other';
}

// Upload file(s)
fileRouter.post('/upload', authMiddleware, upload.array('files', 10), (req: AuthenticatedRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const userId = req.user!.id;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const createdRecords: FileRecord[] = [];
    let totalBytesAdded = 0;

    for (const f of files) {
      // Calculate file checksum
      const fileBuffer = fs.readFileSync(f.path);
      const checksum = calculateChecksum(fileBuffer);
      const category = categorizeFile(f.mimetype, f.originalname);
      const relativeStorageKey = path.relative(config.storageDir, f.path).replace(/\\/g, '/');

      const fileRecord: FileRecord = {
        id: uuidv4(),
        ownerId: userId,
        storageKey: relativeStorageKey,
        originalName: f.originalname,
        mimeType: f.mimetype || 'application/octet-stream',
        size: f.size,
        checksum,
        category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.files.push(fileRecord);
      createdRecords.push(fileRecord);
      totalBytesAdded += f.size;

      // Sync to Supabase
      supabaseService.upsertFile({
        id: fileRecord.id,
        owner_id: fileRecord.ownerId,
        storage_key: fileRecord.storageKey,
        original_name: fileRecord.originalName,
        mime_type: fileRecord.mimeType,
        size: fileRecord.size,
        checksum: fileRecord.checksum,
        category: fileRecord.category,
        created_at: fileRecord.createdAt,
        updated_at: fileRecord.updatedAt,
      }).catch(e => console.warn('Supabase file upload sync notice:', e.message));
    }

    // Update user storage
    const user = db.users.find(u => u.id === userId);
    if (user) {
      user.storageUsed += totalBytesAdded;
    }

    db.schedulePersist();

    ActivityService.log(
      userId,
      'files:uploaded',
      `Uploaded ${createdRecords.length} file(s)`,
      { count: createdRecords.length, totalBytes: totalBytesAdded },
      req.ip
    );

    return res.status(201).json({
      message: `${createdRecords.length} file(s) uploaded successfully.`,
      files: createdRecords,
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: 'File upload processing failed.' });
  }
});

// List user files with filtering, category, search
fileRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { category, search, sort = 'newest' } = req.query;

  let userFiles = db.files.filter(f => f.ownerId === userId);

  if (category && category !== 'all') {
    userFiles = userFiles.filter(f => f.category === category);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    userFiles = userFiles.filter(f => f.originalName.toLowerCase().includes(q));
  }

  if (sort === 'newest') {
    userFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sort === 'oldest') {
    userFiles.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sort === 'size-desc') {
    userFiles.sort((a, b) => b.size - a.size);
  } else if (sort === 'size-asc') {
    userFiles.sort((a, b) => a.size - b.size);
  } else if (sort === 'name') {
    userFiles.sort((a, b) => a.originalName.localeCompare(b.originalName));
  }

  return res.json({ files: userFiles });
});

// Generate signed download URL
fileRouter.get('/:id/signed-url', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const file = db.files.find(f => f.id === id && f.ownerId === userId);
  if (!file) {
    return res.status(404).json({ error: 'File not found or access denied.' });
  }

  const { expires, signature } = generateSignedDownloadToken(file.id, userId, 3600); // 1 hour validity
  const signedUrl = `/api/files/download/${file.id}?expires=${expires}&signature=${signature}&uid=${userId}`;

  return res.json({
    signedUrl,
    expiresAt: new Date(expires * 1000).toISOString(),
    filename: file.originalName,
  });
});

// Secure signed file download endpoint
fileRouter.get('/download/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { expires, signature, uid } = req.query;

    if (!expires || !signature || !uid) {
      return res.status(403).json({ error: 'Forbidden: Missing secure signature or parameters.' });
    }

    const isValid = verifySignedDownload(id, uid as string, parseInt(expires as string, 10), signature as string);
    if (!isValid) {
      return res.status(403).json({ error: 'Download link has expired or signature is invalid.' });
    }

    const file = db.files.find(f => f.id === id);
    if (!file) {
      return res.status(404).json({ error: 'File record not found.' });
    }

    const fullPath = path.join(config.storageDir, file.storageKey);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Physical file is no longer available on storage server.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);

    const stream = fs.createReadStream(fullPath);
    return stream.pipe(res);
  } catch (err: any) {
    console.error('Download stream error:', err);
    return res.status(500).json({ error: 'Error streaming file.' });
  }
});

// Rename file
fileRouter.patch('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { originalName } = req.body;
  const userId = req.user!.id;

  const file = db.files.find(f => f.id === id && f.ownerId === userId);
  if (!file) {
    return res.status(404).json({ error: 'File not found.' });
  }

  if (originalName && originalName.trim()) {
    file.originalName = originalName.trim();
    file.category = categorizeFile(file.mimeType, file.originalName);
    file.updatedAt = new Date().toISOString();
    db.schedulePersist();
  }

  return res.json({ file });
});

// Create and save a new code file directly
fileRouter.post('/create-code', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename, content } = req.body;
    const userId = req.user!.id;

    if (!filename || typeof filename !== 'string' || !filename.trim()) {
      return res.status(400).json({ error: 'Valid filename is required.' });
    }
    if (content === undefined || typeof content !== 'string') {
      return res.status(400).json({ error: 'Code content is required.' });
    }

    const safeName = sanitizeFilename(filename.trim());
    const userDir = path.join(config.storageDir, 'users', userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const fileBuffer = Buffer.from(content, 'utf8');
    const storageKey = path.join('users', userId, `${uuidv4()}_${safeName}`).replace(/\\/g, '/');
    const fullPath = path.join(config.storageDir, storageKey);

    fs.writeFileSync(fullPath, fileBuffer);

    const checksum = calculateChecksum(fileBuffer);
    const category = categorizeFile('text/plain', safeName);

    const fileRecord: FileRecord = {
      id: uuidv4(),
      ownerId: userId,
      storageKey,
      originalName: safeName,
      mimeType: 'text/plain',
      size: fileBuffer.length,
      checksum,
      category: category === 'other' ? 'code' : category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.files.push(fileRecord);

    const user = db.users.find(u => u.id === userId);
    if (user) {
      user.storageUsed += fileBuffer.length;
    }

    db.schedulePersist();

    ActivityService.log(
      userId,
      'files:created_code',
      `Created code file: ${safeName}`,
      { filename: safeName, size: fileBuffer.length },
      req.ip
    );

    return res.status(201).json({
      message: 'Code file created successfully.',
      file: fileRecord,
    });
  } catch (err: any) {
    console.error('Error creating code file:', err);
    return res.status(500).json({ error: 'Failed to create code file.' });
  }
});

// Get text/code content of a file
fileRouter.get('/:id/content', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const file = db.files.find(f => f.id === id && f.ownerId === userId);
  if (!file) {
    return res.status(404).json({ error: 'File not found.' });
  }

  const fullPath = path.join(config.storageDir, file.storageKey);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Physical file not found.' });
  }

  if (file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'File is too large to read in code editor.' });
  }

  try {
    const text = fs.readFileSync(fullPath, 'utf8');
    return res.json({
      id: file.id,
      filename: file.originalName,
      content: text,
      size: file.size,
      mimeType: file.mimeType,
      updatedAt: file.updatedAt,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read file content.' });
  }
});

// Update code content of an existing file
fileRouter.put('/:id/content', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user!.id;

  if (content === undefined || typeof content !== 'string') {
    return res.status(400).json({ error: 'Valid content is required.' });
  }

  const file = db.files.find(f => f.id === id && f.ownerId === userId);
  if (!file) {
    return res.status(404).json({ error: 'File not found.' });
  }

  const fullPath = path.join(config.storageDir, file.storageKey);
  try {
    const oldSize = file.size;
    const fileBuffer = Buffer.from(content, 'utf8');
    fs.writeFileSync(fullPath, fileBuffer);

    file.size = fileBuffer.length;
    file.checksum = calculateChecksum(fileBuffer);
    file.updatedAt = new Date().toISOString();

    const user = db.users.find(u => u.id === userId);
    if (user) {
      user.storageUsed = Math.max(0, user.storageUsed - oldSize + file.size);
    }

    db.schedulePersist();

    ActivityService.log(
      userId,
      'files:updated_code',
      `Updated code file: ${file.originalName}`,
      { filename: file.originalName, size: file.size },
      req.ip
    );

    return res.json({
      message: 'Code file updated successfully.',
      file,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update file content.' });
  }
});

// Delete file
fileRouter.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const index = db.files.findIndex(f => f.id === id && f.ownerId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'File not found.' });
  }

  const [file] = db.files.splice(index, 1);

  // Remove physical file
  const fullPath = path.join(config.storageDir, file.storageKey);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (e) {
      console.warn('Physical file deletion notice:', e);
    }
  }

  // Update quota
  const user = db.users.find(u => u.id === userId);
  if (user && user.storageUsed >= file.size) {
    user.storageUsed -= file.size;
  }

  db.schedulePersist();

  // Sync delete to Supabase
  supabaseService.deleteFile(id).catch(e => console.warn('Supabase file delete sync notice:', e.message));

  ActivityService.log(userId, 'files:deleted', `Deleted file: ${file.originalName}`, {}, req.ip);

  return res.json({ message: 'File deleted successfully.', id });
});

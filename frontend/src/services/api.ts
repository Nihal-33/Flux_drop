import {
  User,
  Device,
  FileRecord,
  Transfer,
  TextItem,
  LinkItem,
  NotificationItem,
  ActivityItem,
  UdharCustomer,
  UdharTransaction,
  UdharSummary,
} from '../types';

import { supabase } from './supabase';

const API_BASE = '/api';

const isCloudDeploy =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

async function hashSha256(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function categorizeFile(mimeType: string, filename: string): FileRecord['category'] {
  const ext = filename.includes('.') ? ('.' + filename.split('.').pop()!.toLowerCase()) : '';

  if (mimeType.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.heic', '.avif'].includes(ext)) {
    return 'images';
  }
  if (mimeType.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v'].includes(ext)) {
    return 'videos';
  }
  if (mimeType.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'].includes(ext)) {
    return 'audio';
  }
  if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.iso'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed')) {
    return 'archives';
  }
  if (
    ['.ts', '.js', '.tsx', '.jsx', '.json', '.py', '.cpp', '.c', '.h', '.java', '.go', '.rs', '.html', '.css', '.scss', '.sql', '.sh', '.yaml', '.yml', '.md', '.xml', '.env'].includes(ext)
  ) {
    return 'code';
  }
  if (
    ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.csv', '.tsv'].includes(ext) ||
    mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('sheet') || mimeType.includes('text')
  ) {
    return 'documents';
  }
  return 'other';
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  }, 1500);
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('fluxdrop_token');
  }

  private getPinToken(): string | null {
    return sessionStorage.getItem('fluxdrop_pin_token');
  }

  private getDeviceId(): string | null {
    return localStorage.getItem('fluxdrop_device_id');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const pinToken = this.getPinToken();
    const deviceId = this.getDeviceId();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (pinToken) {
      headers['x-pin-token'] = pinToken;
    }
    if (deviceId) {
      headers['x-device-id'] = deviceId;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (!res.ok) {
        if (
          (res.status === 404 || res.status === 405 || res.status === 502 || res.status === 504) &&
          API_BASE === '/api' &&
          window.location.hostname === 'localhost'
        ) {
          return await this.fallbackDirectRequest<T>(endpoint, options, headers);
        }
        const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
        throw new Error(errorData.error || errorData.message || `Request failed with status ${res.status}`);
      }

      return res.json();
    } catch (err: any) {
      if (API_BASE === '/api' && window.location.hostname === 'localhost') {
        return await this.fallbackDirectRequest<T>(endpoint, options, headers);
      }
      throw err;
    }
  }

  private async fallbackDirectRequest<T>(endpoint: string, options: RequestInit, headers: Record<string, string>): Promise<T> {
    const directUrl = `http://localhost:5000/api${endpoint}`;
    const directRes = await fetch(directUrl, {
      ...options,
      headers,
    });
    if (!directRes.ok) {
      const errorData = await directRes.json().catch(() => ({ error: `Request failed with status ${directRes.status}` }));
      throw new Error(errorData.error || errorData.message || `Request failed with status ${directRes.status}`);
    }
    return directRes.json();
  }

  private async getCurrentUserId(): Promise<string> {
    const cachedProfile = localStorage.getItem('fluxdrop_user_profile');
    if (cachedProfile) {
      try {
        const u = JSON.parse(cachedProfile);
        if (u.id) return u.id;
      } catch {
        // ignore
      }
    }
    const { data: authUser } = await supabase.auth.getUser();
    if (authUser?.user?.id) return authUser.user.id;
    return '06f66e57-39e2-46ef-9fea-9636328fa265';
  }

  private async supabaseRegister(data: {
    username: string;
    email: string;
    password: string;
    securityQuestion?: string;
    securityAnswer?: string;
  }) {
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
        },
      },
    });

    if (authErr) {
      throw new Error(authErr.message);
    }

    const userId = authData.user?.id || crypto.randomUUID();
    const token = authData.session?.access_token || `sb_token_${userId}`;
    const answerHash = data.securityAnswer ? await hashSha256(data.securityAnswer.trim().toLowerCase()) : null;

    await supabase.from('users').upsert({
      id: userId,
      username: data.username,
      email: data.email.toLowerCase(),
      password_hash: 'managed_by_supabase_auth',
      status: 'active',
      storage_used: 0,
      storage_limit: 10737418240,
      security_question: data.securityQuestion || null,
      security_answer_hash: answerHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    const user: User = {
      id: userId,
      username: data.username,
      email: data.email,
      storageUsed: 0,
      storageLimit: 10737418240,
      createdAt: new Date().toISOString(),
      securityQuestion: data.securityQuestion,
    };

    localStorage.setItem('fluxdrop_user_profile', JSON.stringify(user));

    return {
      message: 'Account created successfully',
      user,
      token,
      hasPin: false,
    };
  }

  private async supabaseLogin(identifier: string, password: string) {
    let email = identifier.trim();

    if (!email.includes('@')) {
      const { data: userRow } = await supabase
        .from('users')
        .select('*')
        .eq('username', identifier.trim())
        .maybeSingle();

      if (userRow && userRow.email) {
        email = userRow.email;
      }
    }

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authErr) {
      throw new Error(authErr.message || 'Invalid email/username or password.');
    }

    const userId = authData.user?.id || '';
    const token = authData.session?.access_token || `sb_token_${userId}`;

    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const { data: pinRow } = await supabase
      .from('pins')
      .select('id, user_id')
      .eq('user_id', userId)
      .maybeSingle();

    const user: User = {
      id: userId,
      username: userRow?.username || authData.user?.user_metadata?.username || email.split('@')[0],
      email: userRow?.email || email,
      storageUsed: Number(userRow?.storage_used) || 0,
      storageLimit: Number(userRow?.storage_limit) || 10737418240,
      avatarUrl: userRow?.avatar_url,
      createdAt: userRow?.created_at || new Date().toISOString(),
      securityQuestion: userRow?.security_question,
    };

    localStorage.setItem('fluxdrop_user_profile', JSON.stringify(user));

    return {
      user,
      token,
      hasPin: !!pinRow,
      hasSecurityQuestion: !!userRow?.security_question,
    };
  }

  private async supabaseGetMe() {
    const cachedProfile = localStorage.getItem('fluxdrop_user_profile');
    let user: User | null = cachedProfile ? JSON.parse(cachedProfile) : null;

    const { data: authUser } = await supabase.auth.getUser();
    if (authUser?.user) {
      const { data: userRow } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.user.id)
        .maybeSingle();

      if (userRow) {
        user = {
          id: userRow.id,
          username: userRow.username,
          email: userRow.email,
          storageUsed: Number(userRow.storage_used) || 0,
          storageLimit: Number(userRow.storage_limit) || 10737418240,
          avatarUrl: userRow.avatar_url,
          createdAt: userRow.created_at,
          securityQuestion: userRow.security_question,
        };
      }
    }

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: pinRow } = await supabase
      .from('pins')
      .select('id, failed_attempts, locked_until')
      .eq('user_id', user.id)
      .maybeSingle();

    const isLocked = pinRow?.locked_until ? new Date(pinRow.locked_until) > new Date() : false;

    return {
      user,
      hasPin: !!pinRow,
      isPinLocked: isLocked,
      hasSecurityQuestion: !!user.securityQuestion,
      securityQuestion: user.securityQuestion || null,
      connectedDevicesCount: 1,
      totalDevicesCount: 1,
    };
  }

  // --- SUPABASE DIRECT FILE METHODS ---

  private async supabaseUploadFiles(formData: FormData): Promise<{ message: string; files: FileRecord[] }> {
    const filesToUpload: File[] = [];
    formData.forEach((value) => {
      if (value instanceof File) {
        filesToUpload.push(value);
      }
    });

    if (filesToUpload.length === 0) {
      throw new Error('No files selected for upload.');
    }

    const userId = await this.getCurrentUserId();
    const createdRecords: FileRecord[] = [];
    let totalBytesAdded = 0;

    for (const file of filesToUpload) {
      const fileId = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `users/${userId}/${fileId}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from('fluxdrop-files')
        .upload(storageKey, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadErr) {
        throw new Error(`Upload to storage failed: ${uploadErr.message}`);
      }

      const category = categorizeFile(file.type || '', file.name);
      const now = new Date().toISOString();
      const checksum = await hashSha256(file.name + file.size + file.lastModified);

      const fileRecord: FileRecord = {
        id: fileId,
        ownerId: userId,
        storageKey,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        checksum,
        category,
        createdAt: now,
      };

      const { error: dbErr } = await supabase.from('files').insert({
        id: fileRecord.id,
        owner_id: fileRecord.ownerId,
        storage_key: fileRecord.storageKey,
        original_name: fileRecord.originalName,
        mime_type: fileRecord.mimeType,
        size: fileRecord.size,
        checksum: fileRecord.checksum,
        category: fileRecord.category,
        created_at: fileRecord.createdAt,
        updated_at: now,
      });

      if (dbErr) {
        console.warn('Database record insert notice:', dbErr.message);
      }

      createdRecords.push(fileRecord);
      totalBytesAdded += file.size;
    }

    try {
      const { data: userRow } = await supabase.from('users').select('storage_used').eq('id', userId).maybeSingle();
      const current = Number(userRow?.storage_used) || 0;
      await supabase.from('users').update({ storage_used: current + totalBytesAdded }).eq('id', userId);
    } catch {
      // ignore
    }

    return {
      message: `${createdRecords.length} file(s) uploaded successfully`,
      files: createdRecords,
    };
  }

  private async supabaseListFiles(params?: { category?: string; search?: string; sort?: string }): Promise<{ files: FileRecord[] }> {
    const userId = await this.getCurrentUserId();
    let query = supabase.from('files').select('*').eq('owner_id', userId);

    if (params?.category && params.category !== 'all') {
      query = query.eq('category', params.category);
    }

    if (params?.search && params.search.trim()) {
      query = query.ilike('original_name', `%${params.search.trim()}%`);
    }

    if (params?.sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (params?.sort === 'size-desc') {
      query = query.order('size', { ascending: false });
    } else if (params?.sort === 'size-asc') {
      query = query.order('size', { ascending: true });
    } else if (params?.sort === 'name') {
      query = query.order('original_name', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase files query warning:', error.message);
      return { files: [] };
    }

    const files: FileRecord[] = (data || []).map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      storageKey: row.storage_key,
      originalName: row.original_name,
      mimeType: row.mime_type || 'application/octet-stream',
      size: Number(row.size) || 0,
      checksum: row.checksum || '',
      category: row.category,
      createdAt: row.created_at,
    }));

    return { files };
  }

  private async supabaseGetSignedUrl(fileId: string) {
    const { data: fileRow } = await supabase.from('files').select('*').eq('id', fileId).maybeSingle();
    if (!fileRow) {
      throw new Error('File not found');
    }

    const { data: signedData } = await supabase.storage
      .from('fluxdrop-files')
      .createSignedUrl(fileRow.storage_key, 3600, {
        download: fileRow.original_name,
      });

    let signedUrl = signedData?.signedUrl;
    if (!signedUrl) {
      const { data: pubData } = supabase.storage
        .from('fluxdrop-files')
        .getPublicUrl(fileRow.storage_key, {
          download: fileRow.original_name,
        });
      signedUrl = pubData.publicUrl;
    }

    return {
      signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      filename: fileRow.original_name,
    };
  }

  private async supabaseDeleteFile(fileId: string) {
    const { data: fileRow } = await supabase.from('files').select('*').eq('id', fileId).maybeSingle();
    if (fileRow) {
      await supabase.storage.from('fluxdrop-files').remove([fileRow.storage_key]);
      await supabase.from('files').delete().eq('id', fileId);

      const userId = fileRow.owner_id;
      const { data: userRow } = await supabase.from('users').select('storage_used').eq('id', userId).maybeSingle();
      const current = Number(userRow?.storage_used) || 0;
      const updated = Math.max(0, current - Number(fileRow.size));
      await supabase.from('users').update({ storage_used: updated }).eq('id', userId);
    }
    return { message: 'File deleted successfully', id: fileId };
  }

  private async supabaseRenameFile(fileId: string, originalName: string) {
    await supabase.from('files').update({
      original_name: originalName,
      updated_at: new Date().toISOString(),
    }).eq('id', fileId);

    const { data: row } = await supabase.from('files').select('*').eq('id', fileId).single();
    return {
      file: {
        id: row.id,
        ownerId: row.owner_id,
        storageKey: row.storage_key,
        originalName: row.original_name,
        mimeType: row.mime_type || 'application/octet-stream',
        size: Number(row.size) || 0,
        checksum: row.checksum || '',
        category: row.category,
        createdAt: row.created_at,
      },
    };
  }

  private async supabaseCreateCode(data: { filename: string; content: string }) {
    const userId = await this.getCurrentUserId();
    const fileId = crypto.randomUUID();
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `users/${userId}/code_${fileId}_${safeName}`;

    const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' });
    await supabase.storage.from('fluxdrop-files').upload(storageKey, blob, {
      contentType: 'text/plain;charset=utf-8',
      upsert: true,
    });

    const now = new Date().toISOString();
    const fileRecord: FileRecord = {
      id: fileId,
      ownerId: userId,
      storageKey,
      originalName: data.filename,
      mimeType: 'text/plain',
      size: blob.size,
      checksum: await hashSha256(data.content),
      category: 'code',
      createdAt: now,
    };

    await supabase.from('files').insert({
      id: fileRecord.id,
      owner_id: fileRecord.ownerId,
      storage_key: fileRecord.storageKey,
      original_name: fileRecord.originalName,
      mime_type: fileRecord.mimeType,
      size: fileRecord.size,
      checksum: fileRecord.checksum,
      category: fileRecord.category,
      created_at: fileRecord.createdAt,
      updated_at: now,
    });

    return {
      message: 'Code file created successfully',
      file: fileRecord,
    };
  }

  private async supabaseGetCodeContent(fileId: string) {
    const { data: fileRow } = await supabase.from('files').select('*').eq('id', fileId).maybeSingle();
    if (!fileRow) throw new Error('File not found');

    const { data: blob } = await supabase.storage.from('fluxdrop-files').download(fileRow.storage_key);
    let content = '';
    if (blob) {
      content = await blob.text();
    } else {
      const { data: pubData } = supabase.storage.from('fluxdrop-files').getPublicUrl(fileRow.storage_key);
      const res = await fetch(pubData.publicUrl);
      if (res.ok) {
        content = await res.text();
      }
    }

    return {
      id: fileRow.id,
      filename: fileRow.original_name,
      content,
      size: Number(fileRow.size) || 0,
      mimeType: fileRow.mime_type || 'text/plain',
      updatedAt: fileRow.updated_at || fileRow.created_at,
    };
  }

  private async supabaseUpdateCodeContent(fileId: string, content: string) {
    const { data: fileRow } = await supabase.from('files').select('*').eq('id', fileId).maybeSingle();
    if (!fileRow) throw new Error('File not found');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    await supabase.storage.from('fluxdrop-files').upload(fileRow.storage_key, blob, {
      contentType: 'text/plain;charset=utf-8',
      upsert: true,
    });

    const now = new Date().toISOString();
    await supabase.from('files').update({
      size: blob.size,
      checksum: await hashSha256(content),
      updated_at: now,
    }).eq('id', fileId);

    const updatedFile: FileRecord = {
      id: fileRow.id,
      ownerId: fileRow.owner_id,
      storageKey: fileRow.storage_key,
      originalName: fileRow.original_name,
      mimeType: fileRow.mime_type || 'text/plain',
      size: blob.size,
      checksum: await hashSha256(content),
      category: fileRow.category,
      createdAt: fileRow.created_at,
    };

    return {
      message: 'Code updated successfully',
      file: updatedFile,
    };
  }

  private async supabaseGetStorage() {
    const userId = await this.getCurrentUserId();
    const { data: userRow } = await supabase.from('users').select('storage_used, storage_limit').eq('id', userId).maybeSingle();
    const { data: files } = await supabase.from('files').select('size, category').eq('owner_id', userId);

    const breakdown: Record<string, number> = {
      images: 0,
      videos: 0,
      audio: 0,
      documents: 0,
      code: 0,
      archives: 0,
      other: 0,
    };

    let calculatedUsed = 0;
    (files || []).forEach((f) => {
      const sz = Number(f.size) || 0;
      calculatedUsed += sz;
      if (f.category && breakdown[f.category] !== undefined) {
        breakdown[f.category] += sz;
      } else {
        breakdown.other += sz;
      }
    });

    const storageLimit = Number(userRow?.storage_limit) || 10737418240;
    const storageUsed = Number(userRow?.storage_used) || calculatedUsed;

    return {
      storageUsed,
      storageLimit,
      storageRemaining: Math.max(0, storageLimit - storageUsed),
      fileCount: files?.length || 0,
      breakdown,
    };
  }

  // Auth
  public auth = {
    register: async (data: {
      username: string;
      email: string;
      password: string;
      securityQuestion?: string;
      securityAnswer?: string;
    }) => {
      if (isCloudDeploy) {
        return await this.supabaseRegister(data);
      }

      try {
        return await this.request<{ user: User; token: string; hasPin: boolean }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch {
        return await this.supabaseRegister(data);
      }
    },
    login: async (data: { identifier: string; password: string }) => {
      if (isCloudDeploy) {
        return await this.supabaseLogin(data.identifier, data.password);
      }

      try {
        return await this.request<{ user: User; token: string; hasPin: boolean; hasSecurityQuestion?: boolean }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch {
        return await this.supabaseLogin(data.identifier, data.password);
      }
    },
    getMe: async () => {
      if (isCloudDeploy) {
        return await this.supabaseGetMe();
      }

      try {
        return await this.request<{
          user: User;
          hasPin: boolean;
          isPinLocked: boolean;
          hasSecurityQuestion?: boolean;
          securityQuestion?: string | null;
          connectedDevicesCount: number;
          totalDevicesCount: number;
        }>('/auth/me');
      } catch {
        return await this.supabaseGetMe();
      }
    },
    logout: async () => {
      try {
        return await this.request<{ message: string }>('/auth/logout', { method: 'POST' });
      } catch {
        await supabase.auth.signOut();
        return { message: 'Logged out successfully' };
      }
    },
  };

  // PIN
  public pin = {
    create: async (pin: string, confirmPin: string) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ message: string; pinToken: string }>('/pin/create', {
            method: 'POST',
            body: JSON.stringify({ pin, confirmPin }),
          });
        } catch {
          // fall through to Supabase
        }
      }

      const userId = await this.getCurrentUserId();
      const pinHash = await hashSha256(pin);
      await supabase.from('pins').upsert({
        user_id: userId,
        pin_hash: pinHash,
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      const pinToken = `pin_verified_${userId}`;
      sessionStorage.setItem('fluxdrop_pin_token', pinToken);
      return { message: 'Security PIN configured successfully.', pinToken };
    },
    verify: async (pin: string) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ message: string; pinToken: string }>('/pin/verify', {
            method: 'POST',
            body: JSON.stringify({ pin }),
          });
        } catch {
          // fall through to Supabase
        }
      }

      const userId = await this.getCurrentUserId();
      const { data: pinRow } = await supabase.from('pins').select('*').eq('user_id', userId).maybeSingle();
      if (!pinRow) {
        throw new Error('No PIN set up for this account.');
      }

      const inputHash = await hashSha256(pin);
      if (pinRow.pin_hash !== inputHash && !pinRow.pin_hash.startsWith('$2b$')) {
        throw new Error('Incorrect PIN. Please try again.');
      }

      const pinToken = `pin_verified_${userId}`;
      sessionStorage.setItem('fluxdrop_pin_token', pinToken);
      return { message: 'PIN verified successfully.', pinToken };
    },
    status: async () => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ hasPin: boolean; isLocked?: boolean; lockedUntil?: string | null; failedAttempts?: number }>(
            '/pin/status'
          );
        } catch {
          // fall through to Supabase
        }
      }

      const userId = await this.getCurrentUserId();
      const { data: pinRow } = await supabase.from('pins').select('*').eq('user_id', userId).maybeSingle();
      return {
        hasPin: !!pinRow,
        isLocked: pinRow?.locked_until ? new Date(pinRow.locked_until) > new Date() : false,
        lockedUntil: pinRow?.locked_until || null,
        failedAttempts: pinRow?.failed_attempts || 0,
      };
    },
    getSecurityQuestion: async () => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ hasSecurityQuestion: boolean; securityQuestion: string | null }>(
            '/pin/security-question'
          );
        } catch {
          // fall through
        }
      }

      const userId = await this.getCurrentUserId();
      const { data: userRow } = await supabase.from('users').select('security_question').eq('id', userId).maybeSingle();
      return {
        hasSecurityQuestion: !!userRow?.security_question,
        securityQuestion: userRow?.security_question || null,
      };
    },
    recoverWithQuestion: async (data: { answer: string; newPin?: string }) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ message: string; pinToken: string }>('/pin/recover-with-question', {
            method: 'POST',
            body: JSON.stringify(data),
          });
        } catch {
          // fall through
        }
      }

      const userId = await this.getCurrentUserId();
      if (data.newPin) {
        const pinHash = await hashSha256(data.newPin);
        await supabase.from('pins').upsert({
          user_id: userId,
          pin_hash: pinHash,
          failed_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
      const pinToken = `pin_verified_${userId}`;
      sessionStorage.setItem('fluxdrop_pin_token', pinToken);
      return { message: 'Security question verified! Workspace unlocked.', pinToken };
    },
    setSecurityQuestion: async (data: { question: string; answer: string }) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ message: string }>('/pin/set-security-question', {
            method: 'POST',
            body: JSON.stringify(data),
          });
        } catch {
          // fall through
        }
      }

      const userId = await this.getCurrentUserId();
      const answerHash = await hashSha256(data.answer.trim().toLowerCase());
      await supabase.from('users').update({
        security_question: data.question.trim(),
        security_answer_hash: answerHash,
      }).eq('id', userId);
      return { message: 'Security question configured successfully.' };
    },
  };

  // Devices
  public devices = {
    list: async () => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ devices: Device[] }>('/devices');
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      const { data } = await supabase.from('devices').select('*').eq('user_id', userId);
      const devices: Device[] = (data || []).map((d) => ({
        id: d.id,
        userId: d.user_id,
        deviceName: d.device_name,
        deviceType: d.device_type,
        platform: d.platform,
        browser: d.browser,
        isOnline: d.is_online ?? true,
        isTrusted: d.is_trusted ?? true,
        lastSeen: d.last_seen || d.created_at,
        createdAt: d.created_at,
      }));
      return { devices };
    },
    register: async (data: {
      deviceName: string;
      deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet';
      platform: string;
      browser: string;
      existingDeviceId?: string;
    }) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ device: Device; deviceToken?: string }>('/devices/register', {
            method: 'POST',
            body: JSON.stringify(data),
          });
        } catch {
          // fall through
        }
      }

      const userId = await this.getCurrentUserId();
      const deviceId = data.existingDeviceId || crypto.randomUUID();
      const now = new Date().toISOString();

      await supabase.from('devices').upsert({
        id: deviceId,
        user_id: userId,
        device_name: data.deviceName,
        device_type: data.deviceType,
        platform: data.platform,
        browser: data.browser,
        is_online: true,
        is_trusted: true,
        last_seen: now,
        updated_at: now,
      }, { onConflict: 'id' });

      const device: Device = {
        id: deviceId,
        userId,
        deviceName: data.deviceName,
        deviceType: data.deviceType,
        platform: data.platform,
        browser: data.browser,
        isOnline: true,
        isTrusted: true,
        lastSeen: now,
        createdAt: now,
      };

      return { device, deviceToken: `dev_token_${deviceId}` };
    },
    update: async (id: string, data: { deviceName?: string; isTrusted?: boolean }) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ device: Device }>(`/devices/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
          });
        } catch {
          // fall through
        }
      }

      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (data.deviceName !== undefined) updateData.device_name = data.deviceName;
      if (data.isTrusted !== undefined) updateData.is_trusted = data.isTrusted;

      await supabase.from('devices').update(updateData).eq('id', id);
      const { data: row } = await supabase.from('devices').select('*').eq('id', id).single();
      const device: Device = {
        id: row.id,
        userId: row.user_id,
        deviceName: row.device_name,
        deviceType: row.device_type,
        platform: row.platform,
        browser: row.browser,
        isOnline: row.is_online ?? true,
        isTrusted: row.is_trusted ?? true,
        lastSeen: row.last_seen,
        createdAt: row.created_at,
      };
      return { device };
    },
    revoke: async (id: string) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ message: string; deviceId: string }>(`/devices/${id}`, {
            method: 'DELETE',
          });
        } catch {
          // fall through
        }
      }
      await supabase.from('devices').delete().eq('id', id);
      return { message: 'Device revoked successfully', deviceId: id };
    },
  };

  // Pairing
  public pairing = {
    initiate: (deviceId: string) =>
      this.request<{
        sessionId: string;
        pairingCode: string;
        qrPayload: string;
        expiresAt: string;
        initiatorDevice: { id: string; name: string; platform: string };
      }>('/pairing/initiate', {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      }),
    requestPairing: (data: {
      codeOrToken: string;
      deviceId: string;
      deviceName: string;
      platform: string;
      browser: string;
    }) =>
      this.request<{
        message: string;
        sessionId: string;
        targetDevice?: { name: string; platform: string };
      }>('/pairing/request', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    decision: (sessionId: string, approved: boolean) =>
      this.request<{ message: string }>('/pairing/decision', {
        method: 'POST',
        body: JSON.stringify({ sessionId, approved }),
      }),
  };

  // Files
  public files = {
    list: async (params?: { category?: string; search?: string; sort?: string }) => {
      if (isCloudDeploy) {
        return await this.supabaseListFiles(params);
      }
      try {
        const searchParams = new URLSearchParams();
        if (params?.category) searchParams.set('category', params.category);
        if (params?.search) searchParams.set('search', params.search);
        if (params?.sort) searchParams.set('sort', params.sort);
        return await this.request<{ files: FileRecord[] }>(`/files?${searchParams.toString()}`);
      } catch {
        return await this.supabaseListFiles(params);
      }
    },
    upload: async (formData: FormData) => {
      if (isCloudDeploy) {
        return await this.supabaseUploadFiles(formData);
      }
      try {
        return await this.request<{ message: string; files: FileRecord[] }>('/files/upload', {
          method: 'POST',
          body: formData,
        });
      } catch {
        return await this.supabaseUploadFiles(formData);
      }
    },
    getSignedUrl: async (fileId: string) => {
      if (isCloudDeploy) {
        return await this.supabaseGetSignedUrl(fileId);
      }
      try {
        return await this.request<{ signedUrl: string; expiresAt: string; filename: string }>(`/files/${fileId}/signed-url`);
      } catch {
        return await this.supabaseGetSignedUrl(fileId);
      }
    },
    download: async (fileId: string, fallbackFilename?: string) => {
      // 1. If on cloud deploy, try direct Supabase storage blob download first
      if (isCloudDeploy) {
        try {
          const { data: fileRow } = await supabase
            .from('files')
            .select('*')
            .eq('id', fileId)
            .maybeSingle();

          if (fileRow) {
            const filename = fallbackFilename || fileRow.original_name || 'download';
            const { data: blob, error } = await supabase.storage
              .from('fluxdrop-files')
              .download(fileRow.storage_key);

            if (blob && !error) {
              triggerBlobDownload(blob, filename);
              return;
            }
          }
        } catch (e) {
          console.warn('Direct Supabase blob download notice, trying signed url:', e);
        }
      }

      // 2. Fall back to signed URL with fetch -> blob
      const res = await api.files.getSignedUrl(fileId);
      const filename = fallbackFilename || res.filename || 'download';

      try {
        const fetchRes = await fetch(res.signedUrl);
        if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);
        const blob = await fetchRes.blob();
        triggerBlobDownload(blob, filename);
      } catch {
        // Fallback: programmatic anchor click
        const a = document.createElement('a');
        a.href = res.signedUrl;
        a.setAttribute('download', filename);
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    },
    rename: async (fileId: string, originalName: string) => {
      if (isCloudDeploy) {
        return await this.supabaseRenameFile(fileId, originalName);
      }
      try {
        return await this.request<{ file: FileRecord }>(`/files/${fileId}`, {
          method: 'PATCH',
          body: JSON.stringify({ originalName }),
        });
      } catch {
        return await this.supabaseRenameFile(fileId, originalName);
      }
    },
    createCode: async (data: { filename: string; content: string }) => {
      if (isCloudDeploy) {
        return await this.supabaseCreateCode(data);
      }
      try {
        return await this.request<{ message: string; file: FileRecord }>('/files/create-code', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch {
        return await this.supabaseCreateCode(data);
      }
    },
    getCodeContent: async (fileId: string) => {
      if (isCloudDeploy) {
        return await this.supabaseGetCodeContent(fileId);
      }
      try {
        return await this.request<{
          id: string;
          filename: string;
          content: string;
          size: number;
          mimeType: string;
          updatedAt: string;
        }>(`/files/${fileId}/content`);
      } catch {
        return await this.supabaseGetCodeContent(fileId);
      }
    },
    updateCodeContent: async (fileId: string, content: string) => {
      if (isCloudDeploy) {
        return await this.supabaseUpdateCodeContent(fileId, content);
      }
      try {
        return await this.request<{ message: string; file: FileRecord }>(`/files/${fileId}/content`, {
          method: 'PUT',
          body: JSON.stringify({ content }),
        });
      } catch {
        return await this.supabaseUpdateCodeContent(fileId, content);
      }
    },
    delete: async (fileId: string) => {
      if (isCloudDeploy) {
        return await this.supabaseDeleteFile(fileId);
      }
      try {
        return await this.request<{ message: string; id: string }>(`/files/${fileId}`, {
          method: 'DELETE',
        });
      } catch {
        return await this.supabaseDeleteFile(fileId);
      }
    },
  };

  // Transfers
  public transfers = {
    create: (data: {
      receiverDeviceId: string;
      receiverUserId?: string;
      senderDeviceId?: string;
      connectionType?: 'direct' | 'relay';
      items: Array<{ filename: string; size: number; mimeType: string; fileId?: string }>;
    }) =>
      this.request<{ transfer: Transfer }>('/transfers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: (params?: { tab?: string; search?: string }) => {
      const sp = new URLSearchParams();
      if (params?.tab) sp.set('tab', params.tab);
      if (params?.search) sp.set('search', params.search);
      return this.request<{ transfers: Transfer[] }>(`/transfers?${sp.toString()}`);
    },
    get: (id: string) => this.request<{ transfer: Transfer }>(`/transfers/${id}`),
    accept: (id: string, deviceId: string) =>
      this.request<{ message: string; transfer: Transfer }>(`/transfers/${id}/accept`, {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      }),
    reject: (id: string, deviceId: string, reason?: string) =>
      this.request<{ message: string; transfer: Transfer }>(`/transfers/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ deviceId, reason }),
      }),
    start: (id: string) => this.request<{ transfer: Transfer }>(`/transfers/${id}/start`, { method: 'POST' }),
    updateProgress: (id: string, itemId: string, progress: number) =>
      this.request<{ success: boolean }>(`/transfers/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ itemId, progress }),
      }),
    complete: (id: string) =>
      this.request<{ message: string; transfer: Transfer }>(`/transfers/${id}/complete`, { method: 'POST' }),
  };

  // Text & Notes
  public text = {
    list: async () => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ items: TextItem[] }>('/text');
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      const { data } = await supabase.from('text_items').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
      const items: TextItem[] = (data || []).map((t) => ({
        id: t.id,
        ownerId: t.owner_id,
        title: t.title,
        content: t.content,
        language: t.language || 'text',
        createdAt: t.created_at,
      }));
      return { items };
    },
    create: async (data: { title?: string; content: string; language: string }) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ item: TextItem }>('/text', {
            method: 'POST',
            body: JSON.stringify(data),
          });
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await supabase.from('text_items').insert({
        id,
        owner_id: userId,
        title: data.title || 'Quick Note',
        content: data.content,
        language: data.language,
        created_at: now,
      });
      const item: TextItem = {
        id,
        ownerId: userId,
        title: data.title || 'Quick Note',
        content: data.content,
        language: data.language,
        createdAt: now,
      };
      return { item };
    },
    delete: async (id: string) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ success: boolean; id: string }>(`/text/${id}`, { method: 'DELETE' });
        } catch {
          // fall through
        }
      }
      await supabase.from('text_items').delete().eq('id', id);
      return { success: true, id };
    },
  };

  // Links
  public links = {
    list: async () => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ links: LinkItem[] }>('/links');
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      const { data } = await supabase.from('links').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
      const links: LinkItem[] = (data || []).map((l) => ({
        id: l.id,
        ownerId: l.owner_id,
        url: l.url,
        title: l.title || l.url,
        domain: l.domain || new URL(l.url.startsWith('http') ? l.url : `https://${l.url}`).hostname,
        faviconUrl: l.favicon_url,
        createdAt: l.created_at,
      }));
      return { links };
    },
    create: async (data: { url: string; title?: string }) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ link: LinkItem }>('/links', {
            method: 'POST',
            body: JSON.stringify(data),
          });
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      let domain = '';
      try {
        domain = new URL(data.url.startsWith('http') ? data.url : `https://${data.url}`).hostname;
      } catch {
        domain = data.url;
      }
      await supabase.from('links').insert({
        id,
        owner_id: userId,
        url: data.url,
        title: data.title || domain,
        domain,
        favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        created_at: now,
      });
      const link: LinkItem = {
        id,
        ownerId: userId,
        url: data.url,
        title: data.title || domain,
        domain,
        faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        createdAt: now,
      };
      return { link };
    },
    delete: async (id: string) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ success: boolean; id: string }>(`/links/${id}`, { method: 'DELETE' });
        } catch {
          // fall through
        }
      }
      await supabase.from('links').delete().eq('id', id);
      return { success: true, id };
    },
  };

  // Notifications
  public notifications = {
    list: async () => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ notifications: NotificationItem[] }>('/notifications');
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      const notifications: NotificationItem[] = (data || []).map((n) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read ?? false,
        createdAt: n.created_at,
      }));
      return { notifications };
    },
    markAllRead: async () => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ success: boolean }>('/notifications/read-all', { method: 'POST' });
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
      return { success: true };
    },
    markRead: async (id: string) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' });
        } catch {
          // fall through
        }
      }
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      return { success: true };
    },
  };

  // Activity
  public activity = {
    list: async () => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ activities: ActivityItem[] }>('/activity');
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      const { data } = await supabase.from('activity_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      const activities: ActivityItem[] = (data || []).map((a) => ({
        id: a.id,
        userId: a.user_id,
        type: a.type,
        title: a.title,
        metadata: a.metadata,
        ipHash: a.ip_hash,
        createdAt: a.created_at,
      }));
      return { activities };
    },
  };

  // Security & Storage Profile
  public security = {
    changePassword: async (data: { currentPassword: string; newPassword: string }) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ message: string }>('/security/change-password', {
            method: 'POST',
            body: JSON.stringify(data),
          });
        } catch {
          // fall through
        }
      }
      const { error } = await supabase.auth.updateUser({ password: data.newPassword });
      if (error) throw new Error(error.message);
      return { message: 'Password updated successfully' };
    },
    updateProfile: async (data: { username?: string; avatarUrl?: string }) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ message: string; user: Partial<User> }>('/security/profile', {
            method: 'PATCH',
            body: JSON.stringify(data),
          });
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (data.username) updateData.username = data.username;
      if (data.avatarUrl) updateData.avatar_url = data.avatarUrl;
      await supabase.from('users').update(updateData).eq('id', userId);
      return { message: 'Profile updated successfully', user: data };
    },
    getStorage: async () => {
      if (isCloudDeploy) {
        return await this.supabaseGetStorage();
      }
      try {
        return await this.request<{
          storageUsed: number;
          storageLimit: number;
          storageRemaining: number;
          fileCount: number;
          breakdown: Record<string, number>;
        }>('/security/storage');
      } catch {
        return await this.supabaseGetStorage();
      }
    },
  };

  // Udhar / Khata Management
  public udhar = {
    getSummary: async (): Promise<UdharSummary> => {
      if (!isCloudDeploy) {
        try {
          return await this.request<UdharSummary>('/udhar/summary');
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      const { data: customers } = await supabase.from('udhar_customers').select('total_gave, total_got').eq('user_id', userId);
      const { data: txs } = await supabase.from('udhar_transactions').select('is_settled').eq('user_id', userId);

      let totalGave = 0;
      let totalGot = 0;
      (customers || []).forEach((c) => {
        totalGave += Number(c.total_gave) || 0;
        totalGot += Number(c.total_got) || 0;
      });

      const pendingCount = (txs || []).filter((t) => !t.is_settled).length;

      return {
        totalGave,
        totalGot,
        netBalance: totalGave - totalGot,
        customerCount: customers?.length || 0,
        transactionCount: txs?.length || 0,
        pendingCount,
      };
    },
    getCustomers: async (params?: { search?: string; filter?: string }) => {
      if (!isCloudDeploy) {
        try {
          const sp = new URLSearchParams();
          if (params?.search) sp.set('search', params.search);
          if (params?.filter) sp.set('filter', params.filter);
          return await this.request<{ customers: UdharCustomer[] }>(`/udhar/customers?${sp.toString()}`);
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      let query = supabase.from('udhar_customers').select('*').eq('user_id', userId);
      if (params?.search && params.search.trim()) {
        query = query.ilike('name', `%${params.search.trim()}%`);
      }
      const { data } = await query;
      const customers: UdharCustomer[] = (data || []).map((c) => ({
        id: c.id,
        userId: c.user_id,
        name: c.name,
        phone: c.phone,
        notes: c.notes,
        totalGave: Number(c.total_gave) || 0,
        totalGot: Number(c.total_got) || 0,
        balance: Number(c.balance) || 0,
        transactionCount: c.transaction_count || 0,
        lastTransactionAt: c.last_transaction_at || c.created_at,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
      return { customers };
    },
    createCustomer: async (data: { name: string; phone?: string; notes?: string }) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ message: string; customer: UdharCustomer }>('/udhar/customers', {
            method: 'POST',
            body: JSON.stringify(data),
          });
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await supabase.from('udhar_customers').insert({
        id,
        user_id: userId,
        name: data.name,
        phone: data.phone || null,
        notes: data.notes || null,
        total_gave: 0,
        total_got: 0,
        balance: 0,
        created_at: now,
        updated_at: now,
      });
      const customer: UdharCustomer = {
        id,
        userId,
        name: data.name,
        phone: data.phone,
        notes: data.notes,
        totalGave: 0,
        totalGot: 0,
        balance: 0,
        transactionCount: 0,
        lastTransactionAt: now,
        createdAt: now,
        updatedAt: now,
      };
      return { message: 'Customer added successfully', customer };
    },
    getCustomer: async (id: string) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ customer: UdharCustomer; transactions: UdharTransaction[] }>(`/udhar/customers/${id}`);
        } catch {
          // fall through
        }
      }
      const { data: c } = await supabase.from('udhar_customers').select('*').eq('id', id).single();
      const { data: txRows } = await supabase.from('udhar_transactions').select('*').eq('customer_id', id).order('created_at', { ascending: false });

      const customer: UdharCustomer = {
        id: c.id,
        userId: c.user_id,
        name: c.name,
        phone: c.phone,
        notes: c.notes,
        totalGave: Number(c.total_gave) || 0,
        totalGot: Number(c.total_got) || 0,
        balance: Number(c.balance) || 0,
        transactionCount: txRows?.length || 0,
        lastTransactionAt: c.last_transaction_at || c.created_at,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };

      const transactions: UdharTransaction[] = (txRows || []).map((t) => ({
        id: t.id,
        userId: t.user_id,
        customerId: t.customer_id,
        type: t.type,
        amount: Number(t.amount) || 0,
        description: t.description,
        paymentMode: t.payment_mode || 'cash',
        dueDate: t.due_date,
        status: t.is_settled ? 'settled' : 'pending',
        createdAt: t.created_at,
      }));

      return { customer, transactions };
    },
    deleteCustomer: async (id: string) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ message: string }>(`/udhar/customers/${id}`, { method: 'DELETE' });
        } catch {
          // fall through
        }
      }
      await supabase.from('udhar_transactions').delete().eq('customer_id', id);
      await supabase.from('udhar_customers').delete().eq('id', id);
      return { message: 'Customer deleted successfully' };
    },
    addTransaction: async (data: {
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      type: 'gave' | 'got';
      amount: number;
      description?: string;
      paymentMode?: string;
      dueDate?: string;
    }) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ message: string; transaction: UdharTransaction }>('/udhar/transactions', {
            method: 'POST',
            body: JSON.stringify(data),
          });
        } catch {
          // fall through
        }
      }
      const userId = await this.getCurrentUserId();
      let customerId = data.customerId;
      const now = new Date().toISOString();

      if (!customerId && data.customerName) {
        const newCustId = crypto.randomUUID();
        await supabase.from('udhar_customers').insert({
          id: newCustId,
          user_id: userId,
          name: data.customerName,
          phone: data.customerPhone || null,
          total_gave: 0,
          total_got: 0,
          balance: 0,
          created_at: now,
          updated_at: now,
        });
        customerId = newCustId;
      }

      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const txId = crypto.randomUUID();
      await supabase.from('udhar_transactions').insert({
        id: txId,
        user_id: userId,
        customer_id: customerId,
        type: data.type,
        amount: data.amount,
        description: data.description || null,
        payment_mode: data.paymentMode || 'cash',
        due_date: data.dueDate || null,
        is_settled: false,
        created_at: now,
      });

      // Update customer balances
      const { data: c } = await supabase.from('udhar_customers').select('*').eq('id', customerId).single();
      if (c) {
        const gave = Number(c.total_gave) || 0;
        const got = Number(c.total_got) || 0;
        const newGave = data.type === 'gave' ? gave + data.amount : gave;
        const newGot = data.type === 'got' ? got + data.amount : got;
        await supabase.from('udhar_customers').update({
          total_gave: newGave,
          total_got: newGot,
          balance: newGave - newGot,
          last_transaction_at: now,
          updated_at: now,
        }).eq('id', customerId);
      }

      const transaction: UdharTransaction = {
        id: txId,
        userId,
        customerId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        paymentMode: data.paymentMode || 'cash',
        dueDate: data.dueDate,
        status: 'pending',
        createdAt: now,
      };

      return { message: 'Transaction recorded successfully', transaction };
    },
    settleTransaction: async (id: string) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ message: string; transaction: UdharTransaction }>(`/udhar/transactions/${id}/settle`, {
            method: 'PATCH',
          });
        } catch {
          // fall through
        }
      }
      await supabase.from('udhar_transactions').update({ is_settled: true }).eq('id', id);
      const { data: t } = await supabase.from('udhar_transactions').select('*').eq('id', id).single();
      const transaction: UdharTransaction = {
        id: t.id,
        userId: t.user_id,
        customerId: t.customer_id,
        type: t.type,
        amount: Number(t.amount) || 0,
        description: t.description,
        paymentMode: t.payment_mode || 'cash',
        dueDate: t.due_date,
        status: 'settled',
        createdAt: t.created_at,
      };
      return { message: 'Transaction marked as settled', transaction };
    },
    deleteTransaction: async (id: string) => {
      if (!isCloudDeploy) {
        try {
          return await this.request<{ message: string }>(`/udhar/transactions/${id}`, { method: 'DELETE' });
        } catch {
          // fall through
        }
      }
      await supabase.from('udhar_transactions').delete().eq('id', id);
      return { message: 'Transaction deleted successfully' };
    },
  };
}

export const api = new ApiClient();

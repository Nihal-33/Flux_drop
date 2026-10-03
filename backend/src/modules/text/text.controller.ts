import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, TextItem } from '../../database/db.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ActivityService } from '../activity/activity.service.js';
import { supabaseService } from '../../database/supabase.js';

export const textRouter = Router();

// Save new snippet or text
textRouter.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { title, content, language } = req.body;
  const userId = req.user!.id;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required.' });
  }

  const item: TextItem = {
    id: uuidv4(),
    ownerId: userId,
    title: title?.trim() || 'Untitled snippet',
    content,
    language: language || 'plaintext',
    createdAt: new Date().toISOString(),
  };

  db.textItems.unshift(item);
  db.schedulePersist();

  // Sync to Supabase
  supabaseService.upsertTextItem({
    id: item.id,
    owner_id: item.ownerId,
    title: item.title,
    content: item.content,
    language: item.language,
    created_at: item.createdAt,
  }).catch(e => console.warn('Supabase text sync notice:', e.message));

  ActivityService.log(userId, 'text:created', `Shared text snippet: ${item.title}`, { language: item.language });

  return res.status(201).json({ item });
});

// Get user snippets
textRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const items = db.textItems.filter(t => t.ownerId === userId);
  return res.json({ items });
});

// Delete snippet
textRouter.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const idx = db.textItems.findIndex(t => t.id === id && t.ownerId === userId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Text item not found.' });
  }

  db.textItems.splice(idx, 1);
  db.schedulePersist();

  // Sync delete to Supabase
  supabaseService.deleteTextItem(id).catch(e => console.warn('Supabase text delete notice:', e.message));

  return res.json({ success: true, id });
});

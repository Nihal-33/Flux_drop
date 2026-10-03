import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, LinkItem } from '../../database/db.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ActivityService } from '../activity/activity.service.js';
import { supabaseService } from '../../database/supabase.js';

export const linkRouter = Router();

// Add and parse shared link
linkRouter.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url, title } = req.body;
    const userId = req.user!.id;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required.' });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format.' });
    }

    const domain = parsedUrl.hostname.replace('www.', '');
    const cleanUrl = parsedUrl.href;
    const detectedTitle = title?.trim() || `${domain} link`;
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    const link: LinkItem = {
      id: uuidv4(),
      ownerId: userId,
      url: cleanUrl,
      title: detectedTitle,
      domain,
      faviconUrl,
      createdAt: new Date().toISOString(),
    };

    db.links.unshift(link);
    db.schedulePersist();

    // Sync to Supabase
    supabaseService.upsertLink({
      id: link.id,
      owner_id: link.ownerId,
      url: link.url,
      title: link.title,
      domain: link.domain,
      favicon_url: link.faviconUrl,
      created_at: link.createdAt,
    }).catch(e => console.warn('Supabase link sync notice:', e.message));

    ActivityService.log(userId, 'link:created', `Shared URL: ${domain}`, { url: cleanUrl });

    return res.status(201).json({ link });
  } catch (err: any) {
    console.error('Link create error:', err);
    return res.status(500).json({ error: 'Failed to process link.' });
  }
});

// List links
linkRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const links = db.links.filter(l => l.ownerId === userId);
  return res.json({ links });
});

// Delete link
linkRouter.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const idx = db.links.findIndex(l => l.id === id && l.ownerId === userId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Link not found.' });
  }

  db.links.splice(idx, 1);
  db.schedulePersist();

  // Sync delete to Supabase
  supabaseService.deleteLink(id).catch(e => console.warn('Supabase link delete notice:', e.message));

  return res.json({ success: true, id });
});

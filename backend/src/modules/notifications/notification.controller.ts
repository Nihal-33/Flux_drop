import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { NotificationService } from './notification.service.js';

export const notificationRouter = Router();

// Get user notifications
notificationRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const notifs = NotificationService.getForUser(req.user!.id);
  return res.json({ notifications: notifs });
});

// Mark all as read
notificationRouter.post('/read-all', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  NotificationService.markAllRead(req.user!.id);
  return res.json({ success: true });
});

// Mark single as read
notificationRouter.patch('/:id/read', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  NotificationService.markRead(req.user!.id, req.params.id);
  return res.json({ success: true });
});

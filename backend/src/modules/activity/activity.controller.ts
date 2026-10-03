import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ActivityService } from './activity.service.js';

export const activityRouter = Router();

activityRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const logs = ActivityService.getForUser(req.user!.id, 100);
  return res.json({ activities: logs });
});

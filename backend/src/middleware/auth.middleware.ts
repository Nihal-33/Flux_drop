import { Request, Response, NextFunction } from 'express';
import { db, User } from '../database/db.js';
import { verifyToken } from '../utils/security.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  deviceId?: string;
  sessionId?: string;
  isPinVerified?: boolean;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken<{ userId: string; deviceId?: string; sessionId?: string; pinVerified?: boolean }>(token);

  if (!decoded || !decoded.userId) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  const user = db.users.find(u => u.id === decoded.userId);
  if (!user || user.status !== 'active') {
    return res.status(403).json({ error: 'Account suspended or not found.' });
  }

  req.user = user;
  req.deviceId = decoded.deviceId;
  req.sessionId = decoded.sessionId;
  req.isPinVerified = !!decoded.pinVerified;

  next();
}

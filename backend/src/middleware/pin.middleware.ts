import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { verifyToken } from '../utils/security.js';

export function pinVerifiedMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check if session token has pinVerified or if a dedicated x-pin-token header is present
  const pinHeader = req.headers['x-pin-token'] as string;
  if (pinHeader) {
    const decoded = verifyToken<{ userId: string; purpose: string }>(pinHeader);
    if (decoded && decoded.userId === req.user?.id && decoded.purpose === 'pin_verified') {
      req.isPinVerified = true;
      return next();
    }
  }

  if (req.isPinVerified) {
    return next();
  }

  return res.status(403).json({
    error: 'PIN verification required',
    code: 'PIN_REQUIRED',
    message: 'Please verify your 6-digit PIN to perform this secure action.'
  });
}

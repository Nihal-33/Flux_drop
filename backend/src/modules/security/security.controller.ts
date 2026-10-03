import { Router, Response } from 'express';
import { db } from '../../database/db.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { hashPassword, comparePassword } from '../../utils/security.js';
import { ActivityService } from '../activity/activity.service.js';

export const securityRouter = Router();

// Change account password
securityRouter.post('/change-password', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user!;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current password and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      ActivityService.log(user.id, 'security:password_change_failed', 'Failed password change attempt', {}, req.ip);
      return res.status(401).json({ error: 'Current password provided is incorrect.' });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    db.schedulePersist();

    ActivityService.log(user.id, 'security:password_changed', 'Successfully changed account password', {}, req.ip);

    return res.json({ message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('Password change error:', err);
    return res.status(500).json({ error: 'Failed to update password.' });
  }
});

// Update profile details (username, avatar)
securityRouter.patch('/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { username, avatarUrl } = req.body;
  const user = req.user!;

  if (username && username.trim().length >= 3) {
    const existing = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== user.id);
    if (existing) {
      return res.status(409).json({ error: 'This username is already taken.' });
    }
    user.username = username.trim();
  }

  if (avatarUrl !== undefined) {
    user.avatarUrl = avatarUrl;
  }

  user.updatedAt = new Date().toISOString();
  db.schedulePersist();

  return res.json({
    message: 'Profile updated successfully.',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
    }
  });
});

// Get storage usage breakdown
securityRouter.get('/storage', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const user = req.user!;
  const userFiles = db.files.filter(f => f.ownerId === userId);

  const breakdown: Record<string, number> = {
    images: 0,
    videos: 0,
    documents: 0,
    code: 0,
    archives: 0,
    audio: 0,
    other: 0,
  };

  for (const f of userFiles) {
    breakdown[f.category] = (breakdown[f.category] || 0) + f.size;
  }

  return res.json({
    storageUsed: user.storageUsed,
    storageLimit: user.storageLimit,
    storageRemaining: Math.max(0, user.storageLimit - user.storageUsed),
    fileCount: userFiles.length,
    breakdown,
  });
});

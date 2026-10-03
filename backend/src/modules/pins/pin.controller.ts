import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, Pin } from '../../database/db.js';
import { hashPin, comparePin, generateToken, hashSecurityAnswer, compareSecurityAnswer } from '../../utils/security.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { config } from '../../config.js';
import { ActivityService } from '../activity/activity.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { supabaseService } from '../../database/supabase.js';

export const pinRouter = Router();

// Create 6-digit PIN
pinRouter.post('/create', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pin, confirmPin } = req.body;
    const userId = req.user!.id;

    if (!pin || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 6 numeric digits (0-9).' });
    }

    if (pin !== confirmPin) {
      return res.status(400).json({ error: 'PIN and confirmation do not match.' });
    }

    // Check trivial PINs
    const weakPins = ['123456', '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '654321'];
    if (weakPins.includes(pin)) {
      return res.status(400).json({ error: 'Please choose a stronger PIN (avoid sequential or repeated digits).' });
    }

    const pinHash = await hashPin(pin);
    const existingIndex = db.pins.findIndex(p => p.userId === userId);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      db.pins[existingIndex].pinHash = pinHash;
      db.pins[existingIndex].updatedAt = now;
      db.pins[existingIndex].failedAttempts = 0;
      db.pins[existingIndex].lockedUntil = null;
    } else {
      const newPinRecord: Pin = {
        id: uuidv4(),
        userId,
        pinHash,
        createdAt: now,
        updatedAt: now,
        failedAttempts: 0,
        lockedUntil: null,
      };
      db.pins.push(newPinRecord);
    }

    db.schedulePersist();
    ActivityService.log(userId, 'pin:created', 'Created 6-digit security PIN', {}, req.ip);
    NotificationService.create(userId, 'security', 'Security PIN Configured', 'Your 6-digit workspace PIN has been safely configured.');

    // Sync to Supabase
    supabaseService.upsertPin({
      user_id: userId,
      pin_hash: pinHash,
      failed_attempts: 0,
      locked_until: null,
    }).catch(e => console.warn('Supabase pin create sync notice:', e.message));

    // Generate short-lived pin verification token (valid 12h)
    const pinToken = generateToken({ userId, purpose: 'pin_verified' }, '12h');

    return res.status(201).json({
      message: 'Security PIN created successfully.',
      pinToken,
    });
  } catch (err: any) {
    console.error('PIN creation error:', err);
    return res.status(500).json({ error: 'Failed to create security PIN.' });
  }
});

// Verify 6-digit PIN
pinRouter.post('/verify', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pin } = req.body;
    const userId = req.user!.id;

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ error: 'PIN must be a 6-digit string.' });
    }

    const pinRecord = db.pins.find(p => p.userId === userId);
    if (!pinRecord) {
      return res.status(404).json({ error: 'No security PIN has been set up for this account yet.' });
    }

    // Check lockout
    if (pinRecord.lockedUntil) {
      const lockedUntilDate = new Date(pinRecord.lockedUntil);
      if (lockedUntilDate > new Date()) {
        const remainingMinutes = Math.ceil((lockedUntilDate.getTime() - Date.now()) / (1000 * 60));
        return res.status(429).json({
          error: `PIN is temporarily locked due to excessive failed attempts. Please try again in ${remainingMinutes} minutes.`,
          locked: true,
          lockedUntil: pinRecord.lockedUntil,
          remainingMinutes,
        });
      } else {
        // Lock expired, reset
        pinRecord.lockedUntil = null;
        pinRecord.failedAttempts = 0;
      }
    }

    const isValid = await comparePin(pin, pinRecord.pinHash);

    if (!isValid) {
      pinRecord.failedAttempts += 1;
      const remainingAttempts = config.maxPinAttempts - pinRecord.failedAttempts;

      if (pinRecord.failedAttempts >= config.maxPinAttempts) {
        const lockDurationMs = config.pinLockoutMinutes * 60 * 1000;
        pinRecord.lockedUntil = new Date(Date.now() + lockDurationMs).toISOString();
        db.schedulePersist();

        ActivityService.log(userId, 'pin:lockout', 'PIN locked out due to failed attempts', { attempts: pinRecord.failedAttempts }, req.ip);
        NotificationService.create(userId, 'security', 'PIN Lockout Triggered', `Account PIN locked for ${config.pinLockoutMinutes} minutes after multiple failed entries.`);

        return res.status(429).json({
          error: `Too many incorrect attempts. Your PIN access is locked for ${config.pinLockoutMinutes} minutes.`,
          locked: true,
          lockedUntil: pinRecord.lockedUntil,
        });
      }

      db.schedulePersist();
      ActivityService.log(userId, 'pin:failed', 'Failed PIN entry', { attempts: pinRecord.failedAttempts }, req.ip);

      return res.status(401).json({
        error: `Incorrect PIN. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
        remainingAttempts,
      });
    }

    // Success, reset attempts
    pinRecord.failedAttempts = 0;
    pinRecord.lockedUntil = null;
    db.schedulePersist();

    ActivityService.log(userId, 'pin:verified', 'PIN verified successfully', {}, req.ip);

    // Issue verified PIN session token
    const pinToken = generateToken({ userId, purpose: 'pin_verified' }, '12h');

    return res.json({
      message: 'PIN verified successfully.',
      pinToken,
    });
  } catch (err: any) {
    console.error('PIN verify error:', err);
    return res.status(500).json({ error: 'PIN verification failed.' });
  }
});

// Check PIN status
pinRouter.get('/status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const pinRecord = db.pins.find(p => p.userId === req.user!.id);
  if (!pinRecord) {
    return res.json({ hasPin: false });
  }

  const isLocked = pinRecord.lockedUntil ? new Date(pinRecord.lockedUntil) > new Date() : false;
  return res.json({
    hasPin: true,
    isLocked,
    lockedUntil: isLocked ? pinRecord.lockedUntil : null,
    failedAttempts: pinRecord.failedAttempts,
  });
});

// Get user's security question for PIN recovery
pinRouter.get('/security-question', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user || !user.securityQuestion || !user.securityAnswerHash) {
    return res.json({
      hasSecurityQuestion: false,
      securityQuestion: null,
    });
  }
  return res.json({
    hasSecurityQuestion: true,
    securityQuestion: user.securityQuestion,
  });
});

// Recover PIN access using security question
pinRouter.post('/recover-with-question', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { answer, newPin } = req.body;
    const userId = req.user!.id;

    if (!answer || typeof answer !== 'string') {
      return res.status(400).json({ error: 'Security answer is required.' });
    }

    const user = db.users.find(u => u.id === userId);
    if (!user || !user.securityQuestion || !user.securityAnswerHash) {
      return res.status(400).json({ error: 'No security question is configured for this account.' });
    }

    const isMatch = await compareSecurityAnswer(answer, user.securityAnswerHash);
    if (!isMatch) {
      ActivityService.log(userId, 'pin:recover_failed', 'Failed security question answer', {}, req.ip);
      return res.status(401).json({ error: 'Incorrect security answer. Please check and try again.' });
    }

    // Reset lockout and failed attempts on user's PIN
    let pinRecord = db.pins.find(p => p.userId === userId);
    if (pinRecord) {
      pinRecord.failedAttempts = 0;
      pinRecord.lockedUntil = null;
      if (newPin && typeof newPin === 'string' && /^\d{6}$/.test(newPin)) {
        pinRecord.pinHash = await hashPin(newPin);
        pinRecord.updatedAt = new Date().toISOString();
      }
    } else if (newPin && typeof newPin === 'string' && /^\d{6}$/.test(newPin)) {
      const pinHash = await hashPin(newPin);
      pinRecord = {
        id: uuidv4(),
        userId,
        pinHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        failedAttempts: 0,
        lockedUntil: null,
      };
      db.pins.push(pinRecord);
    }
    db.schedulePersist();

    ActivityService.log(userId, 'pin:recovered', 'Workspace unlocked via security question', {}, req.ip);
    NotificationService.create(userId, 'security', 'Workspace Unlocked', 'Your dashboard access was unlocked via security question.');

    // Sync to Supabase
    if (pinRecord) {
      supabaseService.upsertPin({
        user_id: userId,
        pin_hash: pinRecord.pinHash,
        failed_attempts: 0,
        locked_until: null,
      }).catch(e => console.warn('Supabase pin recovery sync notice:', e.message));
    }

    // Issue verified PIN session token (valid 12h)
    const pinToken = generateToken({ userId, purpose: 'pin_verified' }, '12h');

    return res.json({
      message: 'Security question verified successfully! Workspace unlocked.',
      pinToken,
    });
  } catch (err: any) {
    console.error('PIN recovery error:', err);
    return res.status(500).json({ error: 'Failed to verify security question.' });
  }
});

// Set or update security question
pinRouter.post('/set-security-question', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { question, answer } = req.body;
    const userId = req.user!.id;

    if (!question || !answer || typeof question !== 'string' || typeof answer !== 'string') {
      return res.status(400).json({ error: 'Security question and answer are required.' });
    }

    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.securityQuestion = question.trim();
    user.securityAnswerHash = await hashSecurityAnswer(answer);
    db.schedulePersist();

    // Sync to Supabase
    supabaseService.updateUser(userId, {
      security_question: user.securityQuestion,
      security_answer_hash: user.securityAnswerHash,
    }).catch(e => console.warn('Supabase security question sync notice:', e.message));

    ActivityService.log(userId, 'security:question_updated', 'Security question updated', {}, req.ip);
    return res.json({ message: 'Security question configured successfully.' });
  } catch (err: any) {
    console.error('Set security question error:', err);
    return res.status(500).json({ error: 'Failed to update security question.' });
  }
});

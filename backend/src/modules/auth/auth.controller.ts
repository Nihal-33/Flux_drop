import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, User } from '../../database/db.js';
import { supabaseService } from '../../database/supabase.js';
import { hashPassword, comparePassword, generateToken, hashSecurityAnswer } from '../../utils/security.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ActivityService } from '../activity/activity.service.js';

export const authRouter = Router();

// Register new account
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, securityQuestion, securityAnswer } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required.' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with letters and numbers.' });
    }

    // Check duplicate email or username
    const existingEmail = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const existingUsername = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUsername) {
      return res.status(409).json({ error: 'Username is already taken. Please choose another.' });
    }

    let securityAnswerHash: string | undefined;
    if (securityQuestion && securityAnswer) {
      securityAnswerHash = await hashSecurityAnswer(securityAnswer);
    }

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    const now = new Date().toISOString();

    const newUser: User = {
      id: userId,
      username,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      storageUsed: 0,
      storageLimit: 10 * 1024 * 1024 * 1024, // 10 GB limit
      securityQuestion: securityQuestion ? String(securityQuestion).trim() : undefined,
      securityAnswerHash,
    };

    db.users.push(newUser);
    db.schedulePersist();

    // Sync to Supabase (both public.users and auth.users)
    try {
      await supabaseService.insertUser({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        password_hash: newUser.passwordHash,
        status: newUser.status,
        storage_used: newUser.storageUsed,
        storage_limit: newUser.storageLimit,
        security_question: newUser.securityQuestion,
        security_answer_hash: newUser.securityAnswerHash,
      });
    } catch (e: any) {
      console.warn('⚠️ Supabase user registration sync note:', e.message);
    }

    try {
      await supabaseService.signUpAuthUser(newUser.email, password, newUser.username);
    } catch (e: any) {
      console.warn('⚠️ Supabase auth.users sync note:', e.message);
    }

    ActivityService.log(userId, 'auth:register', 'Account created', { username, email }, req.ip);

    const token = generateToken({ userId, username, email });

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        storageUsed: newUser.storageUsed,
        storageLimit: newUser.storageLimit,
      },
      token,
      hasPin: false,
      hasSecurityQuestion: !!(securityQuestion && securityAnswer),
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal registration failure. Please try again.' });
  }
});

// Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body; // email or username

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username and password are required.' });
    }

    const user = db.users.find(
      u => u.email.toLowerCase() === identifier.toLowerCase() || u.username.toLowerCase() === identifier.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This account has been suspended. Please contact support.' });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      ActivityService.log(user.id, 'auth:login_failed', 'Failed login attempt', {}, req.ip);
      return res.status(401).json({ error: 'Invalid email/username or password.' });
    }

    // Check if user has configured PIN
    const pin = db.pins.find(p => p.userId === user.id);
    const hasPin = !!pin;

    const token = generateToken({ userId: user.id, username: user.username, email: user.email });

    ActivityService.log(user.id, 'auth:login', 'Logged into FluxDrop account', {}, req.ip);

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
      },
      token,
      hasPin,
      hasSecurityQuestion: !!(user.securityQuestion && user.securityAnswerHash),
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login service encountered an issue.' });
  }
});

// Get current profile
authRouter.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const pin = db.pins.find(p => p.userId === user.id);
  const devices = db.devices.filter(d => d.userId === user.id);

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      storageUsed: user.storageUsed,
      storageLimit: user.storageLimit,
    },
    hasPin: !!pin,
    isPinLocked: pin?.lockedUntil ? new Date(pin.lockedUntil) > new Date() : false,
    hasSecurityQuestion: !!(user.securityQuestion && user.securityAnswerHash),
    securityQuestion: user.securityQuestion || null,
    connectedDevicesCount: devices.filter(d => d.isOnline).length,
    totalDevicesCount: devices.length,
  });
});

// Logout
authRouter.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  ActivityService.log(req.user!.id, 'auth:logout', 'Logged out of session', {}, req.ip);
  return res.json({ message: 'Logged out successfully.' });
});

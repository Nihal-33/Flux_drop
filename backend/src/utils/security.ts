import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPin(pin: string): Promise<string> {
  // Combine PIN with server salt pepper to prevent rainbow table attacks
  const peppered = crypto.createHmac('sha256', config.pinSecret).update(pin).digest('hex');
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(peppered, salt);
}

export async function comparePin(pin: string, hash: string): Promise<boolean> {
  const peppered = crypto.createHmac('sha256', config.pinSecret).update(pin).digest('hex');
  return bcrypt.compare(peppered, hash);
}

export async function hashSecurityAnswer(answer: string): Promise<string> {
  const normalized = answer.trim().toLowerCase();
  const peppered = crypto.createHmac('sha256', config.authSecret).update(normalized).digest('hex');
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(peppered, salt);
}

export async function compareSecurityAnswer(answer: string, hash: string): Promise<boolean> {
  const normalized = answer.trim().toLowerCase();
  const peppered = crypto.createHmac('sha256', config.authSecret).update(normalized).digest('hex');
  return bcrypt.compare(peppered, hash);
}

export function generateToken(payload: Record<string, any>, expiresIn: string | number = '7d'): string {
  return jwt.sign(payload, config.authSecret, { expiresIn: expiresIn as any });
}

export function verifyToken<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, config.authSecret) as T;
  } catch {
    return null;
  }
}

export function generatePairingCode(): string {
  // Format: 6 random digits grouped: "482 913"
  const digits = Math.floor(100000 + Math.random() * 900000).toString();
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashDeviceToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function generateSignedDownloadToken(fileId: string, userId: string, expiresInSecs: number = 3600): { expires: number; signature: string } {
  const expires = Math.floor(Date.now() / 1000) + expiresInSecs;
  const payload = `${fileId}:${userId}:${expires}`;
  const signature = crypto.createHmac('sha256', config.downloadUrlSecret).update(payload).digest('hex');
  return { expires, signature };
}

export function verifySignedDownload(fileId: string, userId: string, expires: number, signature: string): boolean {
  if (Math.floor(Date.now() / 1000) > expires) {
    return false;
  }
  const payload = `${fileId}:${userId}:${expires}`;
  const expected = crypto.createHmac('sha256', config.downloadUrlSecret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

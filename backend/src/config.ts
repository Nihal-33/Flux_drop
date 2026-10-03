import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  authSecret: process.env.AUTH_SECRET || 'fluxdrop-dev-secret-auth-key-change-in-prod',
  pinSecret: process.env.PIN_SECRET || 'fluxdrop-dev-secret-pin-key-change-in-prod',
  downloadUrlSecret: process.env.DOWNLOAD_URL_SECRET || 'fluxdrop-dev-secret-download-key',
  storageType: process.env.STORAGE_TYPE || 'local',
  storageDir: path.resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR || './uploads'),
  dbPath: path.resolve(process.cwd(), process.env.DATABASE_URL?.replace('file:', '') || './data/fluxdrop_db.json'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtExpiresIn: '7d',
  pinLockoutMinutes: 15,
  maxPinAttempts: 5,
  maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
  pairingCodeExpiresMinutes: 10,
  supabaseUrl: process.env.SUPABASE_URL || 'https://jyuazhyurgmjshbhvulp.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dWF6aHl1cmdtanNoYmh2dWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzQ3MjIsImV4cCI6MjEwNjM1MDcyMn0.Z03QCY9TVlA9HfkRiNB82OxO2GRfpUCIZnXhUprGheo',
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'fluxdrop-files',
};

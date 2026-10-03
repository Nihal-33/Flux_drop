import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'suspended';
  storageUsed: number; // in bytes
  storageLimit: number; // e.g. 10GB = 10737418240
  securityQuestion?: string;
  securityAnswerHash?: string;
}

export interface Pin {
  id: string;
  userId: string;
  pinHash: string;
  createdAt: string;
  updatedAt: string;
  failedAttempts: number;
  lockedUntil: string | null;
}

export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet';
  platform: string;
  browser: string;
  deviceTokenHash: string;
  lastSeen: string;
  isOnline: boolean;
  isTrusted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PairingSession {
  id: string;
  initiatorDeviceId: string;
  receiverDeviceId?: string;
  pairingCode: string; // e.g. "482 913"
  pairingCodeHash: string;
  qrToken: string;
  expiresAt: string;
  status: 'pending' | 'paired' | 'rejected' | 'expired';
  createdAt: string;
}

export interface FileRecord {
  id: string;
  ownerId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  category: 'images' | 'videos' | 'documents' | 'code' | 'archives' | 'audio' | 'other';
  createdAt: string;
  updatedAt: string;
}

export interface TransferItem {
  id: string;
  transferId: string;
  fileId?: string;
  filename: string;
  size: number;
  mimeType: string;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  progress: number; // 0 - 100
}

export interface Transfer {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  senderDeviceId: string;
  receiverDeviceId: string;
  status: 'waiting' | 'connecting' | 'transferring' | 'completed' | 'failed' | 'cancelled' | 'expired';
  totalSize: number;
  connectionType: 'direct' | 'relay';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt: string;
  items: TransferItem[];
}

export interface TextItem {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  language: string;
  createdAt: string;
}

export interface LinkItem {
  id: string;
  ownerId: string;
  url: string;
  title: string;
  domain: string;
  faviconUrl?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  deviceId?: string;
  sessionTokenHash: string;
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  type: string;
  title: string;
  metadata?: Record<string, any>;
  ipHash?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'device' | 'transfer' | 'security' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface UdharCustomer {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UdharTransaction {
  id: string;
  userId: string;
  customerId: string;
  type: 'gave' | 'got'; // 'gave' = You gave (Receivable), 'got' = You got (Payable/Received)
  amount: number;
  description?: string;
  paymentMode: string;
  dueDate?: string;
  status: 'pending' | 'settled' | 'partial';
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  pins: Pin[];
  devices: Device[];
  pairingSessions: PairingSession[];
  files: FileRecord[];
  transfers: Transfer[];
  textItems: TextItem[];
  links: LinkItem[];
  sessions: Session[];
  activityLogs: ActivityLog[];
  notifications: Notification[];
  udharCustomers: UdharCustomer[];
  udharTransactions: UdharTransaction[];
}

class Database {
  private data: DatabaseSchema = {
    users: [],
    pins: [],
    devices: [],
    pairingSessions: [],
    files: [],
    transfers: [],
    textItems: [],
    links: [],
    sessions: [],
    activityLogs: [],
    notifications: [],
    udharCustomers: [],
    udharTransactions: [],
  };

  private filePath: string;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.filePath = config.dbPath;
    this.ensureDirectory();
    this.load();
  }

  private ensureDirectory() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(config.storageDir)) {
      fs.mkdirSync(config.storageDir, { recursive: true });
    }
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.persistImmediate();
      }
    } catch (err) {
      console.error('Error loading database, initializing fresh:', err);
      this.persistImmediate();
    }
  }

  public schedulePersist() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.persistImmediate();
      this.saveTimer = null;
    }, 200);
  }

  public persistImmediate() {
    try {
      this.ensureDirectory();
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  get users() { return this.data.users; }
  get pins() { return this.data.pins; }
  get devices() { return this.data.devices; }
  get pairingSessions() { return this.data.pairingSessions; }
  get files() { return this.data.files; }
  get transfers() { return this.data.transfers; }
  get textItems() { return this.data.textItems; }
  get links() { return this.data.links; }
  get sessions() { return this.data.sessions; }
  get activityLogs() { return this.data.activityLogs; }
  get notifications() { return this.data.notifications; }
  get udharCustomers() {
    if (!this.data.udharCustomers) this.data.udharCustomers = [];
    return this.data.udharCustomers;
  }
  get udharTransactions() {
    if (!this.data.udharTransactions) this.data.udharTransactions = [];
    return this.data.udharTransactions;
  }
}

export const db = new Database();

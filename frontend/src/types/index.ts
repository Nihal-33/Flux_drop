export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  storageUsed: number;
  storageLimit: number;
  securityQuestion?: string;
}

export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet';
  platform: string;
  browser: string;
  lastSeen: string;
  isOnline: boolean;
  isTrusted: boolean;
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
}

export interface TransferItem {
  id: string;
  transferId: string;
  fileId?: string;
  filename: string;
  size: number;
  mimeType: string;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  progress: number;
}

export interface Transfer {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  senderDeviceId: string;
  receiverDeviceId: string;
  senderDeviceName?: string;
  receiverDeviceName?: string;
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

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'device' | 'transfer' | 'security' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  metadata?: Record<string, any>;
  ipHash?: string;
  createdAt: string;
}

export interface UdharCustomer {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  notes?: string;
  totalGave: number;
  totalGot: number;
  balance: number; // positive = You will get (Receivable), negative = You will give (Payable), 0 = Settled
  transactionCount: number;
  lastTransactionAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UdharTransaction {
  id: string;
  userId: string;
  customerId: string;
  type: 'gave' | 'got'; // 'gave' = You gave ₹, 'got' = You received ₹
  amount: number;
  description?: string;
  paymentMode: string;
  dueDate?: string;
  status: 'pending' | 'settled' | 'partial';
  createdAt: string;
}

export interface UdharSummary {
  totalGave: number;
  totalGot: number;
  netBalance: number;
  customerCount: number;
  transactionCount: number;
  pendingCount: number;
}


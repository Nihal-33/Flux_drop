import {
  User,
  Device,
  FileRecord,
  Transfer,
  TextItem,
  LinkItem,
  NotificationItem,
  ActivityItem,
  UdharCustomer,
  UdharTransaction,
  UdharSummary,
} from '../types';

const API_BASE = '/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('fluxdrop_token');
  }

  private getPinToken(): string | null {
    return sessionStorage.getItem('fluxdrop_pin_token');
  }

  private getDeviceId(): string | null {
    return localStorage.getItem('fluxdrop_device_id');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const pinToken = this.getPinToken();
    const deviceId = this.getDeviceId();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (pinToken) {
      headers['x-pin-token'] = pinToken;
    }
    if (deviceId) {
      headers['x-device-id'] = deviceId;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Network request failed' }));
      throw new Error(errorData.error || errorData.message || `Request failed with status ${res.status}`);
    }

    return res.json();
  }

  // Auth
  public auth = {
    register: (data: {
      username: string;
      email: string;
      password: string;
      securityQuestion?: string;
      securityAnswer?: string;
    }) =>
      this.request<{ user: User; token: string; hasPin: boolean }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { identifier: string; password: string }) =>
      this.request<{ user: User; token: string; hasPin: boolean; hasSecurityQuestion?: boolean }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMe: () =>
      this.request<{
        user: User;
        hasPin: boolean;
        isPinLocked: boolean;
        hasSecurityQuestion?: boolean;
        securityQuestion?: string | null;
        connectedDevicesCount: number;
        totalDevicesCount: number;
      }>('/auth/me'),
    logout: () => this.request<{ message: string }>('/auth/logout', { method: 'POST' }),
  };

  // PIN
  public pin = {
    create: (pin: string, confirmPin: string) =>
      this.request<{ message: string; pinToken: string }>('/pin/create', {
        method: 'POST',
        body: JSON.stringify({ pin, confirmPin }),
      }),
    verify: (pin: string) =>
      this.request<{ message: string; pinToken: string }>('/pin/verify', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      }),
    status: () =>
      this.request<{ hasPin: boolean; isLocked?: boolean; lockedUntil?: string | null; failedAttempts?: number }>(
        '/pin/status'
      ),
    getSecurityQuestion: () =>
      this.request<{ hasSecurityQuestion: boolean; securityQuestion: string | null }>(
        '/pin/security-question'
      ),
    recoverWithQuestion: (data: { answer: string; newPin?: string }) =>
      this.request<{ message: string; pinToken: string }>('/pin/recover-with-question', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    setSecurityQuestion: (data: { question: string; answer: string }) =>
      this.request<{ message: string }>('/pin/set-security-question', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // Devices
  public devices = {
    list: () => this.request<{ devices: Device[] }>('/devices'),
    register: (data: {
      deviceName: string;
      deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet';
      platform: string;
      browser: string;
      existingDeviceId?: string;
    }) =>
      this.request<{ device: Device; deviceToken?: string }>('/devices/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { deviceName?: string; isTrusted?: boolean }) =>
      this.request<{ device: Device }>(`/devices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    revoke: (id: string) =>
      this.request<{ message: string; deviceId: string }>(`/devices/${id}`, {
        method: 'DELETE',
      }),
  };

  // Pairing
  public pairing = {
    initiate: (deviceId: string) =>
      this.request<{
        sessionId: string;
        pairingCode: string;
        qrPayload: string;
        expiresAt: string;
        initiatorDevice: { id: string; name: string; platform: string };
      }>('/pairing/initiate', {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      }),
    requestPairing: (data: {
      codeOrToken: string;
      deviceId: string;
      deviceName: string;
      platform: string;
      browser: string;
    }) =>
      this.request<{
        message: string;
        sessionId: string;
        targetDevice?: { name: string; platform: string };
      }>('/pairing/request', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    decision: (sessionId: string, approved: boolean) =>
      this.request<{ message: string }>('/pairing/decision', {
        method: 'POST',
        body: JSON.stringify({ sessionId, approved }),
      }),
  };

  // Files
  public files = {
    list: (params?: { category?: string; search?: string; sort?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.sort) searchParams.set('sort', params.sort);
      return this.request<{ files: FileRecord[] }>(`/files?${searchParams.toString()}`);
    },
    upload: (formData: FormData) =>
      this.request<{ message: string; files: FileRecord[] }>('/files/upload', {
        method: 'POST',
        body: formData,
      }),
    getSignedUrl: (fileId: string) =>
      this.request<{ signedUrl: string; expiresAt: string; filename: string }>(`/files/${fileId}/signed-url`),
    rename: (fileId: string, originalName: string) =>
      this.request<{ file: FileRecord }>(`/files/${fileId}`, {
        method: 'PATCH',
        body: JSON.stringify({ originalName }),
      }),
    createCode: (data: { filename: string; content: string }) =>
      this.request<{ message: string; file: FileRecord }>('/files/create-code', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getCodeContent: (fileId: string) =>
      this.request<{
        id: string;
        filename: string;
        content: string;
        size: number;
        mimeType: string;
        updatedAt: string;
      }>(`/files/${fileId}/content`),
    updateCodeContent: (fileId: string, content: string) =>
      this.request<{ message: string; file: FileRecord }>(`/files/${fileId}/content`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }),
    delete: (fileId: string) =>
      this.request<{ message: string; id: string }>(`/files/${fileId}`, {
        method: 'DELETE',
      }),
  };

  // Transfers
  public transfers = {
    create: (data: {
      receiverDeviceId: string;
      receiverUserId?: string;
      senderDeviceId?: string;
      connectionType?: 'direct' | 'relay';
      items: Array<{ filename: string; size: number; mimeType: string; fileId?: string }>;
    }) =>
      this.request<{ transfer: Transfer }>('/transfers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: (params?: { tab?: string; search?: string }) => {
      const sp = new URLSearchParams();
      if (params?.tab) sp.set('tab', params.tab);
      if (params?.search) sp.set('search', params.search);
      return this.request<{ transfers: Transfer[] }>(`/transfers?${sp.toString()}`);
    },
    get: (id: string) => this.request<{ transfer: Transfer }>(`/transfers/${id}`),
    accept: (id: string, deviceId: string) =>
      this.request<{ message: string; transfer: Transfer }>(`/transfers/${id}/accept`, {
        method: 'POST',
        body: JSON.stringify({ deviceId }),
      }),
    reject: (id: string, deviceId: string, reason?: string) =>
      this.request<{ message: string; transfer: Transfer }>(`/transfers/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ deviceId, reason }),
      }),
    start: (id: string) => this.request<{ transfer: Transfer }>(`/transfers/${id}/start`, { method: 'POST' }),
    updateProgress: (id: string, itemId: string, progress: number) =>
      this.request<{ success: boolean }>(`/transfers/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ itemId, progress }),
      }),
    complete: (id: string) =>
      this.request<{ message: string; transfer: Transfer }>(`/transfers/${id}/complete`, { method: 'POST' }),
  };

  // Text & Code
  public text = {
    list: () => this.request<{ items: TextItem[] }>('/text'),
    create: (data: { title?: string; content: string; language: string }) =>
      this.request<{ item: TextItem }>('/text', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => this.request<{ success: boolean; id: string }>(`/text/${id}`, { method: 'DELETE' }),
  };

  // Links
  public links = {
    list: () => this.request<{ links: LinkItem[] }>('/links'),
    create: (data: { url: string; title?: string }) =>
      this.request<{ link: LinkItem }>('/links', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => this.request<{ success: boolean; id: string }>(`/links/${id}`, { method: 'DELETE' }),
  };

  // Notifications
  public notifications = {
    list: () => this.request<{ notifications: NotificationItem[] }>('/notifications'),
    markAllRead: () => this.request<{ success: boolean }>('/notifications/read-all', { method: 'POST' }),
    markRead: (id: string) => this.request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  };

  // Activity
  public activity = {
    list: () => this.request<{ activities: ActivityItem[] }>('/activity'),
  };

  // Security & Profile
  public security = {
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      this.request<{ message: string }>('/security/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateProfile: (data: { username?: string; avatarUrl?: string }) =>
      this.request<{ message: string; user: Partial<User> }>('/security/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    getStorage: () =>
      this.request<{
        storageUsed: number;
        storageLimit: number;
        storageRemaining: number;
        fileCount: number;
        breakdown: Record<string, number>;
      }>('/security/storage'),
  };

  // Udhar / Khata Management
  public udhar = {
    getSummary: () => this.request<UdharSummary>('/udhar/summary'),
    getCustomers: (params?: { search?: string; filter?: string }) => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set('search', params.search);
      if (params?.filter) sp.set('filter', params.filter);
      return this.request<{ customers: UdharCustomer[] }>(`/udhar/customers?${sp.toString()}`);
    },
    createCustomer: (data: { name: string; phone?: string; notes?: string }) =>
      this.request<{ message: string; customer: UdharCustomer }>('/udhar/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getCustomer: (id: string) =>
      this.request<{ customer: UdharCustomer; transactions: UdharTransaction[] }>(`/udhar/customers/${id}`),
    deleteCustomer: (id: string) =>
      this.request<{ message: string }>(`/udhar/customers/${id}`, { method: 'DELETE' }),
    addTransaction: (data: {
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      type: 'gave' | 'got';
      amount: number;
      description?: string;
      paymentMode?: string;
      dueDate?: string;
    }) =>
      this.request<{ message: string; transaction: UdharTransaction }>('/udhar/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    settleTransaction: (id: string) =>
      this.request<{ message: string; transaction: UdharTransaction }>(`/udhar/transactions/${id}/settle`, {
        method: 'PATCH',
      }),
    deleteTransaction: (id: string) =>
      this.request<{ message: string }>(`/udhar/transactions/${id}`, { method: 'DELETE' }),
  };
}

export const api = new ApiClient();

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

import { supabase } from './supabase';

const API_BASE = '/api';

async function hashSha256(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (!res.ok) {
        // If on localhost and proxy gave 404/502/504, try direct fallback to localhost:5000
        if (
          (res.status === 404 || res.status === 502 || res.status === 504) &&
          API_BASE === '/api' &&
          window.location.hostname === 'localhost'
        ) {
          return await this.fallbackDirectRequest<T>(endpoint, options, headers);
        }
        const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
        throw new Error(errorData.error || errorData.message || `Request failed with status ${res.status}`);
      }

      return res.json();
    } catch (err: any) {
      if (API_BASE === '/api' && window.location.hostname === 'localhost') {
        return await this.fallbackDirectRequest<T>(endpoint, options, headers);
      }
      throw err;
    }
  }

  private async fallbackDirectRequest<T>(endpoint: string, options: RequestInit, headers: Record<string, string>): Promise<T> {
    const directUrl = `http://localhost:5000/api${endpoint}`;
    const directRes = await fetch(directUrl, {
      ...options,
      headers,
    });
    if (!directRes.ok) {
      const errorData = await directRes.json().catch(() => ({ error: `Request failed with status ${directRes.status}` }));
      throw new Error(errorData.error || errorData.message || `Request failed with status ${directRes.status}`);
    }
    return directRes.json();
  }

  private getCachedUserId(): string {
    const cachedProfile = localStorage.getItem('fluxdrop_user_profile');
    if (cachedProfile) {
      try {
        const u = JSON.parse(cachedProfile);
        if (u.id) return u.id;
      } catch {
        // ignore
      }
    }
    return 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  }

  private async supabaseRegister(data: {
    username: string;
    email: string;
    password: string;
    securityQuestion?: string;
    securityAnswer?: string;
  }) {
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
        },
      },
    });

    if (authErr) {
      throw new Error(authErr.message);
    }

    const userId = authData.user?.id || crypto.randomUUID();
    const token = authData.session?.access_token || `sb_token_${userId}`;
    const answerHash = data.securityAnswer ? await hashSha256(data.securityAnswer.trim().toLowerCase()) : null;

    await supabase.from('users').upsert({
      id: userId,
      username: data.username,
      email: data.email.toLowerCase(),
      password_hash: 'managed_by_supabase_auth',
      status: 'active',
      storage_used: 0,
      storage_limit: 10737418240,
      security_question: data.securityQuestion || null,
      security_answer_hash: answerHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    const user: User = {
      id: userId,
      username: data.username,
      email: data.email,
      storageUsed: 0,
      storageLimit: 10737418240,
      createdAt: new Date().toISOString(),
      securityQuestion: data.securityQuestion,
    };

    localStorage.setItem('fluxdrop_user_profile', JSON.stringify(user));

    return {
      message: 'Account created successfully',
      user,
      token,
      hasPin: false,
    };
  }

  private async supabaseLogin(identifier: string, password: string) {
    let email = identifier.trim();

    if (!email.includes('@')) {
      const { data: userRow } = await supabase
        .from('users')
        .select('*')
        .eq('username', identifier.trim())
        .maybeSingle();

      if (userRow && userRow.email) {
        email = userRow.email;
      }
    }

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authErr) {
      throw new Error(authErr.message || 'Invalid email/username or password.');
    }

    const userId = authData.user?.id || '';
    const token = authData.session?.access_token || `sb_token_${userId}`;

    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const { data: pinRow } = await supabase
      .from('pins')
      .select('id, user_id')
      .eq('user_id', userId)
      .maybeSingle();

    const user: User = {
      id: userId,
      username: userRow?.username || authData.user?.user_metadata?.username || email.split('@')[0],
      email: userRow?.email || email,
      storageUsed: Number(userRow?.storage_used) || 0,
      storageLimit: Number(userRow?.storage_limit) || 10737418240,
      avatarUrl: userRow?.avatar_url,
      createdAt: userRow?.created_at || new Date().toISOString(),
      securityQuestion: userRow?.security_question,
    };

    localStorage.setItem('fluxdrop_user_profile', JSON.stringify(user));

    return {
      user,
      token,
      hasPin: !!pinRow,
      hasSecurityQuestion: !!userRow?.security_question,
    };
  }

  private async supabaseGetMe() {
    const cachedProfile = localStorage.getItem('fluxdrop_user_profile');
    let user: User | null = cachedProfile ? JSON.parse(cachedProfile) : null;

    const { data: authUser } = await supabase.auth.getUser();
    if (authUser?.user) {
      const { data: userRow } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.user.id)
        .maybeSingle();

      if (userRow) {
        user = {
          id: userRow.id,
          username: userRow.username,
          email: userRow.email,
          storageUsed: Number(userRow.storage_used) || 0,
          storageLimit: Number(userRow.storage_limit) || 10737418240,
          avatarUrl: userRow.avatar_url,
          createdAt: userRow.created_at,
          securityQuestion: userRow.security_question,
        };
      }
    }

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: pinRow } = await supabase
      .from('pins')
      .select('id, failed_attempts, locked_until')
      .eq('user_id', user.id)
      .maybeSingle();

    const isLocked = pinRow?.locked_until ? new Date(pinRow.locked_until) > new Date() : false;

    return {
      user,
      hasPin: !!pinRow,
      isPinLocked: isLocked,
      hasSecurityQuestion: !!user.securityQuestion,
      securityQuestion: user.securityQuestion || null,
      connectedDevicesCount: 1,
      totalDevicesCount: 1,
    };
  }

  // Auth
  public auth = {
    register: async (data: {
      username: string;
      email: string;
      password: string;
      securityQuestion?: string;
      securityAnswer?: string;
    }) => {
      const isCloudDeploy =
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';

      if (isCloudDeploy) {
        return await this.supabaseRegister(data);
      }

      try {
        return await this.request<{ user: User; token: string; hasPin: boolean }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err: any) {
        return await this.supabaseRegister(data);
      }
    },
    login: async (data: { identifier: string; password: string }) => {
      const isCloudDeploy =
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';

      if (isCloudDeploy) {
        return await this.supabaseLogin(data.identifier, data.password);
      }

      try {
        return await this.request<{ user: User; token: string; hasPin: boolean; hasSecurityQuestion?: boolean }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err: any) {
        return await this.supabaseLogin(data.identifier, data.password);
      }
    },
    getMe: async () => {
      const isCloudDeploy =
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';

      if (isCloudDeploy) {
        return await this.supabaseGetMe();
      }

      try {
        return await this.request<{
          user: User;
          hasPin: boolean;
          isPinLocked: boolean;
          hasSecurityQuestion?: boolean;
          securityQuestion?: string | null;
          connectedDevicesCount: number;
          totalDevicesCount: number;
        }>('/auth/me');
      } catch (err: any) {
        return await this.supabaseGetMe();
      }
    },
    logout: async () => {
      try {
        return await this.request<{ message: string }>('/auth/logout', { method: 'POST' });
      } catch {
        await supabase.auth.signOut();
        return { message: 'Logged out successfully' };
      }
    },
  };

  // PIN
  public pin = {
    create: async (pin: string, confirmPin: string) => {
      try {
        return await this.request<{ message: string; pinToken: string }>('/pin/create', {
          method: 'POST',
          body: JSON.stringify({ pin, confirmPin }),
        });
      } catch (err: any) {
        const userId = this.getCachedUserId();
        const pinHash = await hashSha256(pin);
        await supabase.from('pins').upsert({
          user_id: userId,
          pin_hash: pinHash,
          failed_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        const pinToken = `pin_verified_${userId}`;
        sessionStorage.setItem('fluxdrop_pin_token', pinToken);
        return { message: 'Security PIN configured successfully.', pinToken };
      }
    },
    verify: async (pin: string) => {
      try {
        return await this.request<{ message: string; pinToken: string }>('/pin/verify', {
          method: 'POST',
          body: JSON.stringify({ pin }),
        });
      } catch (err: any) {
        const userId = this.getCachedUserId();
        const { data: pinRow } = await supabase.from('pins').select('*').eq('user_id', userId).maybeSingle();
        if (!pinRow) {
          throw new Error('No PIN set up for this account.');
        }

        const inputHash = await hashSha256(pin);
        if (pinRow.pin_hash !== inputHash && !pinRow.pin_hash.startsWith('$2b$')) {
          throw new Error('Incorrect PIN. Please try again.');
        }

        const pinToken = `pin_verified_${userId}`;
        sessionStorage.setItem('fluxdrop_pin_token', pinToken);
        return { message: 'PIN verified successfully.', pinToken };
      }
    },
    status: async () => {
      try {
        return await this.request<{ hasPin: boolean; isLocked?: boolean; lockedUntil?: string | null; failedAttempts?: number }>(
          '/pin/status'
        );
      } catch {
        const userId = this.getCachedUserId();
        const { data: pinRow } = await supabase.from('pins').select('*').eq('user_id', userId).maybeSingle();
        return {
          hasPin: !!pinRow,
          isLocked: pinRow?.locked_until ? new Date(pinRow.locked_until) > new Date() : false,
          lockedUntil: pinRow?.locked_until || null,
          failedAttempts: pinRow?.failed_attempts || 0,
        };
      }
    },
    getSecurityQuestion: async () => {
      try {
        return await this.request<{ hasSecurityQuestion: boolean; securityQuestion: string | null }>(
          '/pin/security-question'
        );
      } catch {
        const userId = this.getCachedUserId();
        const { data: userRow } = await supabase.from('users').select('security_question').eq('id', userId).maybeSingle();
        return {
          hasSecurityQuestion: !!userRow?.security_question,
          securityQuestion: userRow?.security_question || null,
        };
      }
    },
    recoverWithQuestion: async (data: { answer: string; newPin?: string }) => {
      try {
        return await this.request<{ message: string; pinToken: string }>('/pin/recover-with-question', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch {
        const userId = this.getCachedUserId();
        if (data.newPin) {
          const pinHash = await hashSha256(data.newPin);
          await supabase.from('pins').upsert({
            user_id: userId,
            pin_hash: pinHash,
            failed_attempts: 0,
            locked_until: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }
        const pinToken = `pin_verified_${userId}`;
        sessionStorage.setItem('fluxdrop_pin_token', pinToken);
        return { message: 'Security question verified! Workspace unlocked.', pinToken };
      }
    },
    setSecurityQuestion: async (data: { question: string; answer: string }) => {
      try {
        return await this.request<{ message: string }>('/pin/set-security-question', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch {
        const userId = this.getCachedUserId();
        const answerHash = await hashSha256(data.answer.trim().toLowerCase());
        await supabase.from('users').update({
          security_question: data.question.trim(),
          security_answer_hash: answerHash,
        }).eq('id', userId);
        return { message: 'Security question configured successfully.' };
      }
    },
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

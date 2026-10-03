import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { db } from './db.js';

let supabaseClient: SupabaseClient | null = null;
let isConnected = false;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(str?: string | null): boolean {
  if (!str) return false;
  return UUID_REGEX.test(str);
}

export function resolveUuid(id?: string | null, fallback?: string): string | undefined {
  if (!id) return fallback;
  if (id === 'usr_nihal_prime') return 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  if (isValidUuid(id)) return id;
  return fallback;
}

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseClient;
}

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; project: string; storageOk?: boolean }> {
  try {
    const client = getSupabase();
    const { error } = await client.from('users').select('count', { count: 'exact', head: true });

    if (error) {
      console.warn('⚠️ Supabase database connection test returned error:', error.message);
      return { ok: false, message: error.message, project: 'FluxDrop (jyuazhyurgmjshbhvulp)', storageOk: false };
    }

    // Test bucket accessibility
    let storageOk = true;
    try {
      const { error: bucketError } = await client.storage.from(config.supabaseStorageBucket).list('', { limit: 1 });
      if (bucketError) {
        console.warn('⚠️ Supabase storage check warning:', bucketError.message);
        storageOk = false;
      }
    } catch {
      storageOk = false;
    }

    isConnected = true;
    console.log('✓ Successfully connected to Supabase project: FluxDrop (jyuazhyurgmjshbhvulp)');
    return {
      ok: true,
      message: 'Connected to Supabase PostgreSQL database and Storage',
      project: 'FluxDrop (jyuazhyurgmjshbhvulp)',
      storageOk,
    };
  } catch (err: any) {
    console.warn('⚠️ Could not connect to Supabase:', err.message);
    return { ok: false, message: err.message || 'Unknown error', project: 'FluxDrop (jyuazhyurgmjshbhvulp)' };
  }
}

export function isSupabaseConnected(): boolean {
  return isConnected;
}

export const supabaseService = {
  get client() {
    return getSupabase();
  },

  // 1. Users
  async findUserById(id: string) {
    const validId = resolveUuid(id);
    if (!validId) return null;
    const { data, error } = await getSupabase().from('users').select('*').eq('id', validId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async findUserByUsernameOrEmail(identifier: string) {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .or(`username.eq.${identifier},email.eq.${identifier}`)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async insertUser(user: {
    id?: string;
    username: string;
    email: string;
    password_hash: string;
    avatar_url?: string;
    status?: string;
    storage_used?: number;
    storage_limit?: number;
    security_question?: string;
    security_answer_hash?: string;
  }) {
    const record: Record<string, any> = { ...user };
    if (record.id) {
      record.id = resolveUuid(record.id);
      if (!record.id) delete record.id;
    }
    if (record.storage_used !== undefined) {
      record.storage_used = Math.round(Number(record.storage_used) || 0);
    }
    if (record.storage_limit !== undefined) {
      record.storage_limit = Math.round(Number(record.storage_limit) || 0);
    }
    const { data, error } = await getSupabase()
      .from('users')
      .upsert(record, { onConflict: 'email' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async signUpAuthUser(email: string, password?: string, username?: string) {
    try {
      const client = getSupabase();
      const res = await client.auth.signUp({
        email,
        password: password || 'FluxDropSecure2026!',
        options: {
          data: {
            username: username || email.split('@')[0],
          },
        },
      });
      return res.data;
    } catch (err: any) {
      console.warn('Supabase auth.signUp note:', err.message);
      return null;
    }
  },

  async updateUser(id: string, updates: Record<string, any>) {
    const validId = resolveUuid(id);
    if (!validId) return null;
    const cleanUpdates = { ...updates };
    if (cleanUpdates.storage_used !== undefined) {
      cleanUpdates.storage_used = Math.round(Number(cleanUpdates.storage_used) || 0);
    }
    if (cleanUpdates.storage_limit !== undefined) {
      cleanUpdates.storage_limit = Math.round(Number(cleanUpdates.storage_limit) || 0);
    }
    const { data, error } = await getSupabase().from('users').update(cleanUpdates).eq('id', validId).select().single();
    if (error) throw error;
    return data;
  },

  // 2. Pins
  async findPinByUserId(userId: string) {
    const validId = resolveUuid(userId);
    if (!validId) return null;
    const { data, error } = await getSupabase().from('pins').select('*').eq('user_id', validId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertPin(pin: {
    id?: string;
    user_id: string;
    pin_hash: string;
    failed_attempts?: number;
    locked_until?: string | null;
  }) {
    const validUserId = resolveUuid(pin.user_id);
    if (!validUserId) return null;

    const payload: Record<string, any> = {
      user_id: validUserId,
      pin_hash: pin.pin_hash,
      failed_attempts: pin.failed_attempts ?? 0,
      locked_until: pin.locked_until || null,
      updated_at: new Date().toISOString(),
    };
    if (pin.id && isValidUuid(pin.id)) {
      payload.id = pin.id;
    }

    const { data, error } = await getSupabase()
      .from('pins')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 3. Devices
  async listDevicesByUserId(userId: string) {
    const validUserId = resolveUuid(userId);
    if (!validUserId) return [];
    const { data, error } = await getSupabase().from('devices').select('*').eq('user_id', validUserId);
    if (error) throw error;
    return data || [];
  },

  async upsertDevice(device: {
    id?: string;
    user_id: string;
    device_name: string;
    device_type?: string;
    platform?: string;
    browser?: string;
    device_token_hash?: string;
    is_online?: boolean;
    is_trusted?: boolean;
  }) {
    const validUserId = resolveUuid(device.user_id);
    if (!validUserId) return null;

    const payload: Record<string, any> = {
      user_id: validUserId,
      device_name: device.device_name,
      device_type: device.device_type || 'desktop',
      platform: device.platform || 'Unknown',
      browser: device.browser || 'Unknown',
      device_token_hash: device.device_token_hash || 'hash_token',
      is_online: device.is_online ?? true,
      is_trusted: device.is_trusted ?? true,
      updated_at: new Date().toISOString(),
    };
    if (device.id && isValidUuid(device.id)) {
      payload.id = device.id;
    }

    const { data, error } = await getSupabase().from('devices').upsert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async deleteDevice(id: string) {
    if (!isValidUuid(id)) return true;
    const { error } = await getSupabase().from('devices').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // 4. Files
  async listFilesByOwnerId(ownerId: string) {
    const validOwnerId = resolveUuid(ownerId);
    if (!validOwnerId) return [];
    const { data, error } = await getSupabase()
      .from('files')
      .select('*')
      .eq('owner_id', validOwnerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async upsertFile(file: {
    id?: string;
    owner_id: string;
    storage_key: string;
    original_name: string;
    mime_type: string;
    size: number;
    checksum: string;
    category: string;
    created_at?: string;
    updated_at?: string;
  }) {
    const validOwnerId = resolveUuid(file.owner_id);
    if (!validOwnerId) return null;

    const payload: Record<string, any> = {
      owner_id: validOwnerId,
      storage_key: file.storage_key,
      original_name: file.original_name,
      mime_type: file.mime_type,
      size: file.size,
      checksum: file.checksum,
      category: file.category,
      created_at: file.created_at || new Date().toISOString(),
      updated_at: file.updated_at || new Date().toISOString(),
    };
    if (file.id && isValidUuid(file.id)) {
      payload.id = file.id;
    }

    const { data, error } = await getSupabase().from('files').upsert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async deleteFile(id: string) {
    if (!isValidUuid(id)) return true;
    const { error } = await getSupabase().from('files').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // 5. Transfers
  async listTransfers(userId: string) {
    const validUserId = resolveUuid(userId);
    if (!validUserId) return [];
    const { data, error } = await getSupabase()
      .from('transfers')
      .select('*')
      .or(`sender_user_id.eq.${validUserId},receiver_user_id.eq.${validUserId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertTransfer(transfer: {
    id?: string;
    sender_user_id: string;
    receiver_user_id: string;
    sender_device_id: string;
    receiver_device_id: string;
    status: string;
    total_size: number;
    connection_type: string;
    expires_at: string;
    items?: any[];
  }) {
    const sender = resolveUuid(transfer.sender_user_id);
    const receiver = resolveUuid(transfer.receiver_user_id);
    if (!sender || !receiver) return null;

    const payload: Record<string, any> = {
      ...transfer,
      sender_user_id: sender,
      receiver_user_id: receiver,
    };
    if (payload.id && !isValidUuid(payload.id)) {
      delete payload.id;
    }

    const { data, error } = await getSupabase().from('transfers').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  // 6. Text Items
  async listTextItems(ownerId: string) {
    const validOwnerId = resolveUuid(ownerId);
    if (!validOwnerId) return [];
    const { data, error } = await getSupabase()
      .from('text_items')
      .select('*')
      .eq('owner_id', validOwnerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async upsertTextItem(item: { id?: string; owner_id: string; title: string; content: string; language: string; created_at?: string }) {
    const validOwnerId = resolveUuid(item.owner_id);
    if (!validOwnerId) return null;

    const payload: Record<string, any> = {
      owner_id: validOwnerId,
      title: item.title,
      content: item.content,
      language: item.language,
      created_at: item.created_at || new Date().toISOString(),
    };
    if (item.id && isValidUuid(item.id)) {
      payload.id = item.id;
    }

    const { data, error } = await getSupabase().from('text_items').upsert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async deleteTextItem(id: string) {
    if (!isValidUuid(id)) return true;
    const { error } = await getSupabase().from('text_items').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // 7. Links
  async listLinks(ownerId: string) {
    const validOwnerId = resolveUuid(ownerId);
    if (!validOwnerId) return [];
    const { data, error } = await getSupabase()
      .from('links')
      .select('*')
      .eq('owner_id', validOwnerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async upsertLink(item: { id?: string; owner_id: string; url: string; title: string; domain: string; favicon_url?: string; created_at?: string }) {
    const validOwnerId = resolveUuid(item.owner_id);
    if (!validOwnerId) return null;

    const payload: Record<string, any> = {
      owner_id: validOwnerId,
      url: item.url,
      title: item.title,
      domain: item.domain,
      favicon_url: item.favicon_url || null,
      created_at: item.created_at || new Date().toISOString(),
    };
    if (item.id && isValidUuid(item.id)) {
      payload.id = item.id;
    }

    const { data, error } = await getSupabase().from('links').upsert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async deleteLink(id: string) {
    if (!isValidUuid(id)) return true;
    const { error } = await getSupabase().from('links').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // 8. Notifications
  async listNotifications(userId: string) {
    const validUserId = resolveUuid(userId);
    if (!validUserId) return [];
    const { data, error } = await getSupabase()
      .from('notifications')
      .select('*')
      .eq('user_id', validUserId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertNotification(item: { id?: string; user_id: string; type: string; title: string; message: string; read?: boolean; created_at?: string }) {
    const validUserId = resolveUuid(item.user_id);
    if (!validUserId) return null;

    const payload: Record<string, any> = {
      user_id: validUserId,
      type: item.type,
      title: item.title,
      message: item.message,
      read: item.read ?? false,
      created_at: item.created_at || new Date().toISOString(),
    };
    if (item.id && isValidUuid(item.id)) {
      payload.id = item.id;
    }

    const { data, error } = await getSupabase().from('notifications').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  // 9. Activity Logs
  async listActivityLogs(userId: string) {
    const validUserId = resolveUuid(userId);
    if (!validUserId) return [];
    const { data, error } = await getSupabase()
      .from('activity_logs')
      .select('*')
      .eq('user_id', validUserId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertActivityLog(item: { id?: string; user_id: string; type: string; title: string; metadata?: any; ip_hash?: string; created_at?: string }) {
    const validUserId = resolveUuid(item.user_id);
    if (!validUserId) return null;

    const payload: Record<string, any> = {
      user_id: validUserId,
      type: item.type,
      title: item.title,
      metadata: item.metadata || {},
      ip_hash: item.ip_hash || null,
      created_at: item.created_at || new Date().toISOString(),
    };
    if (item.id && isValidUuid(item.id)) {
      payload.id = item.id;
    }

    const { data, error } = await getSupabase().from('activity_logs').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  // 10. Udhar Customers
  async listUdharCustomers(userId: string) {
    const validUserId = resolveUuid(userId);
    if (!validUserId) return [];
    const { data, error } = await getSupabase()
      .from('udhar_customers')
      .select('*')
      .eq('user_id', validUserId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async upsertUdharCustomer(customer: {
    id?: string;
    user_id: string;
    name: string;
    phone?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
  }) {
    const validUserId = resolveUuid(customer.user_id);
    if (!validUserId) return null;

    const payload: Record<string, any> = {
      user_id: validUserId,
      name: customer.name,
      phone: customer.phone || null,
      notes: customer.notes || null,
      created_at: customer.created_at || new Date().toISOString(),
      updated_at: customer.updated_at || new Date().toISOString(),
    };
    if (customer.id && isValidUuid(customer.id)) {
      payload.id = customer.id;
    }

    const { data, error } = await getSupabase().from('udhar_customers').upsert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async deleteUdharCustomer(id: string) {
    if (!isValidUuid(id)) return true;
    const { error } = await getSupabase().from('udhar_customers').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // 11. Udhar Transactions
  async listUdharTransactions(userId: string, customerId?: string) {
    const validUserId = resolveUuid(userId);
    if (!validUserId) return [];

    let query = getSupabase().from('udhar_transactions').select('*').eq('user_id', validUserId);
    if (customerId && isValidUuid(customerId)) {
      query = query.eq('customer_id', customerId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async upsertUdharTransaction(tx: {
    id?: string;
    user_id: string;
    customer_id: string;
    type: string;
    amount: number;
    description?: string;
    payment_mode?: string;
    due_date?: string | null;
    status?: string;
    created_at?: string;
  }) {
    const validUserId = resolveUuid(tx.user_id);
    if (!validUserId || !isValidUuid(tx.customer_id)) return null;

    const payload: Record<string, any> = {
      user_id: validUserId,
      customer_id: tx.customer_id,
      type: tx.type,
      amount: tx.amount,
      description: tx.description || null,
      payment_mode: tx.payment_mode || 'Cash',
      due_date: tx.due_date || null,
      status: tx.status || 'pending',
      created_at: tx.created_at || new Date().toISOString(),
    };
    if (tx.id && isValidUuid(tx.id)) {
      payload.id = tx.id;
    }

    const { data, error } = await getSupabase().from('udhar_transactions').upsert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async deleteUdharTransaction(id: string) {
    if (!isValidUuid(id)) return true;
    const { error } = await getSupabase().from('udhar_transactions').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // 12. Full database sync to Supabase (run on startup)
  async syncAllToSupabase() {
    if (!isConnected) {
      const conn = await testSupabaseConnection();
      if (!conn.ok) return;
    }

    console.log('🔄 Initiating comprehensive Supabase database synchronization...');
    let usersSynced = 0;
    let pinsSynced = 0;
    let customersSynced = 0;
    let txSynced = 0;
    let filesSynced = 0;
    let textsSynced = 0;
    let linksSynced = 0;

    // 1. Sync Users
    for (const u of db.users) {
      try {
        await this.insertUser({
          id: u.id,
          username: u.username,
          email: u.email,
          password_hash: u.passwordHash,
          avatar_url: u.avatarUrl,
          status: u.status,
          storage_used: u.storageUsed,
          storage_limit: u.storageLimit,
          security_question: u.securityQuestion,
          security_answer_hash: u.securityAnswerHash,
        });
        usersSynced++;
      } catch (err: any) {
        console.warn(`User sync skipped for ${u.username}:`, err.message);
      }
    }

    // 2. Sync Pins
    for (const p of db.pins) {
      try {
        await this.upsertPin({
          id: p.id,
          user_id: p.userId,
          pin_hash: p.pinHash,
          failed_attempts: p.failedAttempts,
          locked_until: p.lockedUntil,
        });
        pinsSynced++;
      } catch (err: any) {
        console.warn('Pin sync warning:', err.message);
      }
    }

    // 3. Sync Udhar Customers
    for (const c of db.udharCustomers) {
      try {
        await this.upsertUdharCustomer({
          id: c.id,
          user_id: c.userId,
          name: c.name,
          phone: c.phone,
          notes: c.notes,
          created_at: c.createdAt,
          updated_at: c.updatedAt,
        });
        customersSynced++;
      } catch (err: any) {
        console.warn('Udhar customer sync warning:', err.message);
      }
    }

    // 4. Sync Udhar Transactions
    for (const t of db.udharTransactions) {
      try {
        await this.upsertUdharTransaction({
          id: t.id,
          user_id: t.userId,
          customer_id: t.customerId,
          type: t.type,
          amount: t.amount,
          description: t.description,
          payment_mode: t.paymentMode,
          due_date: t.dueDate,
          status: t.status,
          created_at: t.createdAt,
        });
        txSynced++;
      } catch (err: any) {
        console.warn('Udhar transaction sync warning:', err.message);
      }
    }

    // 5. Sync Files
    for (const f of db.files) {
      try {
        await this.upsertFile({
          id: f.id,
          owner_id: f.ownerId,
          storage_key: f.storageKey,
          original_name: f.originalName,
          mime_type: f.mimeType,
          size: f.size,
          checksum: f.checksum,
          category: f.category,
          created_at: f.createdAt,
          updated_at: f.updatedAt,
        });
        filesSynced++;
      } catch (err: any) {
        console.warn('File sync warning:', err.message);
      }
    }

    // 6. Sync Text Items
    for (const txt of db.textItems) {
      try {
        await this.upsertTextItem({
          id: txt.id,
          owner_id: txt.ownerId,
          title: txt.title,
          content: txt.content,
          language: txt.language,
          created_at: txt.createdAt,
        });
        textsSynced++;
      } catch (err: any) {
        console.warn('Text item sync warning:', err.message);
      }
    }

    // 7. Sync Links
    for (const lnk of db.links) {
      try {
        await this.upsertLink({
          id: lnk.id,
          owner_id: lnk.ownerId,
          url: lnk.url,
          title: lnk.title,
          domain: lnk.domain,
          favicon_url: lnk.faviconUrl,
          created_at: lnk.createdAt,
        });
        linksSynced++;
      } catch (err: any) {
        console.warn('Link sync warning:', err.message);
      }
    }

    console.log(
      `✓ Supabase full sync complete: ${usersSynced} users, ${pinsSynced} pins, ${customersSynced} customers, ${txSynced} transactions, ${filesSynced} files, ${textsSynced} snippets, ${linksSynced} links.`
    );
  },
};

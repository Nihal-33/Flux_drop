import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config.js';
import { db } from './database/db.js';
import { testSupabaseConnection, isSupabaseConnected, supabaseService } from './database/supabase.js';
import { wsServer } from './websocket/wsServer.js';
import { hashPassword, hashPin } from './utils/security.js';

// Routers
import { authRouter } from './modules/auth/auth.controller.js';
import { pinRouter } from './modules/pins/pin.controller.js';
import { deviceRouter } from './modules/devices/device.controller.js';
import { pairingRouter } from './modules/pairing/pairing.controller.js';
import { fileRouter } from './modules/files/file.controller.js';
import { transferRouter } from './modules/transfers/transfer.controller.js';
import { textRouter } from './modules/text/text.controller.js';
import { linkRouter } from './modules/links/link.controller.js';
import { notificationRouter } from './modules/notifications/notification.controller.js';
import { activityRouter } from './modules/activity/activity.controller.js';
import { securityRouter } from './modules/security/security.controller.js';
import { udharRouter } from './modules/udhar/udhar.controller.js';

const app = express();
const server = http.createServer(app);

// CORS and Body Parsers
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging in dev
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'FluxDrop API',
    version: '1.0.0',
    time: new Date().toISOString(),
    devicesOnline: db.devices.filter(d => d.isOnline).length,
    supabase: {
      connected: isSupabaseConnected(),
      project: 'FluxDrop (jyuazhyurgmjshbhvulp)',
      url: config.supabaseUrl,
      bucket: config.supabaseStorageBucket,
    },
  });
});

// Supabase live status and tables diagnostic
app.get('/api/supabase/status', async (req, res) => {
  const result = await testSupabaseConnection();
  res.json({
    ...result,
    tables: [
      'users',
      'pins',
      'devices',
      'pairing_sessions',
      'files',
      'transfers',
      'text_items',
      'links',
      'sessions',
      'activity_logs',
      'notifications',
      'udhar_customers',
      'udhar_transactions',
    ],
    bucket: config.supabaseStorageBucket,
    url: config.supabaseUrl,
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/pin', pinRouter);
app.use('/api/devices', deviceRouter);
app.use('/api/pairing', pairingRouter);
app.use('/api/files', fileRouter);
app.use('/api/transfers', transferRouter);
app.use('/api/text', textRouter);
app.use('/api/links', linkRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/activity', activityRouter);
app.use('/api/security', securityRouter);
app.use('/api/udhar', udharRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.',
  });
});

// Initialize WebSockets
wsServer.init(server);

// Seed initial default test account if database is fresh
async function seedDefaultUser() {
  if (db.users.length === 0) {
    const passwordHash = await hashPassword('Password123!');
    const pinHash = await hashPin('482913');
    const now = new Date().toISOString();

    const user = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      username: 'nihal',
      email: 'nihal@fluxdrop.internal',
      passwordHash,
      avatarUrl: '',
      createdAt: now,
      updatedAt: now,
      status: 'active' as const,
      storageUsed: 2.4 * 1024 * 1024 * 1024, // 2.4 GB as in demo specs
      storageLimit: 10 * 1024 * 1024 * 1024, // 10 GB
    };

    db.users.push(user);
    db.pins.push({
      id: 'pin_nihal_prime',
      userId: user.id,
      pinHash,
      createdAt: now,
      updatedAt: now,
      failedAttempts: 0,
      lockedUntil: null,
    });

    // Seed realistic devices as per specs (Nihal's Laptop, Nihal's Phone, Office PC)
    const laptopId = 'dev_laptop_01';
    db.devices.push(
      {
        id: laptopId,
        userId: user.id,
        deviceName: "Nihal's Laptop",
        deviceType: 'laptop',
        platform: 'Windows 11',
        browser: 'Chrome 128',
        deviceTokenHash: 'hash_dev_laptop',
        lastSeen: now,
        isOnline: true,
        isTrusted: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'dev_phone_02',
        userId: user.id,
        deviceName: "Nihal's Phone",
        deviceType: 'mobile',
        platform: 'Android 15',
        browser: 'Mobile Chrome',
        deviceTokenHash: 'hash_dev_phone',
        lastSeen: now,
        isOnline: true,
        isTrusted: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'dev_pc_03',
        userId: user.id,
        deviceName: 'Office PC',
        deviceType: 'desktop',
        platform: 'Windows PC',
        browser: 'Firefox',
        deviceTokenHash: 'hash_dev_pc',
        lastSeen: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        isOnline: false,
        isTrusted: false,
        createdAt: now,
        updatedAt: now,
      }
    );

    // Seed recent transfers as specified in prompt
    db.transfers.push(
      {
        id: 'tx_proj_zip',
        senderUserId: user.id,
        receiverUserId: user.id,
        senderDeviceId: laptopId,
        receiverDeviceId: 'dev_phone_02',
        status: 'completed',
        totalSize: 482 * 1024 * 1024,
        connectionType: 'direct',
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        items: [
          {
            id: 'item_zip_1',
            transferId: 'tx_proj_zip',
            filename: 'project.zip',
            size: 482 * 1024 * 1024,
            mimeType: 'application/zip',
            status: 'completed',
            progress: 100,
          }
        ]
      },
      {
        id: 'tx_design_assets',
        senderUserId: user.id,
        receiverUserId: user.id,
        senderDeviceId: 'dev_phone_02',
        receiverDeviceId: laptopId,
        status: 'completed',
        totalSize: 124 * 1024 * 1024,
        connectionType: 'relay',
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        startedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 3550 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        items: [
          {
            id: 'item_img_1',
            transferId: 'tx_design_assets',
            filename: 'hero_mockup.png',
            size: 14 * 1024 * 1024,
            mimeType: 'image/png',
            status: 'completed',
            progress: 100,
          },
          {
            id: 'item_pdf_2',
            transferId: 'tx_design_assets',
            filename: 'specification_v2.pdf',
            size: 110 * 1024 * 1024,
            mimeType: 'application/pdf',
            status: 'completed',
            progress: 100,
          }
        ]
      }
    );

    // Seed sample files
    db.files.push(
      {
        id: 'file_proj_zip',
        ownerId: user.id,
        storageKey: 'users/usr_nihal_prime/project.zip',
        originalName: 'project.zip',
        mimeType: 'application/zip',
        size: 482 * 1024 * 1024,
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        category: 'archives',
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: 'file_spec_pdf',
        ownerId: user.id,
        storageKey: 'users/usr_nihal_prime/specification_v2.pdf',
        originalName: 'specification_v2.pdf',
        mimeType: 'application/pdf',
        size: 110 * 1024 * 1024,
        checksum: '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
        category: 'documents',
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      }
    );

    // Seed initial notifications
    db.notifications.push(
      {
        id: 'notif_welcome',
        userId: user.id,
        type: 'system',
        title: 'Welcome to FluxDrop',
        message: 'Your high-performance workspace is ready. PIN protection is enabled.',
        read: false,
        createdAt: now,
      },
      {
        id: 'notif_device_connected',
        userId: user.id,
        type: 'device',
        title: 'Device Paired',
        message: "Nihal's Phone was successfully paired with your workspace.",
        read: true,
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      }
    );

    // Seed sample text and links
    db.textItems.push({
      id: 'snippet_1',
      ownerId: user.id,
      title: 'FluxDrop WebRTC Signaling Hook',
      language: 'typescript',
      content: `// WebRTC Direct Peer Connection Handler\nexport function initiatePeerConnection(peerId: string) {\n  const pc = new RTCPeerConnection({\n    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]\n  });\n  return pc;\n}`,
      createdAt: now,
    });

    db.links.push({
      id: 'link_1',
      ownerId: user.id,
      url: 'https://fluxdrop.dev/docs/security',
      title: 'FluxDrop Zero-Trust Transfer Architecture',
      domain: 'fluxdrop.dev',
      faviconUrl: 'https://www.google.com/s2/favicons?domain=fluxdrop.dev&sz=64',
      createdAt: now,
    });

    db.schedulePersist();
    console.log('✓ Database seeded with default workspace (User: nihal / Password: Password123! / PIN: 482913)');

    // Sync demo account to Supabase
    try {
      const client = supabaseService.client;
      const { data: existingUser } = await client.from('users').select('id').eq('username', user.username).maybeSingle();
      if (!existingUser) {
        await client.from('users').insert({
          username: user.username,
          email: user.email,
          password_hash: user.passwordHash,
          avatar_url: user.avatarUrl,
          status: user.status,
          storage_used: user.storageUsed,
          storage_limit: user.storageLimit,
        });
        const { data: createdSupabaseUser } = await client.from('users').select('id').eq('username', user.username).single();
        if (createdSupabaseUser) {
          await client.from('pins').upsert({
            user_id: createdSupabaseUser.id,
            pin_hash: pinHash,
            failed_attempts: 0,
          }, { onConflict: 'user_id' });
          console.log('✓ Successfully synced demo account to Supabase PostgreSQL database');
        }
      }
    } catch (e: any) {
      console.warn('⚠️ Supabase sync notice:', e.message);
    }
  }
}

seedDefaultUser().catch(console.error);

// Start Server
server.listen(config.port, async () => {
  console.log(`===============================================`);
  console.log(`🚀 FluxDrop Backend Server running on port ${config.port}`);
  console.log(`📡 WebSocket ready on ws://localhost:${config.port}/ws`);
  console.log(`🔒 Security PIN & Session Protection: ACTIVE`);
  const sbStatus = await testSupabaseConnection();
  if (sbStatus.ok) {
    console.log(`⚡ Supabase Database & Storage: CONNECTED (${sbStatus.project})`);
    supabaseService.syncAllToSupabase().catch(err => console.warn('Supabase initial sync notice:', err.message));
  } else {
    console.log(`⚠️ Supabase Status: ${sbStatus.message}`);
  }
  console.log(`===============================================`);
});

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, Device } from '../../database/db.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { generateDeviceToken, hashDeviceToken } from '../../utils/security.js';
import { ActivityService } from '../activity/activity.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { wsServer } from '../../websocket/wsServer.js';
import { supabaseService } from '../../database/supabase.js';

export const deviceRouter = Router();

// Register or reconnect current device
deviceRouter.post('/register', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deviceName, deviceType, platform, browser, existingDeviceId } = req.body;
    const userId = req.user!.id;
    const now = new Date().toISOString();

    if (existingDeviceId) {
      const existing = db.devices.find(d => d.id === existingDeviceId && d.userId === userId);
      if (existing) {
        existing.isOnline = true;
        existing.lastSeen = now;
        existing.platform = platform || existing.platform;
        existing.browser = browser || existing.browser;
        if (deviceName) existing.deviceName = deviceName;
        db.schedulePersist();

        wsServer.sendToUser(userId, {
          type: 'device:online',
          payload: existing
        });

        return res.json({ device: existing, deviceToken: null });
      }
    }

    const deviceToken = generateDeviceToken();
    const tokenHash = hashDeviceToken(deviceToken);

    const newDevice: Device = {
      id: uuidv4(),
      userId,
      deviceName: deviceName || 'Personal Device',
      deviceType: deviceType || 'laptop',
      platform: platform || 'Web',
      browser: browser || 'Browser',
      deviceTokenHash: tokenHash,
      lastSeen: now,
      isOnline: true,
      isTrusted: false,
      createdAt: now,
      updatedAt: now,
    };

    db.devices.push(newDevice);
    db.schedulePersist();

    // Sync to Supabase
    supabaseService.upsertDevice({
      id: newDevice.id,
      user_id: newDevice.userId,
      device_name: newDevice.deviceName,
      device_type: newDevice.deviceType,
      platform: newDevice.platform,
      browser: newDevice.browser,
      device_token_hash: newDevice.deviceTokenHash,
      is_online: newDevice.isOnline,
      is_trusted: newDevice.isTrusted,
    }).catch(e => console.warn('Supabase device sync notice:', e.message));

    ActivityService.log(userId, 'device:registered', `Registered new device: ${newDevice.deviceName}`, {
      deviceName: newDevice.deviceName,
      platform: newDevice.platform
    }, req.ip);

    NotificationService.create(userId, 'device', 'New Device Registered', `${newDevice.deviceName} (${newDevice.platform}) was added to your workspace.`);

    wsServer.sendToUser(userId, {
      type: 'device:registered',
      payload: newDevice
    });

    return res.status(201).json({
      device: newDevice,
      deviceToken,
    });
  } catch (err: any) {
    console.error('Device register error:', err);
    return res.status(500).json({ error: 'Device registration failed.' });
  }
});

// List all user devices
deviceRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userDevices = db.devices.filter(d => d.userId === userId);
  return res.json({ devices: userDevices });
});

// Rename or update device trusted status
deviceRouter.patch('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { deviceName, isTrusted } = req.body;
  const userId = req.user!.id;

  const device = db.devices.find(d => d.id === id && d.userId === userId);
  if (!device) {
    return res.status(404).json({ error: 'Device not found.' });
  }

  if (typeof deviceName === 'string' && deviceName.trim().length > 0) {
    device.deviceName = deviceName.trim();
  }
  if (typeof isTrusted === 'boolean') {
    device.isTrusted = isTrusted;
  }
  device.updatedAt = new Date().toISOString();
  db.schedulePersist();

  ActivityService.log(userId, 'device:updated', `Updated device settings: ${device.deviceName}`, {}, req.ip);

  wsServer.sendToUser(userId, {
    type: 'device:updated',
    payload: device
  });

  return res.json({ device });
});

// Revoke / delete device
deviceRouter.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const index = db.devices.findIndex(d => d.id === id && d.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Device not found.' });
  }

  const [removed] = db.devices.splice(index, 1);
  db.schedulePersist();

  // Sync delete to Supabase
  supabaseService.deleteDevice(id).catch(e => console.warn('Supabase device delete notice:', e.message));

  ActivityService.log(userId, 'device:revoked', `Revoked device: ${removed.deviceName}`, {}, req.ip);
  NotificationService.create(userId, 'device', 'Device Access Revoked', `${removed.deviceName} was removed and its access was revoked.`);

  wsServer.sendToUser(userId, {
    type: 'device:revoked',
    payload: { deviceId: id }
  });

  return res.json({ message: 'Device revoked successfully.', deviceId: id });
});

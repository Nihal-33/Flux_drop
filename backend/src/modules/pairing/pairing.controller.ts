import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { db, PairingSession } from '../../database/db.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { generatePairingCode } from '../../utils/security.js';
import { config } from '../../config.js';
import { wsServer } from '../../websocket/wsServer.js';
import { ActivityService } from '../activity/activity.service.js';
import { NotificationService } from '../notifications/notification.service.js';

export const pairingRouter = Router();

// Initiate pairing session (on Device A)
pairingRouter.post('/initiate', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user!.id;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required to initiate pairing.' });
    }

    const initiatorDevice = db.devices.find(d => d.id === deviceId && d.userId === userId);
    if (!initiatorDevice) {
      return res.status(404).json({ error: 'Initiator device not found.' });
    }

    const pairingCode = generatePairingCode();
    const qrToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + config.pairingCodeExpiresMinutes * 60 * 1000).toISOString();
    const pairingCodeHash = crypto.createHash('sha256').update(pairingCode.replace(/\s+/g, '')).digest('hex');

    const session: PairingSession = {
      id: uuidv4(),
      initiatorDeviceId: deviceId,
      pairingCode,
      pairingCodeHash,
      qrToken,
      expiresAt,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.pairingSessions.push(session);
    db.schedulePersist();

    return res.status(201).json({
      sessionId: session.id,
      pairingCode: session.pairingCode,
      qrPayload: `fluxdrop://pair/${session.qrToken}`,
      expiresAt: session.expiresAt,
      initiatorDevice: {
        id: initiatorDevice.id,
        name: initiatorDevice.deviceName,
        platform: initiatorDevice.platform,
      }
    });
  } catch (err: any) {
    console.error('Pairing initiate error:', err);
    return res.status(500).json({ error: 'Could not initiate pairing session.' });
  }
});

// Request pairing (from Device B entering code or scanning QR)
pairingRouter.post('/request', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { codeOrToken, deviceId, deviceName, platform, browser } = req.body;
    const userId = req.user!.id;

    if (!codeOrToken) {
      return res.status(400).json({ error: 'Pairing code or QR token is required.' });
    }

    const cleanInput = codeOrToken.replace('fluxdrop://pair/', '').replace(/\s+/g, '').trim();
    const inputHash = crypto.createHash('sha256').update(cleanInput).digest('hex');

    const now = new Date();
    const session = db.pairingSessions.find(
      s => (s.qrToken === cleanInput || s.pairingCodeHash === inputHash) &&
           s.status === 'pending' &&
           new Date(s.expiresAt) > now
    );

    if (!session) {
      return res.status(404).json({ error: 'Pairing code or QR token is invalid or has expired.' });
    }

    session.receiverDeviceId = deviceId;
    db.schedulePersist();

    const initiatorDevice = db.devices.find(d => d.id === session.initiatorDeviceId);

    // Notify the initiator device with approval prompt
    wsServer.sendToDevice(session.initiatorDeviceId, {
      type: 'pairing:incoming_request',
      payload: {
        sessionId: session.id,
        requestingDevice: {
          id: deviceId,
          name: deviceName || 'New Device',
          platform: platform || 'Unknown',
          browser: browser || 'Unknown Browser',
        }
      }
    });

    return res.json({
      message: 'Pairing request sent. Waiting for approval on target device...',
      sessionId: session.id,
      targetDevice: initiatorDevice ? { name: initiatorDevice.deviceName, platform: initiatorDevice.platform } : null,
    });
  } catch (err: any) {
    console.error('Pairing request error:', err);
    return res.status(500).json({ error: 'Pairing request failed.' });
  }
});

// Approve or reject pairing (by Device A)
pairingRouter.post('/decision', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId, approved } = req.body;
    const userId = req.user!.id;

    const session = db.pairingSessions.find(s => s.id === sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Pairing session not found.' });
    }

    if (approved) {
      session.status = 'paired';
      db.schedulePersist();

      ActivityService.log(userId, 'pairing:success', 'Device pairing approved', { sessionId }, req.ip);
      NotificationService.create(userId, 'device', 'Device Paired', 'A new device was successfully paired.');

      // Notify both devices
      if (session.receiverDeviceId) {
        wsServer.sendToDevice(session.receiverDeviceId, {
          type: 'pairing:approved',
          payload: { sessionId, success: true }
        });
      }

      wsServer.sendToDevice(session.initiatorDeviceId, {
        type: 'pairing:completed',
        payload: { sessionId, success: true }
      });

      return res.json({ message: 'Device approved and paired successfully.' });
    } else {
      session.status = 'rejected';
      db.schedulePersist();

      if (session.receiverDeviceId) {
        wsServer.sendToDevice(session.receiverDeviceId, {
          type: 'pairing:rejected',
          payload: { sessionId, message: 'Pairing request was declined.' }
        });
      }

      return res.json({ message: 'Pairing request rejected.' });
    }
  } catch (err: any) {
    console.error('Pairing decision error:', err);
    return res.status(500).json({ error: 'Pairing decision failed.' });
  }
});

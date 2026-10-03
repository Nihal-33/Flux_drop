import { Router, Response } from 'express';
import { db } from '../../database/db.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { TransferManager } from './TransferManager.js';

export const transferRouter = Router();

// Create new transfer
transferRouter.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { receiverDeviceId, receiverUserId, items, connectionType } = req.body;
    const senderUserId = req.user!.id;
    const senderDeviceId = req.body.senderDeviceId || req.deviceId;

    if (!receiverDeviceId) {
      return res.status(400).json({ error: 'Receiver device ID is required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one file or item is required to transfer.' });
    }

    // Determine receiver user id: if not specified, default to same account (user sending to own device)
    const effectiveReceiverUserId = receiverUserId || senderUserId;

    const transfer = TransferManager.createTransfer({
      senderUserId,
      receiverUserId: effectiveReceiverUserId,
      senderDeviceId: senderDeviceId || 'unknown-sender',
      receiverDeviceId,
      items,
      connectionType: connectionType || 'relay',
    });

    return res.status(201).json({ transfer });
  } catch (err: any) {
    console.error('Transfer create error:', err);
    return res.status(500).json({ error: 'Failed to initiate transfer.' });
  }
});

// Accept transfer
transferRouter.post('/:id/accept', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const deviceId = req.body.deviceId || req.deviceId || '';

  const transfer = TransferManager.acceptTransfer(id, deviceId);
  if (!transfer) {
    return res.status(404).json({ error: 'Transfer not found.' });
  }

  return res.json({ message: 'Transfer accepted.', transfer });
});

// Reject / cancel transfer
transferRouter.post('/:id/reject', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason, deviceId } = req.body;

  const transfer = TransferManager.rejectTransfer(id, deviceId || '', reason);
  if (!transfer) {
    return res.status(404).json({ error: 'Transfer not found.' });
  }

  return res.json({ message: 'Transfer rejected.', transfer });
});

// Start transfer
transferRouter.post('/:id/start', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const transfer = TransferManager.startTransfer(id);
  if (!transfer) {
    return res.status(404).json({ error: 'Transfer not found.' });
  }
  return res.json({ transfer });
});

// Update progress
transferRouter.post('/:id/progress', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { itemId, progress } = req.body;

  TransferManager.updateProgress(id, itemId, progress);
  return res.json({ success: true });
});

// Complete transfer
transferRouter.post('/:id/complete', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const transfer = TransferManager.completeTransfer(id);
  if (!transfer) {
    return res.status(404).json({ error: 'Transfer not found.' });
  }
  return res.json({ message: 'Transfer completed successfully.', transfer });
});

// List transfers (Tabs: all, sent, received, active, completed, failed)
transferRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { tab = 'all', search } = req.query;

  let transfers = db.transfers.filter(
    t => t.senderUserId === userId || t.receiverUserId === userId
  );

  if (tab === 'sent') {
    transfers = transfers.filter(t => t.senderUserId === userId);
  } else if (tab === 'received') {
    transfers = transfers.filter(t => t.receiverUserId === userId);
  } else if (tab === 'active') {
    transfers = transfers.filter(t => ['waiting', 'connecting', 'transferring'].includes(t.status));
  } else if (tab === 'completed') {
    transfers = transfers.filter(t => t.status === 'completed');
  } else if (tab === 'failed') {
    transfers = transfers.filter(t => ['failed', 'cancelled', 'expired'].includes(t.status));
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    transfers = transfers.filter(t =>
      t.items.some(item => item.filename.toLowerCase().includes(q)) ||
      t.id.toLowerCase().includes(q)
    );
  }

  // Populate device names for easy client consumption
  const populated = transfers.map(t => {
    const senderDev = db.devices.find(d => d.id === t.senderDeviceId);
    const receiverDev = db.devices.find(d => d.id === t.receiverDeviceId);
    return {
      ...t,
      senderDeviceName: senderDev?.deviceName || 'Unknown device',
      receiverDeviceName: receiverDev?.deviceName || 'Unknown device',
    };
  });

  return res.json({ transfers: populated });
});

// Get transfer detail by ID
transferRouter.get('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const transfer = db.transfers.find(
    t => t.id === id && (t.senderUserId === userId || t.receiverUserId === userId)
  );

  if (!transfer) {
    return res.status(404).json({ error: 'Transfer not found.' });
  }

  const senderDev = db.devices.find(d => d.id === transfer.senderDeviceId);
  const receiverDev = db.devices.find(d => d.id === transfer.receiverDeviceId);

  return res.json({
    transfer: {
      ...transfer,
      senderDevice: senderDev || null,
      receiverDevice: receiverDev || null,
    }
  });
});

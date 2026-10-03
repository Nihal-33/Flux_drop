import { v4 as uuidv4 } from 'uuid';
import { db, Transfer, TransferItem } from '../../database/db.js';
import { wsServer } from '../../websocket/wsServer.js';
import { ActivityService } from '../activity/activity.service.js';
import { NotificationService } from '../notifications/notification.service.js';

export interface CreateTransferOptions {
  senderUserId: string;
  receiverUserId: string;
  senderDeviceId: string;
  receiverDeviceId: string;
  items: Array<{
    filename: string;
    size: number;
    mimeType: string;
    fileId?: string;
  }>;
  connectionType?: 'direct' | 'relay';
}

export class TransferManager {
  /**
   * Initialize a new pending transfer request between two devices
   */
  public static createTransfer(options: CreateTransferOptions): Transfer {
    const totalSize = options.items.reduce((acc, it) => acc + (it.size || 0), 0);
    const transferId = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min expiration

    const transferItems: TransferItem[] = options.items.map(item => ({
      id: uuidv4(),
      transferId,
      fileId: item.fileId,
      filename: item.filename,
      size: item.size,
      mimeType: item.mimeType || 'application/octet-stream',
      status: 'pending',
      progress: 0,
    }));

    const transfer: Transfer = {
      id: transferId,
      senderUserId: options.senderUserId,
      receiverUserId: options.receiverUserId,
      senderDeviceId: options.senderDeviceId,
      receiverDeviceId: options.receiverDeviceId,
      status: 'waiting',
      totalSize,
      connectionType: options.connectionType || 'relay',
      createdAt: now,
      expiresAt,
      items: transferItems,
    };

    db.transfers.unshift(transfer);
    db.schedulePersist();

    // Notify receiving device in real-time
    const senderDevice = db.devices.find(d => d.id === options.senderDeviceId);
    wsServer.sendToDevice(options.receiverDeviceId, {
      type: 'transfer:created',
      payload: {
        transfer,
        senderDevice: senderDevice ? { name: senderDevice.deviceName, platform: senderDevice.platform } : null,
      }
    });

    // Also push to sender device
    wsServer.sendToDevice(options.senderDeviceId, {
      type: 'transfer:initiated',
      payload: { transfer }
    });

    return transfer;
  }

  /**
   * Accept an incoming transfer by the recipient device
   */
  public static acceptTransfer(transferId: string, receiverDeviceId: string): Transfer | null {
    const transfer = db.transfers.find(t => t.id === transferId);
    if (!transfer) return null;

    transfer.status = 'connecting';
    db.schedulePersist();

    wsServer.sendToDevice(transfer.senderDeviceId, {
      type: 'transfer:accepted',
      payload: { transferId, status: 'connecting' }
    });

    wsServer.sendToDevice(transfer.receiverDeviceId, {
      type: 'transfer:status_updated',
      payload: { transferId, status: 'connecting' }
    });

    return transfer;
  }

  /**
   * Reject an incoming transfer
   */
  public static rejectTransfer(transferId: string, receiverDeviceId: string, reason?: string): Transfer | null {
    const transfer = db.transfers.find(t => t.id === transferId);
    if (!transfer) return null;

    transfer.status = 'cancelled';
    db.schedulePersist();

    wsServer.sendToDevice(transfer.senderDeviceId, {
      type: 'transfer:rejected',
      payload: { transferId, reason: reason || 'Transfer declined by receiver.' }
    });

    return transfer;
  }

  /**
   * Mark transfer as actively transmitting data
   */
  public static startTransfer(transferId: string): Transfer | null {
    const transfer = db.transfers.find(t => t.id === transferId);
    if (!transfer) return null;

    transfer.status = 'transferring';
    transfer.startedAt = new Date().toISOString();
    transfer.items.forEach(it => { it.status = 'transferring'; });
    db.schedulePersist();

    const payload = { transferId, status: 'transferring', startedAt: transfer.startedAt };
    wsServer.sendToDevice(transfer.senderDeviceId, { type: 'transfer:started', payload });
    wsServer.sendToDevice(transfer.receiverDeviceId, { type: 'transfer:started', payload });

    return transfer;
  }

  /**
   * Pause an active transfer
   */
  public static pauseTransfer(transferId: string): Transfer | null {
    const transfer = db.transfers.find(t => t.id === transferId);
    if (!transfer) return null;

    const payload = { transferId, paused: true };
    wsServer.sendToDevice(transfer.senderDeviceId, { type: 'transfer:paused', payload });
    wsServer.sendToDevice(transfer.receiverDeviceId, { type: 'transfer:paused', payload });

    return transfer;
  }

  /**
   * Resume a paused transfer
   */
  public static resumeTransfer(transferId: string): Transfer | null {
    const transfer = db.transfers.find(t => t.id === transferId);
    if (!transfer) return null;

    const payload = { transferId, resumed: true };
    wsServer.sendToDevice(transfer.senderDeviceId, { type: 'transfer:resumed', payload });
    wsServer.sendToDevice(transfer.receiverDeviceId, { type: 'transfer:resumed', payload });

    return transfer;
  }

  /**
   * Update progress of transfer item and total transfer
   */
  public static updateProgress(transferId: string, itemId: string, progress: number): void {
    const transfer = db.transfers.find(t => t.id === transferId);
    if (!transfer) return;

    const item = transfer.items.find(i => i.id === itemId);
    if (item) {
      item.progress = Math.min(100, Math.max(0, progress));
    }

    // Compute average progress
    const totalProgress = transfer.items.reduce((sum, it) => sum + it.progress, 0) / transfer.items.length;

    const payload = {
      transferId,
      itemId,
      itemProgress: progress,
      totalProgress: Math.round(totalProgress),
    };

    wsServer.sendToDevice(transfer.senderDeviceId, { type: 'transfer:progress', payload });
    wsServer.sendToDevice(transfer.receiverDeviceId, { type: 'transfer:progress', payload });
  }

  /**
   * Mark transfer as fully completed
   */
  public static completeTransfer(transferId: string): Transfer | null {
    const transfer = db.transfers.find(t => t.id === transferId);
    if (!transfer) return null;

    transfer.status = 'completed';
    transfer.completedAt = new Date().toISOString();
    transfer.items.forEach(it => {
      it.status = 'completed';
      it.progress = 100;
    });

    db.schedulePersist();

    const senderDevice = db.devices.find(d => d.id === transfer.senderDeviceId);
    const receiverDevice = db.devices.find(d => d.id === transfer.receiverDeviceId);

    ActivityService.log(
      transfer.senderUserId,
      'transfer:completed',
      `Transferred ${transfer.items.length} item(s) to ${receiverDevice?.deviceName || 'device'}`,
      { transferId, totalSize: transfer.totalSize }
    );

    NotificationService.create(
      transfer.receiverUserId,
      'transfer',
      'Transfer Completed',
      `Received ${transfer.items.length} item(s) from ${senderDevice?.deviceName || 'device'}.`
    );

    const payload = {
      transferId,
      status: 'completed',
      completedAt: transfer.completedAt,
      items: transfer.items,
    };

    wsServer.sendToDevice(transfer.senderDeviceId, { type: 'transfer:completed', payload });
    wsServer.sendToDevice(transfer.receiverDeviceId, { type: 'transfer:completed', payload });

    return transfer;
  }

  /**
   * Cancel transfer
   */
  public static cancelTransfer(transferId: string, deviceId: string): Transfer | null {
    const transfer = db.transfers.find(t => t.id === transferId);
    if (!transfer) return null;

    transfer.status = 'cancelled';
    db.schedulePersist();

    const payload = { transferId, cancelledBy: deviceId };
    wsServer.sendToDevice(transfer.senderDeviceId, { type: 'transfer:cancelled', payload });
    wsServer.sendToDevice(transfer.receiverDeviceId, { type: 'transfer:cancelled', payload });

    return transfer;
  }

  /**
   * Retry failed transfer
   */
  public static retryTransfer(transferId: string): Transfer | null {
    const transfer = db.transfers.find(t => t.id === transferId);
    if (!transfer) return null;

    transfer.status = 'waiting';
    transfer.items.forEach(it => {
      it.status = 'pending';
      it.progress = 0;
    });
    db.schedulePersist();

    const payload = { transferId, status: 'waiting' };
    wsServer.sendToDevice(transfer.senderDeviceId, { type: 'transfer:retried', payload });
    wsServer.sendToDevice(transfer.receiverDeviceId, { type: 'transfer:retried', payload });

    return transfer;
  }

  /**
   * Get transfer progress status
   */
  public static getTransferProgress(transferId: string) {
    const transfer = db.transfers.find(t => t.id === transferId);
    if (!transfer) return null;

    const totalProgress = transfer.items.reduce((sum, it) => sum + it.progress, 0) / (transfer.items.length || 1);
    return {
      transferId,
      status: transfer.status,
      totalProgress: Math.round(totalProgress),
      items: transfer.items,
    };
  }
}

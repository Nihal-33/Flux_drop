import { v4 as uuidv4 } from 'uuid';
import { db, Notification } from '../../database/db.js';
import { wsServer } from '../../websocket/wsServer.js';

export class NotificationService {
  static create(userId: string, type: Notification['type'], title: string, message: string): Notification {
    const notif: Notification = {
      id: uuidv4(),
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };

    db.notifications.unshift(notif);
    if (db.notifications.length > 500) {
      db.notifications.pop();
    }
    db.schedulePersist();

    // Broadcast to user's connected WebSocket clients
    wsServer.sendToUser(userId, {
      type: 'notification:new',
      payload: notif
    });

    return notif;
  }

  static getForUser(userId: string): Notification[] {
    return db.notifications.filter(n => n.userId === userId).slice(0, 50);
  }

  static markAllRead(userId: string): void {
    db.notifications.filter(n => n.userId === userId).forEach(n => { n.read = true; });
    db.schedulePersist();
  }

  static markRead(userId: string, notifId: string): void {
    const n = db.notifications.find(item => item.id === notifId && item.userId === userId);
    if (n) {
      n.read = true;
      db.schedulePersist();
    }
  }
}

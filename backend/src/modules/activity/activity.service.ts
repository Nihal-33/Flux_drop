import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { db, ActivityLog } from '../../database/db.js';

export class ActivityService {
  static log(userId: string, type: string, title: string, metadata?: Record<string, any>, ip?: string): ActivityLog {
    const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16) : undefined;
    
    const activity: ActivityLog = {
      id: uuidv4(),
      userId,
      type,
      title,
      metadata,
      ipHash,
      createdAt: new Date().toISOString(),
    };

    db.activityLogs.unshift(activity);
    if (db.activityLogs.length > 1000) {
      db.activityLogs.pop();
    }
    db.schedulePersist();

    return activity;
  }

  static getForUser(userId: string, limit = 50): ActivityLog[] {
    return db.activityLogs.filter(a => a.userId === userId).slice(0, limit);
  }
}

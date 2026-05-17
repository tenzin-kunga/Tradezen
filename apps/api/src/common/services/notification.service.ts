import { Injectable } from '@nestjs/common';
import { db } from '../../db/drizzle';
import { notifications } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type NotificationType =
  | 'coaching'
  | 'drawdown_alert'
  | 'journal_reminder'
  | 'streak_milestone'
  | 'weekly_summary'
  | 'fomo_warning'
  | 'discipline_reminder';

@Injectable()
export class NotificationService {
  async create(userId: string, type: NotificationType, title: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await db.insert(notifications).values({
      userId,
      type,
      title,
      message,
      metadata,
    });
  }

  async getUnread(userId: string, limit = 20): Promise<Array<{ id: string; type: string; title: string; message: string; metadata: unknown; createdAt: Date | null }>> {
    const results = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return results.map(r => ({
      id: r.id,
      type: r.type,
      title: r.title,
      message: r.message,
      metadata: r.metadata,
      createdAt: r.createdAt,
    }));
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  }

  async markAllRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async getCount(userId: string): Promise<number> {
    const results = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return results.length;
  }
}

import { Injectable } from '@nestjs/common';
import { db } from '../../db/drizzle';
import { notifications, notificationPreferences } from '@tradezen/db';
import { eq, and, desc, sql } from 'drizzle-orm';

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
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(notifications).values({
      userId,
      type,
      title,
      message,
      metadata,
    });
  }

  async getUnread(
    userId: string,
    limit = 20,
  ): Promise<
    Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      metadata: unknown;
      createdAt: Date | null;
    }>
  > {
    const results = await db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return results.map((r) => ({
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
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      );
  }

  async markAllRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async getCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      );
    return Number(result[0]?.count ?? 0);
  }

  async getPreferences(userId: string): Promise<Record<string, boolean>> {
    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    const allTypes = [
      'coaching',
      'drawdown_alert',
      'journal_reminder',
      'streak_milestone',
      'weekly_summary',
      'fomo_warning',
      'discipline_reminder',
    ];

    const result: Record<string, boolean> = {};
    for (const type of allTypes) {
      const pref = prefs.find((p) => p.type === type);
      result[type] = pref?.enabled ?? true;
    }
    return result;
  }

  async updatePreference(
    userId: string,
    type: string,
    enabled: boolean,
  ): Promise<void> {
    await db
      .insert(notificationPreferences)
      .values({ userId, type, enabled })
      .onConflictDoUpdate({
        target: [notificationPreferences.userId, notificationPreferences.type],
        set: { enabled, updatedAt: new Date() },
      });
  }

  async isTypeEnabled(userId: string, type: string): Promise<boolean> {
    const pref = await db.query.notificationPreferences.findFirst({
      where: and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.type, type),
      ),
    });
    return pref?.enabled ?? true;
  }
}

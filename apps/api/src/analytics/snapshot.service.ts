import { Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { analyticsSnapshots, users } from '@tradezen/db';
import { eq, and, gte, desc } from 'drizzle-orm';
import { TradesService } from '../trades/trades.service';
import { BehavioralService } from './behavioral.service';

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger('SnapshotService');

  constructor(
    private readonly tradesService: TradesService,
    private readonly behavioralService: BehavioralService,
  ) {}

  async createSnapshot(userId: string): Promise<void> {
    try {
      const [analytics, advanced, behavioral, strategy] = await Promise.all([
        this.tradesService.getAnalytics(userId),
        this.tradesService.getAdvancedAnalytics(userId),
        this.behavioralService.analyzeBehavior(userId),
        this.tradesService.getStrategyAnalytics(userId),
      ]);

      await db
        .insert(analyticsSnapshots)
        .values({
          userId,
          snapshotDate: new Date().toISOString().split('T')[0],
          metrics: { analytics, advanced, behavioral, strategy },
        })
        .onConflictDoUpdate({
          target: [analyticsSnapshots.userId, analyticsSnapshots.snapshotDate],
          set: {
            metrics: { analytics, advanced, behavioral, strategy },
            // Removed createdAt from update to preserve original creation timestamp
          },
        });

      this.logger.log(`Snapshot created for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Snapshot failed for user ${userId}: ${(error as Error).message}`,
      );
    }
  }

  async getSnapshot(userId: string, date: string): Promise<unknown> {
    return db.query.analyticsSnapshots.findFirst({
      where: and(
        eq(analyticsSnapshots.userId, userId),
        eq(analyticsSnapshots.snapshotDate, date),
      ),
    });
  }

  async getSnapshotHistory(userId: string, days = 30): Promise<unknown[]> {
    const cutoffDate = new Date(Date.now() - days * 86400000)
      .toISOString()
      .split('T')[0];
    return db
      .select()
      .from(analyticsSnapshots)
      .where(
        and(
          eq(analyticsSnapshots.userId, userId),
          gte(analyticsSnapshots.snapshotDate, cutoffDate),
        ),
      )
      .orderBy(desc(analyticsSnapshots.snapshotDate));
  }

  async createAllSnapshots(): Promise<void> {
    const allUsers = await db.select({ id: users.id }).from(users);
    this.logger.log(`Creating snapshots for ${allUsers.length} users`);

    for (const user of allUsers) {
      await this.createSnapshot(user.id.toString());
    }

    this.logger.log('All snapshots completed');
  }
}

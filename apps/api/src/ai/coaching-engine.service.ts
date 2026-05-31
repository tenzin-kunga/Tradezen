import { Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { coachingSessions } from '@tradezen/db';
import { eq, desc } from 'drizzle-orm';
import { CoachingWorkflow } from './workflows/coaching.workflow';
import { TradesService } from '../trades/trades.service';
import { BehavioralService } from '../analytics/behavioral.service';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class CoachingEngineService {
  private readonly logger = new Logger('CoachingEngine');

  constructor(
    private readonly workflow: CoachingWorkflow,
    private readonly tradesService: TradesService,
    private readonly behavioralService: BehavioralService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async evaluateAndCoach(userId: string): Promise<{
    triggers: string[];
    coachingMessage: string;
    severity: string;
  }> {
    const analytics = await this.tradesService.getAnalytics(userId);
    const advanced = await this.tradesService.getAdvancedAnalytics(userId);
    const behavioral = await this.behavioralService.analyzeBehavior(userId);

    const combinedAnalytics = {
      ...(analytics as Record<string, unknown>),
      ...(advanced as Record<string, unknown>),
    };
    const scores = {
      fomoScore: behavioral.fomo.fomoScore,
      revengeScore: behavioral.revenge.revengeScore,
      discipline: behavioral.scores.discipline,
      consistency: behavioral.scores.consistency,
      lossChasing: behavioral.scores.lossChasing,
    };

    const result = await this.workflow.run(combinedAnalytics, scores);

    await db.insert(coachingSessions).values({
      userId,
      severity: result.severity,
      triggers: result.triggers,
      message: result.coachingMessage,
      analyticsSnapshot: combinedAnalytics,
    });

    if (result.severity === 'critical') {
      await this.embeddingService.embedAndStore(
        userId,
        'coaching',
        `coaching_${Date.now()}`,
        result.coachingMessage,
      );
    }

    this.logger.log(
      `Coaching: severity=${result.severity}, triggers=${result.triggers.length}`,
    );
    return result;
  }

  async getCoachingHistory(
    userId: string,
    limit = 10,
  ): Promise<
    Array<{
      id: string;
      severity: string;
      message: string;
      triggers: string[];
      createdAt: Date | null;
    }>
  > {
    const sessions = await db
      .select()
      .from(coachingSessions)
      .where(eq(coachingSessions.userId, userId))
      .orderBy(desc(coachingSessions.createdAt))
      .limit(limit);

    return sessions.map((s) => ({
      id: s.id,
      severity: s.severity,
      message: s.message,
      triggers: s.triggers as string[],
      createdAt: s.createdAt,
    }));
  }

  async getActiveCoaching(
    userId: string,
  ): Promise<{ severity: string; message: string; triggers: string[] } | null> {
    const latest = await db
      .select()
      .from(coachingSessions)
      .where(eq(coachingSessions.userId, userId))
      .orderBy(desc(coachingSessions.createdAt))
      .limit(1);

    if (latest.length === 0) return null;

    const s = latest[0];
    return {
      severity: s.severity,
      message: s.message,
      triggers: s.triggers as string[],
    };
  }
}

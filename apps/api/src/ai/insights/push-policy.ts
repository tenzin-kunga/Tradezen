import { Injectable, Logger } from '@nestjs/common';
import { db } from '../../db/drizzle';
import { aiInsights } from '@tradezen/db';
import { and, desc, eq } from 'drizzle-orm';
import type { InsightCandidate, InsightCard } from './insight-source';
import {
  COACHING_DEDUPE_MS,
  COACHING_SEVERITY_BY_CATEGORY,
} from './thresholds';

const COACHING_PUSH_TYPE = 'coaching_push';

// The resolved push decision handed back to the caller (notification layer).
export interface PushCandidate {
  ruleId: string;
  category: InsightCard['category'];
  title: string;
  message: string;
  source: InsightCard['source'];
  severity: string;
  priority: number;
}

// Pure selection: among pushable candidates, pick the highest-priority one.
// No services, no DB — used directly by the push policy and unit-tested alone.
export function selectPushCandidate(
  candidates: InsightCandidate[],
): InsightCandidate | null {
  const pushable = candidates.filter((c) => c.card.pushable);
  if (pushable.length === 0) return null;
  pushable.sort((a, b) => a.priority - b.priority);
  return pushable[0];
}

@Injectable()
export class CoachingPushPolicy {
  private readonly logger = new Logger('CoachingPushPolicy');

  // Has this exact rule already interrupted the user within the dedupe window?
  async wasPushedRecently(userId: string, ruleId: string): Promise<boolean> {
    const rows = await db
      .select()
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.userId, userId),
          eq(aiInsights.insightType, COACHING_PUSH_TYPE),
        ),
      )
      .orderBy(desc(aiInsights.createdAt));

    const recent = rows.find((r) => (r.metadata as any)?.ruleId === ruleId);
    if (!recent) return false;
    const age = Date.now() - new Date(recent.createdAt ?? 0).getTime();
    return age < COACHING_DEDUPE_MS;
  }

  async recordPush(userId: string, candidate: InsightCandidate): Promise<void> {
    await db.insert(aiInsights).values({
      userId,
      insightType: COACHING_PUSH_TYPE,
      content: candidate.card.title,
      metadata: {
        ruleId: candidate.card.ruleId,
        priority: candidate.priority,
        pushable: candidate.card.pushable,
        source: candidate.card.source,
        category: candidate.card.category,
      },
    });
  }

  // Full decision: select the best pushable candidate, dedupe, then record.
  // Returns null when there is nothing worth interrupting the user about.
  async evaluate(
    userId: string,
    candidates: InsightCandidate[],
  ): Promise<PushCandidate | null> {
    const selected = selectPushCandidate(candidates);
    if (!selected) return null;

    if (await this.wasPushedRecently(userId, selected.card.ruleId)) {
      return null;
    }

    await this.recordPush(userId, selected);

    return {
      ruleId: selected.card.ruleId,
      category: selected.card.category,
      title: selected.card.title,
      message: selected.card.message,
      source: selected.card.source,
      severity:
        COACHING_SEVERITY_BY_CATEGORY[selected.card.category] ?? 'medium',
      priority: selected.priority,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { db } from '../db/drizzle';
import { ingestionOutbox } from '@tradezen/db';
import { eq, asc, sql } from 'drizzle-orm';
import type { IngestionJobData } from './ingestion-enqueuer.service';

const OUTBOX_MAX_ATTEMPTS = 10;

export interface OutboxRecord {
  id: string;
  payload: IngestionJobData;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

@Injectable()
export class IngestionOutboxRepository {
  async insert(payload: IngestionJobData): Promise<string> {
    const [row] = await db
      .insert(ingestionOutbox)
      .values({ payload: payload as unknown as Record<string, unknown> })
      .returning({ id: ingestionOutbox.id });
    return row.id;
  }

  async markDelivered(id: string): Promise<void> {
    await db
      .update(ingestionOutbox)
      .set({ status: 'delivered', updatedAt: new Date() })
      .where(eq(ingestionOutbox.id, id));
  }

  async recordFailure(id: string, error: string): Promise<void> {
    const [updated] = await db
      .update(ingestionOutbox)
      .set({
        attempts: sql`${ingestionOutbox.attempts} + 1`,
        lastError: error,
        updatedAt: new Date(),
      })
      .where(eq(ingestionOutbox.id, id))
      .returning({ attempts: ingestionOutbox.attempts });
    if (updated && updated.attempts >= OUTBOX_MAX_ATTEMPTS) {
      await db
        .update(ingestionOutbox)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(ingestionOutbox.id, id));
    }
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    const rows = await db
      .select()
      .from(ingestionOutbox)
      .where(eq(ingestionOutbox.status, 'pending'))
      .orderBy(asc(ingestionOutbox.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      payload: r.payload as unknown as IngestionJobData,
      status: r.status,
      attempts: r.attempts,
      lastError: r.lastError,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }
}

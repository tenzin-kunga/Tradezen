import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, type JobsOptions } from 'bullmq';
import { IngestionOutboxRepository } from './ingestion-outbox.repository';
import type {
  SemanticDocument,
  EmbeddingEvent,
} from '../ai/context/semantic/types';

export interface IngestionJobData {
  action: 'upsert' | 'delete';
  userId: string;
  sourceType: string;
  sourceId: string;
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export const INGESTION_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

@Injectable()
export class IngestionEnqueuer {
  private readonly logger = new Logger('IngestionEnqueuer');
  private readonly enabled: boolean;

  constructor(
    @InjectQueue('ai-ingestion') private readonly queue: Queue,
    private readonly outbox: IngestionOutboxRepository,
  ) {
    this.enabled = process.env.INGESTION_CLIENT_ENABLED === 'true';
  }

  async enqueueUpsert(doc: SemanticDocument): Promise<void> {
    if (!this.enabled) return;
    await this.add({
      action: 'upsert',
      userId: doc.userId,
      sourceType: doc.sourceType,
      sourceId: doc.id,
      title: doc.title,
      content: doc.content,
      metadata: {
        ...doc.metadata,
        ...(doc.provenance ? { provenance: doc.provenance } : {}),
        ...(doc.createdAt ? { createdAt: doc.createdAt } : {}),
        ...(doc.updatedAt ? { updatedAt: doc.updatedAt } : {}),
      },
    });
  }

  async enqueueDelete(event: EmbeddingEvent): Promise<void> {
    if (!this.enabled) return;
    await this.add({
      action: 'delete',
      userId: event.userId,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
    });
  }

  private async add(data: IngestionJobData): Promise<void> {
    let outboxId: string | null = null;
    try {
      outboxId = await this.outbox.insert(data);
    } catch (error) {
      this.logger.warn(
        `Failed to persist ingestion outbox row (${data.action} ${data.sourceType}:${data.sourceId}): ${(error as Error).message}. Falling back to direct queue publish.`,
      );
    }
    try {
      await this.queue.add(
        `ingest:${data.action}`,
        data,
        INGESTION_JOB_OPTIONS,
      );
      if (outboxId) {
        await this.outbox
          .markDelivered(outboxId)
          .catch((error) =>
            this.logger.warn(
              `Failed to mark outbox row ${outboxId} delivered: ${(error as Error).message}`,
            ),
          );
      }
    } catch (error) {
      this.logger.error(
        `Failed to enqueue ${data.action} ${data.sourceType}:${data.sourceId}: ${(error as Error).message}. Outbox row remains pending for relay retry.`,
      );
    }
  }
}

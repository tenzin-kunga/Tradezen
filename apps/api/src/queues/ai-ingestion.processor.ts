import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import type { IngestionJobData } from './ingestion-enqueuer.service';

@Processor('ai-ingestion')
export class AiIngestionProcessor extends WorkerHost {
  private readonly logger = new Logger('AiIngestionProcessor');
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor() {
    super();
    this.baseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
    this.apiKey = process.env.AI_SERVICE_API_KEY ?? 'tradezen-internal';
    this.timeoutMs = Number(process.env.INGESTION_CLIENT_TIMEOUT_MS ?? 10_000);
  }

  async process(job: Job<IngestionJobData>): Promise<unknown> {
    const { action, userId, sourceType, sourceId } = job.data;
    this.logger.log(
      `Ingesting ${action} ${sourceType}:${sourceId} for user ${userId}`,
    );

    const body = {
      action,
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
      title: job.data.title,
      content: job.data.content,
      metadata: job.data.metadata,
    };

    const resp = await fetch(`${this.baseUrl}/ingest/document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': this.apiKey,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      throw new Error(
        `Ingestion failed for ${sourceType}:${sourceId}: ${resp.status} ${detail}`,
      );
    }

    const result = await resp.json();
    this.logger.log(
      `Ingested ${action} ${sourceType}:${sourceId}: ${JSON.stringify(result)}`,
    );
    return result;
  }
}

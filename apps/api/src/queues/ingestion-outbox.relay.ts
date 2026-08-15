import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IngestionOutboxRepository } from './ingestion-outbox.repository';
import { INGESTION_JOB_OPTIONS } from './ingestion-enqueuer.service';

const RELAY_INTERVAL_MS = Number(
  process.env.INGESTION_OUTBOX_RELAY_INTERVAL_MS ?? 30_000,
);
const RELAY_BATCH = 50;

@Injectable()
export class IngestionOutboxRelay implements OnModuleDestroy {
  private readonly logger = new Logger(IngestionOutboxRelay.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectQueue('ai-ingestion') private readonly queue: Queue,
    private readonly outbox: IngestionOutboxRepository,
  ) {
    if (process.env.NODE_ENV !== 'test') {
      this.timer = setInterval(() => {
        this.sweep().catch((e) =>
          this.logger.error(`Outbox relay tick failed: ${e}`),
        );
      }, RELAY_INTERVAL_MS);
    }
  }

  async sweep(): Promise<number> {
    const pending = await this.outbox.listPending(RELAY_BATCH);
    let delivered = 0;
    for (const row of pending) {
      try {
        await this.queue.add(
          `ingest:${row.payload.action}`,
          row.payload,
          INGESTION_JOB_OPTIONS,
        );
        await this.outbox.markDelivered(row.id);
        delivered++;
      } catch (error) {
        await this.outbox.recordFailure(row.id, (error as Error).message);
        this.logger.warn(
          `Relay failed for outbox row ${row.id} (${row.payload.action} ${row.payload.sourceType}:${row.payload.sourceId}): ${(error as Error).message}`,
        );
      }
    }
    if (pending.length > 0) {
      this.logger.log(
        `Outbox relay: ${delivered}/${pending.length} pending rows re-published`,
      );
    }
    return delivered;
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

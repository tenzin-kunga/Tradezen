import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CsvImportProcessor } from './csv-import.processor';
import { AiProcessingProcessor } from './ai-processing.processor';
import { AiIngestionProcessor } from './ai-ingestion.processor';
import { IngestionEnqueuer } from './ingestion-enqueuer.service';
import { IngestionOutboxRepository } from './ingestion-outbox.repository';
import { IngestionOutboxRelay } from './ingestion-outbox.relay';
import { JobStatusService } from './job-status.service';
import { EventPublisherService } from '../common/services/event-publisher.service';
import { getRedisConnection } from '../common/utils/redis-connection';

@Module({
  imports: [
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    BullModule.registerQueue(
      { name: 'csv-import' },
      { name: 'ai-processing' },
      { name: 'ai-ingestion' },
    ),
  ],
  providers: [
    CsvImportProcessor,
    AiProcessingProcessor,
    AiIngestionProcessor,
    IngestionEnqueuer,
    IngestionOutboxRepository,
    IngestionOutboxRelay,
    JobStatusService,
    EventPublisherService,
  ],
  exports: [BullModule, JobStatusService, IngestionEnqueuer],
})
export class QueuesModule {}

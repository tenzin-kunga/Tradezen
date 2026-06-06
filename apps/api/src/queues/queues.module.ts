import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CsvImportProcessor } from './csv-import.processor';
import { AiProcessingProcessor } from './ai-processing.processor';
import { JobStatusService } from './job-status.service';
import { EventPublisherService } from '../common/services/event-publisher.service';
import { getRedisConnection } from '../common/utils/redis-connection';

@Module({
  imports: [
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    BullModule.registerQueue({ name: 'csv-import' }, { name: 'ai-processing' }),
  ],
  providers: [
    CsvImportProcessor,
    AiProcessingProcessor,
    JobStatusService,
    EventPublisherService,
  ],
  exports: [BullModule, JobStatusService],
})
export class QueuesModule {}

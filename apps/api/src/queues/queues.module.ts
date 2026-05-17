import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CsvImportProcessor } from './csv-import.processor';
import { AiProcessingProcessor } from './ai-processing.processor';
import { JobStatusService } from './job-status.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
      },
    }),
    BullModule.registerQueue(
      { name: 'csv-import' },
      { name: 'ai-processing' },
    ),
  ],
  providers: [CsvImportProcessor, AiProcessingProcessor, JobStatusService],
  exports: [BullModule, JobStatusService],
})
export class QueuesModule {}

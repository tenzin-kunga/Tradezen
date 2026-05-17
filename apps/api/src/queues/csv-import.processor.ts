import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('csv-import')
export class CsvImportProcessor extends WorkerHost {
  private readonly logger = new Logger('CsvImportProcessor');

  async process(job: Job): Promise<unknown> {
    this.logger.log(`Processing job ${job.id}: ${job.name}`);
    return { status: 'placeholder' };
  }
}

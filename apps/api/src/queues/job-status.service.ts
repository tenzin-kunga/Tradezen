import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobState } from 'bullmq';

export interface JobStatus {
  id: string;
  name: string;
  progress: number;
  state: JobState | 'unknown';
  data: Record<string, unknown>;
  result?: unknown;
  failedReason?: string;
  processedOn?: number;
  finishedOn?: number;
}

@Injectable()
export class JobStatusService {
  private readonly logger = new Logger('JobStatus');

  constructor(
    @InjectQueue('csv-import') private csvQueue: Queue,
    @InjectQueue('ai-processing') private aiQueue: Queue,
  ) {}

  async getJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<JobStatus | null> {
    const queue = queueName === 'csv-import' ? this.csvQueue : this.aiQueue;
    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      id: job.id!,
      name: job.name,
      progress: job.progress as number,
      state,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  async getJobHistory(queueName: string, limit = 10): Promise<JobStatus[]> {
    const queue = queueName === 'csv-import' ? this.csvQueue : this.aiQueue;
    const jobs = await queue.getJobs(['completed', 'failed'], 0, limit - 1);
    return Promise.all(
      jobs.map(async (job) => {
        const state = await job.getState();
        return {
          id: job.id!,
          name: job.name,
          progress: job.progress as number,
          state,
          data: job.data,
          result: job.returnvalue,
          failedReason: job.failedReason,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
        };
      }),
    );
  }
}

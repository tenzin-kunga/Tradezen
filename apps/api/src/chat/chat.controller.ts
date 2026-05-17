import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Queue } from 'bullmq';
import type { Request, Response } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { JobStatusService } from '../queues/job-status.service';

@ApiTags('chat')
@ApiBearerAuth()
@Throttle({ default: { limit: 20, ttl: 60000 } })
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    @InjectQueue('ai-processing') private aiQueue: Queue,
    private readonly jobStatusService: JobStatusService,
  ) {}

  @Get('models')
  @ApiOperation({ summary: 'Get configured OpenRouter models' })
  models() {
    return this.chatService.getModels();
  }

  @Post('stream')
  @ApiOperation({ summary: 'Stream chat completions via OpenRouter' })
  async stream(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateChatDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const abortController = new AbortController();
    const onClientClose = () => abortController.abort();
    req.on('close', onClientClose);

    const writeEvent = (event: string, data: string) => {
      if (res.writableEnded) return;
      res.write(`event: ${event}\n`);
      res.write(`data: ${data}\n\n`);
    };

    try {
      await this.chatService.streamChat(userId, dto, abortController.signal, {
        onToken: (token) => writeEvent('token', token),
        onDone: () => writeEvent('done', '[DONE]'),
      });
      if (!res.writableEnded) res.end();
    } catch (error) {
      if (abortController.signal.aborted) {
        if (!res.writableEnded) res.end();
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Chat request failed';
      writeEvent('error', message);
      if (!res.writableEnded) res.end();
    } finally {
      req.off('close', onClientClose);
    }
  }

  @Post('jobs/summarize-journals')
  @ApiOperation({ summary: 'Start journal summarization job' })
  async summarizeJournals(
    @CurrentUser('id') userId: string,
    @Body('dateFrom') dateFrom: string,
    @Body('dateTo') dateTo: string,
  ) {
    const job = await this.aiQueue.add('journal-summarize', {
      userId,
      dateFrom,
      dateTo,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    });

    return { jobId: job.id!, message: 'Journal summarization started.' };
  }

  @Post('jobs/pattern-analysis')
  @ApiOperation({ summary: 'Start trade pattern analysis job' })
  async patternAnalysis(
    @CurrentUser('id') userId: string,
    @Body('days') days?: number,
  ) {
    const job = await this.aiQueue.add('pattern-analysis', {
      userId,
      days: days || 30,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    });

    return { jobId: job.id!, message: 'Pattern analysis started.' };
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get AI job status by ID' })
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.jobStatusService.getJobStatus('ai-processing', jobId);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get AI job history' })
  async getJobHistory(@Query('limit') limit?: string) {
    return this.jobStatusService.getJobHistory('ai-processing', parseInt(limit ?? '10') || 10);
  }
}

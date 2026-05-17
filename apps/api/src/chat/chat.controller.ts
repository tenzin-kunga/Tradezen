import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Queue } from 'bullmq';
import type { Request, Response } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChatService } from './chat.service';
import { ChatThreadService } from './chat-thread.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { JobStatusService } from '../queues/job-status.service';
import { JournalIntelligenceService } from '../ai/journal-intelligence.service';

@ApiTags('chat')
@ApiBearerAuth()
@Throttle({ default: { limit: 20, ttl: 60000 } })
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly threadService: ChatThreadService,
    private readonly journalIntelligenceService: JournalIntelligenceService,
    @InjectQueue('ai-processing') private aiQueue: Queue,
    private readonly jobStatusService: JobStatusService,
  ) {}

  @Get('models')
  @ApiOperation({ summary: 'Get configured OpenRouter models' })
  models() {
    return this.chatService.getModels();
  }

  @Post('threads')
  @ApiOperation({ summary: 'Create a new chat thread' })
  async createThread(
    @CurrentUser('id') userId: string,
    @Body('title') title?: string,
  ) {
    return this.threadService.createThread(userId, title);
  }

  @Get('threads')
  @ApiOperation({ summary: 'List user chat threads' })
  async listThreads(@CurrentUser('id') userId: string) {
    return this.threadService.listThreads(userId);
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Get a chat thread by ID' })
  async getThread(
    @CurrentUser('id') userId: string,
    @Param('id') threadId: string,
  ) {
    const thread = await this.threadService.getThread(userId, threadId);
    if (!thread) throw new NotFoundException('Thread not found');
    return thread;
  }

  @Delete('threads/:id')
  @ApiOperation({ summary: 'Delete a chat thread' })
  async deleteThread(
    @CurrentUser('id') userId: string,
    @Param('id') threadId: string,
  ) {
    return this.threadService.deleteThread(userId, threadId);
  }

  @Get('threads/:id/messages')
  @ApiOperation({ summary: 'Get messages for a chat thread' })
  async getMessages(@Param('id') threadId: string) {
    return this.threadService.getMessages(threadId);
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
    const job = await this.aiQueue.add(
      'journal-summarize',
      {
        userId,
        dateFrom,
        dateTo,
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      },
    );

    return { jobId: job.id!, message: 'Journal summarization started.' };
  }

  @Post('jobs/pattern-analysis')
  @ApiOperation({ summary: 'Start trade pattern analysis job' })
  async patternAnalysis(
    @CurrentUser('id') userId: string,
    @Body('days') days?: number,
  ) {
    const job = await this.aiQueue.add(
      'pattern-analysis',
      {
        userId,
        days: days || 30,
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      },
    );

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
    return this.jobStatusService.getJobHistory(
      'ai-processing',
      parseInt(limit ?? '10') || 10,
    );
  }

  @Post('ai/analyze-journals')
  @ApiOperation({ summary: 'Analyze trading journals with AI' })
  async analyzeJournals(
    @CurrentUser('id') userId: string,
    @Body('dateFrom') dateFrom: string,
    @Body('dateTo') dateTo: string,
  ) {
    return this.journalIntelligenceService.analyzeJournals(userId, dateFrom, dateTo);
  }

  @Get('ai/insights')
  @ApiOperation({ summary: 'Get AI-generated insights' })
  async getInsights(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.journalIntelligenceService.getInsights(userId, type, limit ? parseInt(limit) : 10);
  }
}

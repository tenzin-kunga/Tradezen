import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
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
import { Public } from '../auth/public.decorator';
import { ChatService } from './chat.service';
import { ChatThreadService } from './chat-thread.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { JobStatusService } from '../queues/job-status.service';
import { JournalIntelligenceService } from '../ai/journal-intelligence.service';
import { CoachingEngineService } from '../ai/coaching-engine.service';
import { NotificationService } from '../common/services/notification.service';
import { ContextBuilderService } from '../ai/context/context-builder.service';
import { SemanticMetricsService } from '../ai/context/semantic/semantic-metrics.service';

@ApiTags('chat')
@ApiBearerAuth()
@Throttle({ default: { limit: 20, ttl: 60000 } })
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly threadService: ChatThreadService,
    private readonly journalIntelligenceService: JournalIntelligenceService,
    private readonly coachingEngineService: CoachingEngineService,
    private readonly notificationService: NotificationService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly metricsService: SemanticMetricsService,
    @InjectQueue('ai-processing') private aiQueue: Queue,
    private readonly jobStatusService: JobStatusService,
  ) {}

  @Get('models')
  @ApiOperation({
    summary: 'Get configured chat models (proxied from AI service)',
  })
  async models(
    @CurrentUser('id') userId: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.chatService.getModelsV2(userId, refresh === 'true');
  }

  @Public()
  @Get('models/providers')
  @ApiOperation({
    summary: 'Get provider health status (proxied from AI service)',
  })
  async modelProviders() {
    return this.chatService.getProviderHealth();
  }

  @Post('models/refresh')
  @ApiOperation({ summary: 'Force re-discovery of models from all providers' })
  async refreshModels() {
    return this.chatService.refreshModels();
  }

  @Post('models/providers')
  @ApiOperation({ summary: 'Add a custom model provider' })
  async addProvider(
    @Body()
    body: {
      name: string;
      baseUrl: string;
      apiKey?: string;
      models: string[];
    },
  ) {
    return this.chatService.addProvider(body);
  }

  @Delete('models/providers/:id')
  @ApiOperation({ summary: 'Remove a custom model provider' })
  removeProvider(@Param('id') id: string) {
    return this.chatService.removeProvider(id);
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

  @Get('threads/search')
  @ApiOperation({ summary: 'Search chat threads' })
  async searchThreads(
    @CurrentUser('id') userId: string,
    @Query('q') query: string,
  ) {
    return this.threadService.searchThreads(userId, query || '');
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

  @Patch('threads/:id')
  @ApiOperation({ summary: 'Update a chat thread title' })
  async updateThreadTitle(
    @CurrentUser('id') userId: string,
    @Param('id') threadId: string,
    @Body('title') title: string,
  ) {
    return this.threadService.updateThreadTitle(userId, threadId, title);
  }

  @Patch('threads/:id/pin')
  @ApiOperation({ summary: 'Toggle pin on a chat thread' })
  async togglePin(
    @CurrentUser('id') userId: string,
    @Param('id') threadId: string,
  ) {
    return this.threadService.togglePin(userId, threadId);
  }

  @Get('threads/:id/messages')
  @ApiOperation({ summary: 'Get messages for a chat thread' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('id') threadId: string,
  ) {
    return this.threadService.getMessages(threadId, userId);
  }

  @Get('context-preview')
  @ApiOperation({ summary: 'Preview what context the AI would receive' })
  async contextPreview(@CurrentUser('id') userId: string, @Query() query: any) {
    return this.contextBuilder.previewContext(userId, query);
  }

  @Get('semantic/metrics')
  @ApiOperation({ summary: 'Get semantic subsystem metrics' })
  semanticMetrics() {
    return this.metricsService.getMetrics();
  }

  @Post('stream')
  @ApiOperation({ summary: 'Stream chat completions via the cloud provider' })
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
        onToolStatus: (event) => {
          writeEvent('tool_status', JSON.stringify(event));
          if (event.suggestedActions?.length) {
            writeEvent('actions', JSON.stringify(event.suggestedActions));
          }
        },
        onDone: () => writeEvent('done', '[DONE]'),
        onResponseReformatted: (markdown) =>
          writeEvent('response_reformatted', JSON.stringify(markdown)),
        onUsage: (usage) => writeEvent('usage', JSON.stringify(usage)),
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
    return this.journalIntelligenceService.analyzeJournals(
      userId,
      dateFrom,
      dateTo,
    );
  }

  @Get('ai/insights')
  @ApiOperation({ summary: 'Get AI-generated insights' })
  async getInsights(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.journalIntelligenceService.getInsights(
      userId,
      type,
      limit ? parseInt(limit) : 10,
    );
  }

  @Post('ai/coaching/evaluate')
  @ApiOperation({ summary: 'Evaluate and generate AI coaching' })
  async evaluateCoaching(@CurrentUser('id') userId: string) {
    return this.coachingEngineService.evaluateAndCoach(userId);
  }

  @Get('ai/coaching/history')
  @ApiOperation({ summary: 'Get coaching session history' })
  async getCoachingHistory(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.coachingEngineService.getCoachingHistory(
      userId,
      parseInt(limit ?? '10') || 10,
    );
  }

  @Get('ai/coaching/active')
  @ApiOperation({ summary: 'Get latest active coaching recommendation' })
  async getActiveCoaching(@CurrentUser('id') userId: string) {
    return this.coachingEngineService.getActiveCoaching(userId);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get unread notifications' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.getUnread(
      userId,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    await this.notificationService.markRead(userId, notificationId);
    return { message: 'Notification marked as read' };
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser('id') userId: string) {
    await this.notificationService.markAllRead(userId);
    return { message: 'All notifications marked as read' };
  }

  @Get('notifications/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getNotificationCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationService.getCount(userId);
    return { count };
  }

  @Get('notifications/preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getNotificationPreferences(@CurrentUser('id') userId: string) {
    return this.notificationService.getPreferences(userId);
  }

  @Put('notifications/preferences')
  @ApiOperation({ summary: 'Update notification preference' })
  async updateNotificationPreference(
    @CurrentUser('id') userId: string,
    @Body('type') type: string,
    @Body('enabled') enabled: boolean,
  ) {
    await this.notificationService.updatePreference(userId, type, enabled);
    return { message: 'Preference updated' };
  }
}

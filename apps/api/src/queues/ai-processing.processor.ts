import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { journals, trades } from '@tradezen/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { EventPublisherService } from '../common/services/event-publisher.service';
import { UserSettingsService } from '../user-settings/user-settings.service';

interface JournalSummarizeJobData {
  userId: string;
  dateFrom: string;
  dateTo: string;
}

interface PatternAnalysisJobData {
  userId: string;
  days: number;
}

@Processor('ai-processing')
export class AiProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger('AiProcessingProcessor');

  constructor(
    private readonly eventPublisher: EventPublisherService,
    private readonly userSettings: UserSettingsService,
  ) {
    super();
  }

  private async emitJobEvent(
    userId: string,
    jobId: string,
    event: string,
    payload: unknown,
  ) {
    await this.eventPublisher.publish(`jobs:${userId}`, [event, payload]);
  }

  private async updateJobProgress(
    job: Job,
    userId: string,
    progress: Record<string, unknown>,
  ) {
    await job.updateProgress(progress);
    await this.emitJobEvent(userId, String(job.id), 'job:progress', {
      jobId: job.id,
      queue: 'ai-processing',
      progress,
    });
  }

  async process(
    job: Job<JournalSummarizeJobData | PatternAnalysisJobData>,
  ): Promise<unknown> {
    if (job.name === 'journal-summarize') {
      return this.summarizeJournals(job as Job<JournalSummarizeJobData>);
    }
    if (job.name === 'pattern-analysis') {
      return this.analyzePatterns(job as Job<PatternAnalysisJobData>);
    }
    throw new Error(`Unknown job type: ${job.name}`);
  }

  private async summarizeJournals(
    job: Job<JournalSummarizeJobData>,
  ): Promise<{ summary: string; journalCount: number }> {
    const { userId, dateFrom, dateTo } = job.data;
    this.logger.log(
      `Summarizing journals for user ${userId}: ${dateFrom} to ${dateTo}`,
    );

    const journalRows = await db
      .select()
      .from(journals)
      .where(
        and(
          eq(journals.userId, userId),
          gte(journals.date, dateFrom),
          lte(journals.date, dateTo),
        ),
      );

    if (journalRows.length === 0) {
      const result = {
        summary: 'No journals found for the specified date range.',
        journalCount: 0,
      };
      await this.emitJobEvent(userId, String(job.id), 'job:completed', {
        jobId: job.id,
        queue: 'ai-processing',
        result,
      });
      return result;
    }

    await this.updateJobProgress(job, userId, {
      stage: 'building_prompt',
      total: journalRows.length,
    });

    const prompt = this.buildSummarizationPrompt(journalRows);
    const summary = await this.callCloud(userId, prompt);

    this.logger.log(
      `Journal summarization complete: ${journalRows.length} journals`,
    );
    const result = { summary, journalCount: journalRows.length };
    await this.emitJobEvent(userId, String(job.id), 'job:completed', {
      jobId: job.id,
      queue: 'ai-processing',
      result,
    });
    return result;
  }

  private async analyzePatterns(
    job: Job<PatternAnalysisJobData>,
  ): Promise<{ insights: string[] }> {
    const { userId, days } = job.data;
    this.logger.log(`Analyzing patterns for user ${userId}: last ${days} days`);

    const tradeRows = await db
      .select()
      .from(trades)
      .where(
        and(
          eq(trades.userId, userId),
          gte(trades.tradeDate, new Date(Date.now() - days * 86400000)),
        ),
      );

    if (tradeRows.length < 10) {
      const result = {
        insights: ['Not enough trades for pattern analysis (minimum 10).'],
      };
      await this.emitJobEvent(userId, String(job.id), 'job:completed', {
        jobId: job.id,
        queue: 'ai-processing',
        result,
      });
      return result;
    }

    await this.updateJobProgress(job, userId, {
      stage: 'analyzing',
      total: tradeRows.length,
    });

    const prompt = this.buildPatternAnalysisPrompt(tradeRows);
    const response = await this.callCloud(userId, prompt);
    const insights = this.parseInsights(response);

    this.logger.log(`Pattern analysis complete: ${insights.length} insights`);
    const result = { insights };
    await this.emitJobEvent(userId, String(job.id), 'job:completed', {
      jobId: job.id,
      queue: 'ai-processing',
      result,
    });
    return result;
  }

  private buildSummarizationPrompt(journalRows: any[]): string {
    const content = journalRows
      .map(
        (j) =>
          `Date: ${j.date}\nPre-market: ${j.preMarketNotes || 'N/A'}\nPost-market: ${j.postMarketNotes || 'N/A'}\nMood: ${j.mood || 'N/A'}\nLessons: ${j.lessons || 'N/A'}`,
      )
      .join('\n\n---\n\n');

    return `You are a trading journal analyst. Summarize the following journal entries into key insights, patterns, and actionable recommendations. Keep it concise (max 500 words).\n\n${content}`;
  }

  private buildPatternAnalysisPrompt(tradeRows: any[]): string {
    const stats = this.calculateTradeStats(tradeRows);
    return `You are a trading performance analyst. Analyze the following trading statistics and provide insights on patterns, strengths, weaknesses, and areas for improvement.\n\n${JSON.stringify(stats, null, 2)}`;
  }

  private calculateTradeStats(tradeRows: any[]) {
    const wins = tradeRows.filter((t) => Number(t.pnl) > 0);
    const losses = tradeRows.filter((t) => Number(t.pnl) <= 0);
    const totalPnl = tradeRows.reduce((sum, t) => sum + Number(t.pnl), 0);

    return {
      totalTrades: tradeRows.length,
      winRate:
        tradeRows.length > 0
          ? Math.round((wins.length / tradeRows.length) * 100)
          : 0,
      totalPnl: Math.round(totalPnl * 100) / 100,
      avgWin:
        wins.length > 0
          ? Math.round(
              (wins.reduce((s, t) => s + Number(t.pnl), 0) / wins.length) * 100,
            ) / 100
          : 0,
      avgLoss:
        losses.length > 0
          ? Math.round(
              (losses.reduce((s, t) => s + Number(t.pnl), 0) / losses.length) *
                100,
            ) / 100
          : 0,
      bestTrade: Math.max(...tradeRows.map((t) => Number(t.pnl))),
      worstTrade: Math.min(...tradeRows.map((t) => Number(t.pnl))),
    };
  }

  private async callCloud(userId: string, prompt: string): Promise<string> {
    const creds = await this.userSettings.getDecryptedApiKey(userId);
    const apiKey = creds?.key;
    if (!apiKey) {
      throw new Error(
        'No API key configured for this user. Add one in Settings.',
      );
    }

    const baseUrl = creds?.baseUrl ?? 'https://openrouter.ai/api/v1';
    const model = process.env.CLOUD_DEFAULT_MODEL ?? 'openai/gpt-4o-mini';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Cloud API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content ?? 'No response generated.';
  }

  private parseInsights(response: string): string[] {
    return response
      .split(/\n[\d*\-•]+\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }
}

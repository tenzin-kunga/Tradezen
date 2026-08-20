import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { db } from '../../db/drizzle';
import { journals, trades } from '@tradezen/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { createLLM } from '../langgraph.config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (c): c is { type: string; text: string } =>
          typeof c === 'object' && c !== null && 'text' in c,
      )
      .map((c) => c.text)
      .join('');
  }
  return String(content);
}

interface JournalAnalysisResult {
  sentiment: string;
  patterns: string[];
  insights: string[];
  summary: string;
}

interface CompiledJournalWorkflow {
  invoke(input: Record<string, unknown>): Promise<JournalAnalysisResult>;
}

const JournalAnalysisState = Annotation.Root({
  userId: Annotation<string>,
  dateFrom: Annotation<string>,
  dateTo: Annotation<string>,
  journalEntries: Annotation<(typeof journals.$inferSelect)[]>,
  tradeData: Annotation<(typeof trades.$inferSelect)[]>,
  sentiment: Annotation<string>,
  patterns: Annotation<string[]>,
  insights: Annotation<string[]>,
  summary: Annotation<string>,
});

@Injectable()
export class JournalAnalysisWorkflow {
  private readonly logger = new Logger('JournalAnalysisWorkflow');
  private graph: CompiledJournalWorkflow;

  constructor() {
    const workflow = new StateGraph(JournalAnalysisState)
      .addNode('fetch_data', (state) => this.fetchData(state))
      .addNode('analyze_sentiment', (state) => this.analyzeSentiment(state))
      .addNode('detect_patterns', (state) => this.detectPatterns(state))
      .addNode('generate_insights', (state) => this.generateInsights(state))
      .addNode('compile_summary', (state) => this.compileSummary(state))
      .addEdge('__start__', 'fetch_data')
      .addEdge('fetch_data', 'analyze_sentiment')
      .addEdge('analyze_sentiment', 'detect_patterns')
      .addEdge('detect_patterns', 'generate_insights')
      .addEdge('generate_insights', 'compile_summary')
      .addEdge('compile_summary', END);

    this.graph = workflow.compile();
  }

  async run(userId: string, dateFrom: string, dateTo: string) {
    const result = await this.graph.invoke({
      userId,
      dateFrom,
      dateTo,
      journalEntries: [],
      tradeData: [],
      sentiment: '',
      patterns: [],
      insights: [],
      summary: '',
    });

    return {
      sentiment: result.sentiment,
      patterns: result.patterns,
      insights: result.insights,
      summary: result.summary,
    };
  }

  private async fetchData(state: typeof JournalAnalysisState.State) {
    const dateFrom = new Date(state.dateFrom).toISOString().split('T')[0];
    const dateTo = new Date(state.dateTo).toISOString().split('T')[0];

    const journalRows = await db
      .select()
      .from(journals)
      .where(
        and(
          eq(journals.userId, state.userId),
          gte(journals.date, dateFrom),
          lte(journals.date, dateTo),
        ),
      );

    const tradeRows = await db
      .select()
      .from(trades)
      .where(
        and(
          eq(trades.userId, state.userId),
          gte(trades.tradeDate, new Date(state.dateFrom)),
          lte(trades.tradeDate, new Date(state.dateTo)),
        ),
      );

    return {
      ...state,
      journalEntries: journalRows,
      tradeData: tradeRows,
    };
  }

  private async analyzeSentiment(state: typeof JournalAnalysisState.State) {
    const llm = createLLM(undefined, 0.3);
    const text = state.journalEntries
      .map(
        (j) =>
          `${j.mood || ''} ${j.preMarketNotes || ''} ${j.postMarketNotes || ''}`,
      )
      .join(' ');

    const response = await llm.invoke([
      new SystemMessage(
        'Analyze the emotional sentiment of these trading journal entries. Return one word: positive, neutral, negative, or mixed.',
      ),
      new HumanMessage(text.substring(0, 4000)),
    ]);

    return {
      ...state,
      sentiment: extractText(response.content).trim().toLowerCase(),
    };
  }

  private async detectPatterns(state: typeof JournalAnalysisState.State) {
    const llm = createLLM(undefined, 0.5);
    const journalText = state.journalEntries
      .map(
        (j) =>
          `Date: ${j.date}\nMood: ${j.mood}\nPre: ${j.preMarketNotes}\nPost: ${j.postMarketNotes}\nLessons: ${j.lessons}`,
      )
      .join('\n---\n');

    const response = await llm.invoke([
      new SystemMessage(
        'Identify recurring patterns in these journal entries. Return a JSON array of strings, each describing a pattern. Max 5 patterns.',
      ),
      new HumanMessage(journalText.substring(0, 8000)),
    ]);

    let patterns: string[] = [];
    try {
      patterns = JSON.parse(extractText(response.content)) as string[];
    } catch {
      patterns = extractText(response.content)
        .split('\n')
        .filter((s) => s.trim().length > 10);
    }

    return { ...state, patterns };
  }

  private async generateInsights(state: typeof JournalAnalysisState.State) {
    const llm = createLLM(undefined, 0.5);
    const context = `
Sentiment: ${state.sentiment}
Patterns: ${state.patterns.join(', ')}
Trades: ${state.tradeData.length} total
Win rate: ${this.calculateWinRate(state.tradeData)}%
Total PnL: ${this.calculateTotalPnl(state.tradeData)}
    `;

    const response = await llm.invoke([
      new SystemMessage(
        'Based on the journal patterns and trading performance, generate actionable insights. Return a JSON array of strings. Max 5 insights.',
      ),
      new HumanMessage(context),
    ]);

    let insights: string[] = [];
    try {
      insights = JSON.parse(extractText(response.content)) as string[];
    } catch {
      insights = extractText(response.content)
        .split('\n')
        .filter((s) => s.trim().length > 10);
    }

    return { ...state, insights };
  }

  private async compileSummary(state: typeof JournalAnalysisState.State) {
    const llm = createLLM(undefined, 0.7);
    const context = `
Sentiment: ${state.sentiment}
Patterns: ${state.patterns.join('; ')}
Insights: ${state.insights.join('; ')}
    `;

    const response = await llm.invoke([
      new SystemMessage(
        'Write a concise summary (max 300 words) of the trading journal analysis. Cover sentiment, key patterns, and actionable insights.',
      ),
      new HumanMessage(context),
    ]);

    return { ...state, summary: extractText(response.content) };
  }

  private calculateWinRate(rows: (typeof trades.$inferSelect)[]): number {
    if (rows.length === 0) return 0;
    const wins = rows.filter((t) => Number(t.pnl) > 0).length;
    return Math.round((wins / rows.length) * 100);
  }

  private calculateTotalPnl(rows: (typeof trades.$inferSelect)[]): number {
    return (
      Math.round(rows.reduce((sum, t) => sum + Number(t.pnl), 0) * 100) / 100
    );
  }
}

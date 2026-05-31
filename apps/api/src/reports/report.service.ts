import { Injectable, Logger } from '@nestjs/common';
import { TradesService } from '../trades/trades.service';
import { BehavioralService } from '../analytics/behavioral.service';
import { JournalsService } from '../journals/journals.service';
import { CoachingEngineService } from '../ai/coaching-engine.service';

export interface WeeklyReport {
  period: string;
  summary: {
    totalTrades: number;
    totalPnl: number;
    winRate: number;
    profitFactor: number;
    expectancy: number;
  };
  behavioral: {
    fomoScore: number;
    discipline: number;
    consistency: number;
  };
  coaching: {
    message: string;
    severity: string;
  } | null;
  topInsights: string[];
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger('ReportService');

  constructor(
    private readonly tradesService: TradesService,
    private readonly behavioralService: BehavioralService,
    private readonly journalsService: JournalsService,
    private readonly coachingEngine: CoachingEngineService,
  ) {}

  async generateWeeklyReport(userId: string): Promise<WeeklyReport> {
    const analytics = await this.tradesService.getAnalytics(userId);
    const advanced = await this.tradesService.getAdvancedAnalytics(userId);
    const behavioral = await this.behavioralService.analyzeBehavior(userId);
    const coaching = await this.coachingEngine.getActiveCoaching(userId);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    return {
      period: `${weekAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`,
      summary: {
        totalTrades: (analytics as any).totalTrades,
        totalPnl: (analytics as any).totalPnl,
        winRate: (analytics as any).winRate,
        profitFactor: (analytics as any).profitFactor,
        expectancy: (analytics as any).expectancy,
      },
      behavioral: {
        fomoScore: behavioral.fomo.fomoScore,
        discipline: behavioral.scores.discipline,
        consistency: behavioral.scores.consistency,
      },
      coaching: coaching,
      topInsights: [
        `Win rate: ${(analytics as any).winRate}%`,
        `Best trade: $${(analytics as any).bestTrade}`,
        `Worst trade: $${(analytics as any).worstTrade}`,
        `Current streak: ${(advanced as any).currentStreak?.count || 0} ${(advanced as any).currentStreak?.type || 'none'}`,
        `Sharpe ratio: ${(advanced as any).sharpeRatio}`,
      ],
    };
  }

  async generateCSV(userId: string): Promise<string> {
    const trades = await this.tradesService.findAll(userId, {
      page: 1,
      limit: 10000,
    });
    const items = (trades as any).data || trades;

    const headers = [
      'Date',
      'Symbol',
      'Direction',
      'Entry',
      'Exit',
      'Lot',
      'PnL',
      'Strategy',
      'Notes',
    ];
    const rows = items.map((t: any) => [
      t.tradeDate,
      t.symbol,
      t.direction,
      t.entry,
      t.exit,
      t.lot,
      t.pnl,
      t.strategy || '',
      t.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r: any[]) => r.map((v) => `"${v}"`).join(',')),
    ].join('\n');
    return csvContent;
  }
}

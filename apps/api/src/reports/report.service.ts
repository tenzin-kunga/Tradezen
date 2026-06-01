import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
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

  async generatePDF(userId: string): Promise<Buffer> {
    const report = await this.generateWeeklyReport(userId);
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { summary, behavioral, coaching, period } = report;

      doc.fontSize(20).text('TradeZen — Weekly Report', { align: 'center' });
      doc.fontSize(12).text(period, { align: 'center' }).moveDown(1.5);

      doc.fontSize(14).text('Performance Summary').moveDown(0.5);
      doc.fontSize(10).text(`Total Trades: ${summary.totalTrades}`);
      doc.text(`Total P&L: $${summary.totalPnl.toFixed(2)}`);
      doc.text(`Win Rate: ${summary.winRate}%`);
      doc.text(`Profit Factor: ${summary.profitFactor}`);
      doc.text(`Expectancy: $${summary.expectancy.toFixed(2)}`);
      doc.moveDown(1);

      doc.fontSize(14).text('Behavioral').moveDown(0.5);
      doc.fontSize(10).text(`FOMO Score: ${behavioral.fomoScore}`);
      doc.text(`Discipline: ${behavioral.discipline}`);
      doc.text(`Consistency: ${behavioral.consistency}`);
      doc.moveDown(1);

      if (coaching) {
        doc.fontSize(14).text('Coaching').moveDown(0.5);
        doc.fontSize(10).text(coaching.message);
      }

      doc.moveDown(1);
      doc.fontSize(14).text('Top Insights').moveDown(0.5);
      doc.fontSize(10);
      report.topInsights.forEach((i) => doc.text(`• ${i}`));

      doc.end();
    });
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

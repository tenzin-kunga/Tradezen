import { Injectable } from '@nestjs/common';
import { db } from '../db/drizzle';
import { trades } from '@tradezen/db';
import { eq, and, gte, asc } from 'drizzle-orm';

interface Trade {
  id: string;
  userId: string | null;
  symbol: string;
  pnl: number;
  tradeDate: Date | null;
  entry: number;
  exit: number;
  lot: number;
  stopLoss?: string | null;
  takeProfit?: string | null;
  strategy?: string | null;
  fomoCheck: boolean;
  vengeanceTrade: boolean;
  trendAlignment: boolean;
  createdAt: Date | null;
}

interface FOMOAnalysis {
  flaggedTrades: number;
  noStopLossTrades: number;
  oversizedPositionTrades: number;
  fomoScore: number;
}

interface RevengeTradingAnalysis {
  rapidReentryTrades: number;
  increasingSizeAfterLoss: number;
  frequencySpike: boolean;
  revengeScore: number;
}

interface TimePatternAnalysis {
  byHour: { hour: number; pnl: number; winRate: number; trades: number }[];
  bySession: {
    session: string;
    pnl: number;
    winRate: number;
    trades: number;
  }[];
  bestHour: number;
  worstHour: number;
}

interface BehavioralScores {
  lossChasing: number;
  discipline: number;
  consistency: number;
}

export interface BehavioralReport {
  fomo: FOMOAnalysis;
  revenge: RevengeTradingAnalysis;
  timePatterns: TimePatternAnalysis;
  scores: BehavioralScores;
}

@Injectable()
export class BehavioralService {
  async analyzeBehavior(userId: string, days = 90): Promise<BehavioralReport> {
    const tradeRows = await db
      .select()
      .from(trades)
      .where(
        and(
          eq(trades.userId, userId),
          gte(trades.tradeDate, new Date(Date.now() - days * 86400000)),
        ),
      )
      .orderBy(asc(trades.tradeDate));

    const allTrades = tradeRows.map((r) => ({
      ...r,
      pnl: Number(r.pnl),
      entry: Number(r.entryPrice),
      exit: Number(r.exitPrice),
      lot: Number(r.lotSize),
    })) as Trade[];

    return {
      fomo: this.detectFOMO(allTrades),
      revenge: this.detectRevengeTrading(allTrades),
      timePatterns: this.analyzeTimePatterns(allTrades),
      scores: this.calculateScores(allTrades),
    };
  }

  private detectFOMO(trades: Trade[]): FOMOAnalysis {
    const flaggedTrades = trades.filter((t) => t.fomoCheck).length;
    const noStopLossTrades = trades.filter((t) => !t.stopLoss).length;
    const avgLot =
      trades.reduce((sum, t) => sum + t.lot, 0) / (trades.length || 1);
    const oversizedPositionTrades = trades.filter(
      (t) => t.lot > avgLot * 2,
    ).length;

    const total = trades.length || 1;
    const fomoScore =
      Math.min(
        100,
        Math.round(
          ((flaggedTrades / total) * 40 +
            (noStopLossTrades / total) * 30 +
            (oversizedPositionTrades / total) * 30) *
            100,
        ),
      ) / 100;

    return {
      flaggedTrades,
      noStopLossTrades,
      oversizedPositionTrades,
      fomoScore,
    };
  }

  private detectRevengeTrading(trades: Trade[]): RevengeTradingAnalysis {
    let rapidReentryTrades = 0;
    let increasingSizeAfterLoss = 0;

    for (let i = 1; i < trades.length; i++) {
      const prev = trades[i - 1];
      const curr = trades[i];

      if (Number(prev.pnl) < 0) {
        const timeDiff =
          (new Date(curr.tradeDate ?? curr.createdAt ?? 0).getTime() -
            new Date(prev.tradeDate ?? prev.createdAt ?? 0).getTime()) /
          60000;
        if (timeDiff <= 15) rapidReentryTrades++;
      }

      if (Number(prev.pnl) < 0 && curr.lot > prev.lot) {
        increasingSizeAfterLoss++;
      }
    }

    const daysWithTrades = new Set(
      trades.map((t) =>
        new Date(t.tradeDate ?? t.createdAt ?? 0).toDateString(),
      ),
    ).size;
    const avgDailyTrades = trades.length / (daysWithTrades || 1);
    const maxDailyTrades = this.getMaxDailyTrades(trades);
    const frequencySpike = maxDailyTrades > avgDailyTrades * 3;

    const total = trades.length || 1;
    const revengeScore =
      Math.min(
        100,
        Math.round(
          ((rapidReentryTrades / total) * 40 +
            (increasingSizeAfterLoss / total) * 30 +
            (frequencySpike ? 30 : 0)) *
            100,
        ),
      ) / 100;

    return {
      rapidReentryTrades,
      increasingSizeAfterLoss,
      frequencySpike,
      revengeScore,
    };
  }

  private getMaxDailyTrades(trades: Trade[]): number {
    const dailyCounts = new Map<string, number>();
    for (const t of trades) {
      const key = new Date(t.tradeDate ?? t.createdAt ?? 0).toDateString();
      dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1);
    }
    return Math.max(...dailyCounts.values(), 0);
  }

  private analyzeTimePatterns(trades: Trade[]): TimePatternAnalysis {
    const byHour = new Map<
      number,
      { pnl: number; wins: number; trades: number }
    >();

    for (const t of trades) {
      const hour = new Date(t.tradeDate ?? t.createdAt ?? 0).getUTCHours();
      const existing = byHour.get(hour) || { pnl: 0, wins: 0, trades: 0 };
      existing.pnl += Number(t.pnl);
      existing.trades++;
      if (Number(t.pnl) > 0) existing.wins++;
      byHour.set(hour, existing);
    }

    const byHourArray = Array.from(byHour.entries())
      .map(([hour, data]) => ({
        hour,
        pnl: Math.round(data.pnl * 100) / 100,
        winRate:
          data.trades > 0
            ? Math.round((data.wins / data.trades) * 10000) / 100
            : 0,
        trades: data.trades,
      }))
      .sort((a, b) => a.hour - b.hour);

    const sessions = [
      { name: 'Asian', hours: [0, 1, 2, 3, 4, 5, 6, 7] },
      { name: 'European', hours: [7, 8, 9, 10, 11, 12, 13, 14, 15] },
      { name: 'US', hours: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22] },
    ];

    const bySession = sessions.map((session) => {
      const sessionTrades = trades.filter((t) =>
        session.hours.includes(
          new Date(t.tradeDate ?? t.createdAt ?? 0).getUTCHours(),
        ),
      );
      const pnl = sessionTrades.reduce((sum, t) => sum + Number(t.pnl), 0);
      const wins = sessionTrades.filter((t) => Number(t.pnl) > 0).length;
      return {
        session: session.name,
        pnl: Math.round(pnl * 100) / 100,
        winRate:
          sessionTrades.length > 0
            ? Math.round((wins / sessionTrades.length) * 10000) / 100
            : 0,
        trades: sessionTrades.length,
      };
    });

    const bestHour =
      byHourArray.length > 0
        ? byHourArray.reduce((a, b) => (a.pnl > b.pnl ? a : b)).hour
        : 0;
    const worstHour =
      byHourArray.length > 0
        ? byHourArray.reduce((a, b) => (a.pnl < b.pnl ? a : b)).hour
        : 0;

    return { byHour: byHourArray, bySession, bestHour, worstHour };
  }

  private calculateScores(trades: Trade[]): BehavioralScores {
    const total = trades.length || 1;

    let lossCount = 0;
    for (let i = 1; i < trades.length; i++) {
      if (Number(trades[i - 1].pnl) < 0 && Number(trades[i].pnl) < 0)
        lossCount++;
    }
    const lossChasing =
      Math.min(100, Math.round((lossCount / total) * 200 * 100)) / 100;

    const withStopLoss = trades.filter((t) => t.stopLoss).length;
    const trendAligned = trades.filter((t) => t.trendAlignment).length;
    const discipline =
      Math.round(
        ((withStopLoss / total) * 50 + (trendAligned / total) * 50) * 100,
      ) / 100;

    const withStrategy = trades.filter((t) => t.strategy).length;
    const lowFOMO = trades.filter((t) => !t.fomoCheck).length;
    const consistency =
      Math.round(((withStrategy / total) * 50 + (lowFOMO / total) * 50) * 100) /
      100;

    return { lossChasing, discipline, consistency };
  }
}

import { Injectable } from '@nestjs/common';
import { db } from '../db/drizzle';
import { sql } from 'drizzle-orm';
import { rowsOf } from '../ai/corpus-baseline.service';

export interface PortfolioSummary {
  totalTrades: number;
  realizedPnl: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  fomoTrades: number;
  vengeanceTrades: number;
}

export interface SymbolPosition {
  symbol: string;
  trades: number;
  wins: number;
  realizedPnl: number;
  winRate: number;
  avgPnl: number;
  longs: number;
  shorts: number;
  allocationPct: number;
}

export interface StrategyAttribution {
  strategy: string;
  trades: number;
  realizedPnl: number;
  winRate: number;
}

export interface Portfolio {
  summary: PortfolioSummary;
  symbols: SymbolPosition[];
  strategies: StrategyAttribution[];
  byDirection: { long: number; short: number };
}

interface SymbolRow {
  symbol: string;
  trades: number;
  wins: number;
  realized_pnl: number;
  avg_pnl: number;
  longs: number;
  shorts: number;
}

interface StrategyRow {
  strategy: string;
  trades: number;
  realized_pnl: number;
  wins: number;
}

@Injectable()
export class PortfolioService {
  async getPortfolio(userId: string): Promise<Portfolio> {
    const [summaryRes, symbolsRes, strategiesRes, directionRes] =
      await Promise.all([
        db.execute(sql`
        SELECT
          COUNT(*)::int AS total_trades,
          COALESCE(SUM(pnl), 0)::float8 AS realized_pnl,
          COUNT(*) FILTER (WHERE pnl > 0)::int AS win_count,
          COUNT(*) FILTER (WHERE pnl < 0)::int AS loss_count,
          COALESCE(SUM(pnl) FILTER (WHERE pnl > 0), 0)::float8 AS gross_profit,
          COALESCE(ABS(SUM(pnl) FILTER (WHERE pnl < 0)), 0)::float8 AS gross_loss,
          COALESCE(AVG(pnl) FILTER (WHERE pnl > 0), 0)::float8 AS avg_win,
          COALESCE(AVG(ABS(pnl)) FILTER (WHERE pnl < 0), 0)::float8 AS avg_loss,
          COALESCE(MAX(pnl), 0)::float8 AS best_trade,
          COALESCE(MIN(pnl), 0)::float8 AS worst_trade,
          COUNT(*) FILTER (WHERE fomo_check)::int AS fomo_count,
          COUNT(*) FILTER (WHERE vengeance_trade)::int AS vengeance_count
        FROM trades WHERE user_id = ${userId}
      `),
        db.execute(sql`
        SELECT symbol,
               COUNT(*)::int AS trades,
               COUNT(*) FILTER (WHERE pnl > 0)::int AS wins,
               COALESCE(SUM(pnl), 0)::float8 AS realized_pnl,
               COALESCE(AVG(pnl), 0)::float8 AS avg_pnl,
               COUNT(*) FILTER (WHERE direction = 'long')::int AS longs,
               COUNT(*) FILTER (WHERE direction = 'short')::int AS shorts
        FROM trades WHERE user_id = ${userId}
        GROUP BY symbol
        ORDER BY realized_pnl DESC
      `),
        db.execute(sql`
        SELECT COALESCE(NULLIF(TRIM(COALESCE(strategy, '')), ''), 'No Strategy') AS strategy,
               COUNT(*)::int AS trades,
               COALESCE(SUM(pnl), 0)::float8 AS realized_pnl,
               COUNT(*) FILTER (WHERE pnl > 0)::float8 AS wins
        FROM trades WHERE user_id = ${userId}
        GROUP BY 1
        ORDER BY realized_pnl DESC
      `),
        db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE direction = 'long')::int AS long,
          COUNT(*) FILTER (WHERE direction = 'short')::int AS short
        FROM trades WHERE user_id = ${userId}
      `),
      ]);

    const s = rowsOf(summaryRes)[0] ?? {};
    const totalTrades = Number(s.total_trades ?? 0);
    const grossProfit = Number(s.gross_profit ?? 0);
    const grossLoss = Number(s.gross_loss ?? 0);
    const winCount = Number(s.win_count ?? 0);

    const summary: PortfolioSummary = {
      totalTrades,
      realizedPnl: Number(s.realized_pnl ?? 0),
      winRate: totalTrades ? (winCount / totalTrades) * 100 : 0,
      profitFactor: grossLoss
        ? grossProfit / grossLoss
        : grossProfit
          ? Infinity
          : 0,
      avgWin: Number(s.avg_win ?? 0),
      avgLoss: Number(s.avg_loss ?? 0),
      bestTrade: Number(s.best_trade ?? 0),
      worstTrade: Number(s.worst_trade ?? 0),
      fomoTrades: Number(s.fomo_count ?? 0),
      vengeanceTrades: Number(s.vengeance_count ?? 0),
    };

    const symbolRows = rowsOf(symbolsRes) as unknown as SymbolRow[];
    const totalAbsPnl = symbolRows.reduce(
      (acc, r) => acc + Math.abs(Number(r.realized_pnl ?? 0)),
      0,
    );
    const symbols: SymbolPosition[] = symbolRows.map((r) => {
      const trades = Number(r.trades ?? 0);
      const wins = Number(r.wins ?? 0);
      const pnl = Number(r.realized_pnl ?? 0);
      return {
        symbol: r.symbol,
        trades,
        wins,
        realizedPnl: pnl,
        winRate: trades ? (wins / trades) * 100 : 0,
        avgPnl: trades ? pnl / trades : 0,
        longs: Number(r.longs ?? 0),
        shorts: Number(r.shorts ?? 0),
        allocationPct: totalAbsPnl ? (Math.abs(pnl) / totalAbsPnl) * 100 : 0,
      };
    });

    const strategyRows = rowsOf(strategiesRes) as unknown as StrategyRow[];
    const strategies: StrategyAttribution[] = strategyRows.map((r) => {
      const trades = Number(r.trades ?? 0);
      const wins = Number(r.wins ?? 0);
      return {
        strategy: r.strategy,
        trades,
        realizedPnl: Number(r.realized_pnl ?? 0),
        winRate: trades ? (wins / trades) * 100 : 0,
      };
    });

    const d = rowsOf(directionRes)[0] ?? { long: 0, short: 0 };

    return {
      summary,
      symbols,
      strategies,
      byDirection: { long: Number(d.long ?? 0), short: Number(d.short ?? 0) },
    };
  }
}

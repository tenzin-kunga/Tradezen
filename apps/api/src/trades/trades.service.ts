import { Injectable, NotFoundException } from '@nestjs/common';
import {
  eq,
  and,
  like,
  ilike,
  desc,
  asc,
  sql,
  count,
  lt,
  gte,
  lte,
  inArray,
} from 'drizzle-orm';
import { db } from '../db/drizzle';
import { trades, tags, tradeTags } from '../db/schema';
import { CreateTradeDto, UpdateTradeDto, QueryTradesDto } from './dto';
import { EventPublisherService } from '../common/services/event-publisher.service';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';

const CSV_EXPORT_CHUNK = 500;

export interface StrategyPerformance {
  strategy: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  totalPnl: number;
  avgTradeDuration?: number;
}

export interface TagPerformance {
  tag: string;
  category: string;
  totalTrades: number;
  winRate: number;
  totalPnl: number;
}

export interface StrategyComparison {
  strategyA: StrategyPerformance & { name: string };
  strategyB: StrategyPerformance & { name: string };
  winner: string;
  metrics: {
    winRateDiff: number;
    profitFactorDiff: number;
    expectancyDiff: number;
    pnlDiff: number;
  };
}

function calculateSharpe(dailyReturns: number[], riskFreeRate = 0.05): number {
  if (dailyReturns.length === 0) return 0;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
    dailyReturns.length;
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return ((mean - riskFreeRate / 252) / std) * Math.sqrt(252);
}

function calculateSortino(dailyReturns: number[], riskFreeRate = 0.05): number {
  if (dailyReturns.length === 0) return 0;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const downsideReturns = dailyReturns.filter((r) => r < 0);
  if (downsideReturns.length === 0)
    return dailyReturns.length > 0 ? Infinity : 0;
  const downsideVariance =
    downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) /
    downsideReturns.length;
  const downsideStd = Math.sqrt(downsideVariance);
  if (downsideStd === 0) return 0;
  return ((mean - riskFreeRate / 252) / downsideStd) * Math.sqrt(252);
}

function calculateCalmar(
  totalPnl: number,
  maxDrawdown: number,
  tradingDays: number,
): number {
  if (maxDrawdown === 0 || tradingDays === 0) return 0;
  const annualReturn = (totalPnl / tradingDays) * 252;
  return annualReturn / Math.abs(maxDrawdown);
}

function sampleEquityCurve(cumulativePnl: number[], targetPoints = 100) {
  if (cumulativePnl.length <= targetPoints) return cumulativePnl;
  const step = cumulativePnl.length / targetPoints;
  return Array.from(
    { length: targetPoints },
    (_, i) => cumulativePnl[Math.floor(i * step)],
  );
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

function computeMaxConsecutive(pnls: number[]) {
  let maxConsWins = 0;
  let maxConsLosses = 0;
  let curWins = 0;
  let curLosses = 0;
  for (const p of pnls) {
    if (p > 0) {
      curWins++;
      curLosses = 0;
    } else if (p < 0) {
      curLosses++;
      curWins = 0;
    } else {
      curWins = 0;
      curLosses = 0;
    }
    maxConsWins = Math.max(maxConsWins, curWins);
    maxConsLosses = Math.max(maxConsLosses, curLosses);
  }
  return { maxConsWins, maxConsLosses };
}

@Injectable()
export class TradesService {
  private analyticsCache = new Map<
    string,
    { data: unknown; expiresAt: number }
  >();

  constructor(private readonly eventPublisher: EventPublisherService) {}

  async findAllCursor(userId: string, cursor?: string, limit = 20) {
    const conditions = [eq(trades.userId, userId)];

    if (cursor) {
      conditions.push(lt(trades.createdAt, new Date(cursor)));
    }

    const rows = await db
      .select()
      .from(trades)
      .where(and(...conditions))
      .orderBy(desc(trades.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    const lastItem = items.length > 0 ? items[items.length - 1] : null;
    const nextCursor =
      hasMore && lastItem?.createdAt ? lastItem.createdAt.toISOString() : null;

    return { items, nextCursor, hasMore };
  }
  async create(userId: string, dto: CreateTradeDto) {
    const {
      symbol,
      direction,
      entry,
      exit,
      lot,
      stop_loss = null,
      take_profit = null,
      strategy = null,
      notes = null,
      fomo_check = false,
      trend_alignment = false,
      vengeance_trade = false,
      trade_date = null,
      commission = null,
      contract_size = 100000,
    } = dto;

    const pnl =
      direction === 'buy'
        ? (exit - entry) * lot * contract_size
        : (entry - exit) * lot * contract_size;

    const netPnl = commission ? pnl - commission : pnl;

    const result = await db
      .insert(trades)
      .values({
        userId,
        symbol,
        direction,
        entryPrice: String(entry),
        exitPrice: String(exit),
        lotSize: String(lot),
        pnl: String(netPnl),
        stopLoss: stop_loss !== null ? String(stop_loss) : null,
        takeProfit: take_profit !== null ? String(take_profit) : null,
        strategy,
        notes,
        fomoCheck: fomo_check,
        trendAlignment: trend_alignment,
        vengeanceTrade: vengeance_trade,
        tradeDate: trade_date ? new Date(trade_date) : null,
        commission: commission !== null ? String(commission) : '0',
        contractSize: String(contract_size),
      })
      .returning();

    const trade = result[0];
    await this.eventPublisher.publish(`trades:${userId}`, [
      'trade:created',
      trade,
    ]);
    return trade;
  }

  async findAll(userId: string, query: QueryTradesDto) {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
      symbol,
      direction,
      strategy,
      from,
      to,
    } = query;

    const allowedSorts = ['created_at', 'pnl', 'symbol'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    const conditions = [eq(trades.userId, userId)];

    if (symbol) {
      conditions.push(ilike(trades.symbol, `%${symbol}%`));
    }
    if (direction) {
      conditions.push(eq(trades.direction, direction));
    }
    if (strategy) {
      conditions.push(ilike(trades.strategy, `%${strategy}%`));
    }
    if (from) {
      conditions.push(sql`${trades.createdAt} >= ${from}`);
    }
    if (to) {
      conditions.push(sql`${trades.createdAt} <= ${to}`);
    }

    const whereClause = and(...conditions);

    const countResult = await db
      .select({ count: count() })
      .from(trades)
      .where(whereClause);
    const total = Number(countResult[0]?.count ?? 0);

    const offset = (page - 1) * limit;
    const orderBy =
      safeSort === 'pnl'
        ? safeOrder === 'ASC'
          ? asc(trades.pnl)
          : desc(trades.pnl)
        : safeSort === 'symbol'
          ? safeOrder === 'ASC'
            ? asc(trades.symbol)
            : desc(trades.symbol)
          : safeOrder === 'ASC'
            ? asc(trades.createdAt)
            : desc(trades.createdAt);

    const data = await db
      .select()
      .from(trades)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const result = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)));
    if (!result[0]) throw new NotFoundException(`Trade ${id} not found`);
    return result[0];
  }

  async update(userId: string, id: string, dto: UpdateTradeDto) {
    const currentRes = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)));
    if (!currentRes[0]) throw new NotFoundException(`Trade ${id} not found`);
    const current = currentRes[0];

    const symbol = dto.symbol ?? current.symbol;
    const direction = dto.direction ?? current.direction;
    const entry = dto.entry ?? Number(current.entryPrice);
    const exit = dto.exit ?? Number(current.exitPrice);
    const lot = dto.lot ?? Number(current.lotSize);
    const contract_size =
      dto.contract_size ?? Number(current.contractSize ?? 100000);
    const commission =
      dto.commission !== undefined
        ? dto.commission
        : Number(current.commission ?? 0);

    const pnl =
      direction === 'buy'
        ? (exit - entry) * lot * contract_size
        : (entry - exit) * lot * contract_size;
    const netPnl = commission ? pnl - commission : pnl;

    const updateData: Partial<typeof trades.$inferInsert> = {
      symbol,
      direction,
      entryPrice: String(entry),
      exitPrice: String(exit),
      lotSize: String(lot),
      pnl: String(netPnl),
      stopLoss:
        dto.stop_loss !== undefined
          ? dto.stop_loss !== null
            ? String(dto.stop_loss)
            : null
          : current.stopLoss,
      takeProfit:
        dto.take_profit !== undefined
          ? dto.take_profit !== null
            ? String(dto.take_profit)
            : null
          : current.takeProfit,
      strategy: dto.strategy !== undefined ? dto.strategy : current.strategy,
      notes: dto.notes !== undefined ? dto.notes : current.notes,
      fomoCheck:
        dto.fomo_check !== undefined ? dto.fomo_check : current.fomoCheck,
      trendAlignment:
        dto.trend_alignment !== undefined
          ? dto.trend_alignment
          : current.trendAlignment,
      vengeanceTrade:
        dto.vengeance_trade !== undefined
          ? dto.vengeance_trade
          : current.vengeanceTrade,
      tradeDate:
        dto.trade_date !== undefined
          ? dto.trade_date
            ? new Date(dto.trade_date)
            : null
          : current.tradeDate,
      commission: String(commission),
      contractSize: String(contract_size),
      updatedAt: new Date(),
    };

    const result = await db
      .update(trades)
      .set(updateData)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)))
      .returning();

    if (!result[0]) throw new NotFoundException(`Trade ${id} not found`);
    const updatedTrade = result[0];
    await this.eventPublisher.publish(`trades:${userId}`, [
      'trade:updated',
      updatedTrade,
    ]);
    return updatedTrade;
  }

  async remove(userId: string, id: string) {
    const tradeRes = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)));
    if (!tradeRes[0]) throw new NotFoundException(`Trade ${id} not found`);
    const trade = tradeRes[0];

    await db
      .delete(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)));

    await this.eventPublisher.publish(`trades:${userId}`, [
      'trade:deleted',
      { id },
    ]);

    if (trade.chartImage) {
      const imagePath = path.join(process.cwd(), trade.chartImage);
      try {
        fs.unlinkSync(imagePath);
      } catch {
        // File already deleted or inaccessible — non-fatal
      }
    }

    return { deleted: true };
  }

  async uploadImage(userId: string, id: string, filename: string) {
    const checkRes = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)));
    if (!checkRes[0]) throw new NotFoundException(`Trade ${id} not found`);

    const imageUrl = `/uploads/${filename}`;
    const result = await db
      .update(trades)
      .set({ chartImage: imageUrl })
      .where(and(eq(trades.id, id), eq(trades.userId, userId)))
      .returning();

    return { chart_image: imageUrl };
  }

  async getDailyPnl(userId: string, from?: string, to?: string) {
    const conditions = [eq(trades.userId, userId)];

    if (from) {
      conditions.push(gte(trades.tradeDate, new Date(from)));
    }
    if (to) {
      conditions.push(lte(trades.tradeDate, new Date(to)));
    }

    const result = await db
      .select({
        date: trades.tradeDate,
        totalPnl: sql<number>`SUM(${trades.pnl})`,
        tradeCount: count(),
        wins: sql<number>`COUNT(*) FILTER (WHERE ${trades.pnl} > 0)`,
        losses: sql<number>`COUNT(*) FILTER (WHERE ${trades.pnl} < 0)`,
      })
      .from(trades)
      .where(and(...conditions))
      .groupBy(trades.tradeDate)
      .orderBy(desc(trades.tradeDate));

    return result;
  }

  async getAnalytics(userId: string) {
    const cacheKey = `analytics:${userId}`;
    const cached = this.analyticsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const [
      summaryRes,
      maxDdRes,
      avgRrRes,
      pnlSeriesRes,
      strategyRes,
      dowRes,
      monthRes,
    ] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total_trades,
          COALESCE(SUM(pnl), 0)::float8 AS total_pnl,
          COUNT(*) FILTER (WHERE pnl > 0)::int AS win_count,
          COUNT(*) FILTER (WHERE pnl < 0)::int AS loss_count,
          COALESCE(SUM(pnl) FILTER (WHERE pnl > 0), 0)::float8 AS gross_profit,
          COALESCE(ABS(SUM(pnl) FILTER (WHERE pnl < 0)), 0)::float8 AS gross_loss,
          COALESCE(MAX(pnl), 0)::float8 AS best_trade,
          COALESCE(MIN(pnl), 0)::float8 AS worst_trade,
          COALESCE(AVG(pnl) FILTER (WHERE pnl > 0), 0)::float8 AS avg_win,
          COALESCE(AVG(ABS(pnl)) FILTER (WHERE pnl < 0), 0)::float8 AS avg_loss,
          COUNT(*) FILTER (WHERE fomo_check)::int AS fomo_count,
          COUNT(*) FILTER (WHERE vengeance_trade)::int AS vengeance_count,
          COUNT(*) FILTER (WHERE trend_alignment)::int AS trend_aligned_count
        FROM trades WHERE user_id = ${userId}
      `),
      db.execute(sql`
        WITH ordered AS (
          SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn,
                 pnl::float8 AS pnl
          FROM trades WHERE user_id = ${userId}
        ),
        cum AS (
          SELECT rn, SUM(pnl) OVER (ORDER BY rn) AS eq FROM ordered
        ),
        peaked AS (
          SELECT eq, MAX(eq) OVER (ORDER BY rn ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS peak
          FROM cum
        )
        SELECT COALESCE(MAX(peak - eq), 0)::float8 AS max_drawdown FROM peaked
      `),
      db.execute(sql`
        SELECT COALESCE(AVG(
          ABS(take_profit - entry_price) / NULLIF(ABS(entry_price - stop_loss), 0)
        ), 0)::float8 AS avg_rr
        FROM trades
        WHERE user_id = ${userId}
          AND stop_loss IS NOT NULL
          AND take_profit IS NOT NULL
      `),
      db.execute(sql`
        SELECT pnl::float8 AS pnl FROM trades WHERE user_id = ${userId} ORDER BY created_at ASC, id ASC LIMIT 1000
      `),
      db.execute(sql`
        SELECT COALESCE(NULLIF(TRIM(COALESCE(strategy, '')), ''), 'No Strategy') AS name,
               COUNT(*)::int AS trades,
               COUNT(*) FILTER (WHERE pnl > 0)::int AS wins,
               COALESCE(SUM(pnl), 0)::float8 AS pnl
        FROM trades WHERE user_id = ${userId}
        GROUP BY 1
        ORDER BY pnl DESC
      `),
      db.execute(sql`
        SELECT EXTRACT(DOW FROM created_at)::int AS dow,
               COUNT(*)::int AS trades,
               COUNT(*) FILTER (WHERE pnl > 0)::int AS wins,
               COALESCE(SUM(pnl), 0)::float8 AS pnl
        FROM trades WHERE user_id = ${userId}
        GROUP BY 1
        ORDER BY 1
      `),
      db.execute(sql`
        SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
               COUNT(*)::int AS trades,
               COUNT(*) FILTER (WHERE pnl > 0)::int AS wins,
               COALESCE(SUM(pnl), 0)::float8 AS pnl
        FROM trades WHERE user_id = ${userId}
        GROUP BY 1
        ORDER BY 1
      `),
    ]);

    const s = summaryRes[0] as any;
    const totalTrades = Number(s?.total_trades ?? 0);
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        totalPnl: 0,
        winRate: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        expectancy: 0,
        maxConsecutiveWins: 0,
        maxConsecutiveLosses: 0,
        maxDrawdown: 0,
        bestTrade: 0,
        worstTrade: 0,
        avgRR: 0,
        byStrategy: [],
        byDayOfWeek: [],
        byMonth: [],
        behavioralStats: {
          fomoCount: 0,
          vengeanceCount: 0,
          trendAlignedCount: 0,
        },
      };
    }

    const grossProfit = Number(s.gross_profit);
    const grossLoss = Number(s.gross_loss);
    const winRateRatio =
      totalTrades > 0 ? Number(s.win_count) / totalTrades : 0;
    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999999 : 0;
    const avgWin = Number(s.avg_win);
    const avgLoss = Number(s.avg_loss);
    const expectancy = winRateRatio * avgWin - (1 - winRateRatio) * avgLoss;

    const pnls = pnlSeriesRes.map((r: any) => Number(r.pnl));
    const { maxConsWins, maxConsLosses } = computeMaxConsecutive(pnls);

    const maxDrawdown = Number((maxDdRes[0] as any)?.max_drawdown ?? 0);
    const avgRR = Number((avgRrRes[0] as any)?.avg_rr ?? 0);

    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const byStrategy = (strategyRes as any[]).map((r: any) => ({
      name: r.name,
      trades: Number(r.trades),
      winRate: Number(r.trades) > 0 ? Number(r.wins) / Number(r.trades) : 0,
      pnl: Number(r.pnl),
    }));
    const byDayOfWeek = (dowRes as any[]).map((r: any) => ({
      day: dayNames[Number(r.dow) % 7],
      trades: Number(r.trades),
      winRate: Number(r.trades) > 0 ? Number(r.wins) / Number(r.trades) : 0,
      pnl: Number(r.pnl),
    }));
    const byMonth = (monthRes as any[]).map((r: any) => ({
      month: r.month,
      trades: Number(r.trades),
      winRate: Number(r.trades) > 0 ? Number(r.wins) / Number(r.trades) : 0,
      pnl: Number(r.pnl),
    }));

    const totalPnl = Number(s.total_pnl);
    const bestTrade = Number(s.best_trade);
    const worstTrade = Number(s.worst_trade);

    const result = {
      totalTrades,
      totalPnl: Math.round(totalPnl * 100) / 100,
      winRate: Math.round(winRateRatio * 10000) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      expectancy: Math.round(expectancy * 100) / 100,
      maxConsecutiveWins: maxConsWins,
      maxConsecutiveLosses: maxConsLosses,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      bestTrade: Math.round(bestTrade * 100) / 100,
      worstTrade: Math.round(worstTrade * 100) / 100,
      avgRR: Math.round(avgRR * 100) / 100,
      byStrategy,
      byDayOfWeek,
      byMonth,
      behavioralStats: {
        fomoCount: Number(s.fomo_count ?? 0),
        vengeanceCount: Number(s.vengeance_count ?? 0),
        trendAlignedCount: Number(s.trend_aligned_count ?? 0),
      },
    };

    this.analyticsCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return result;
  }

  async getAdvancedAnalytics(userId: string) {
    const [tradesRes, maxDdRes] = await Promise.all([
      db.execute(sql`
        SELECT pnl::float8 AS pnl, symbol, direction, trade_date, created_at
        FROM trades WHERE user_id = ${userId}
        ORDER BY created_at ASC, id ASC
      `),
      db.execute(sql`
        WITH ordered AS (
          SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn,
                 pnl::float8 AS pnl
          FROM trades WHERE user_id = ${userId}
        ),
        cum AS (
          SELECT rn, SUM(pnl) OVER (ORDER BY rn) AS eq FROM ordered
        ),
        peaked AS (
          SELECT eq, MAX(eq) OVER (ORDER BY rn ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS peak
          FROM cum
        )
        SELECT COALESCE(MAX(peak - eq), 0)::float8 AS max_drawdown FROM peaked
      `),
    ]);

    const allTrades = tradesRes as any[];
    if (allTrades.length === 0) {
      return {
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        currentStreak: { type: 'none' as const, count: 0 },
        equityCurve: [],
        topSymbols: [],
        bottomSymbols: [],
        winRateByDirection: {
          buy: { rate: 0, count: 0 },
          sell: { rate: 0, count: 0 },
        },
      };
    }

    const pnls = allTrades.map((t) => Number(t.pnl));
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const maxDrawdown = Number((maxDdRes[0] as any)?.max_drawdown ?? 0);

    const dailyReturns = pnls.map((pnl) => {
      const prevEquity = pnls
        .slice(0, pnls.indexOf(pnl))
        .reduce((a, b) => a + b, 0);
      return prevEquity !== 0 ? pnl / prevEquity : 0;
    });

    const sharpeRatio = calculateSharpe(dailyReturns);
    const sortinoRatio = calculateSortino(dailyReturns);

    const tradingDays =
      new Set(
        allTrades
          .filter((t) => t.trade_date)
          .map((t) => new Date(t.trade_date).toDateString()),
      ).size || allTrades.length;

    const calmarRatio = calculateCalmar(totalPnl, maxDrawdown, tradingDays);

    let streakType: 'win' | 'loss' | 'none' = 'none';
    let streakCount = 0;
    for (let i = pnls.length - 1; i >= 0; i--) {
      if (pnls[i] > 0) {
        if (streakType === 'none') streakType = 'win';
        if (streakType === 'win') streakCount++;
        else break;
      } else if (pnls[i] < 0) {
        if (streakType === 'none') streakType = 'loss';
        if (streakType === 'loss') streakCount++;
        else break;
      }
    }

    const cumulativePnl: number[] = [];
    let running = 0;
    for (const p of pnls) {
      running += p;
      cumulativePnl.push(running);
    }

    const sampledCurve = sampleEquityCurve(cumulativePnl, 100);
    const startDate = allTrades[0]?.trade_date || allTrades[0]?.created_at;
    const endDate =
      allTrades[allTrades.length - 1]?.trade_date ||
      allTrades[allTrades.length - 1]?.created_at;
    const equityCurve = sampledCurve.map((value, i) => ({
      date: new Date(
        new Date(startDate).getTime() +
          ((new Date(endDate).getTime() - new Date(startDate).getTime()) * i) /
            (sampledCurve.length - 1 || 1),
      )
        .toISOString()
        .split('T')[0],
      value: Math.round(value * 100) / 100,
    }));

    const symbolMap = new Map<string, { pnl: number; trades: number }>();
    for (const t of allTrades) {
      const sym = t.symbol || 'Unknown';
      const existing = symbolMap.get(sym) || { pnl: 0, trades: 0 };
      existing.pnl += Number(t.pnl);
      existing.trades++;
      symbolMap.set(sym, existing);
    }

    const sortedSymbols = Array.from(symbolMap.entries())
      .map(([symbol, data]) => ({
        symbol,
        pnl: Math.round(data.pnl * 100) / 100,
        trades: data.trades,
      }))
      .sort((a, b) => b.pnl - a.pnl);

    const topSymbols = sortedSymbols.slice(0, 5);
    const bottomSymbols = sortedSymbols.slice(-5).reverse();

    const buyTrades = allTrades.filter((t) => t.direction === 'buy');
    const sellTrades = allTrades.filter((t) => t.direction === 'sell');

    const buyWins = buyTrades.filter((t) => Number(t.pnl) > 0).length;
    const sellWins = sellTrades.filter((t) => Number(t.pnl) > 0).length;

    const winRateByDirection = {
      buy: {
        rate:
          buyTrades.length > 0
            ? Math.round((buyWins / buyTrades.length) * 10000) / 100
            : 0,
        count: buyTrades.length,
      },
      sell: {
        rate:
          sellTrades.length > 0
            ? Math.round((sellWins / sellTrades.length) * 10000) / 100
            : 0,
        count: sellTrades.length,
      },
    };

    return {
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      sortinoRatio:
        sortinoRatio === Infinity
          ? 999999
          : Math.round(sortinoRatio * 100) / 100,
      calmarRatio: Math.round(calmarRatio * 100) / 100,
      currentStreak: { type: streakType, count: streakCount },
      equityCurve,
      topSymbols,
      bottomSymbols,
      winRateByDirection,
    };
  }

  async getStrategyAnalytics(userId: string): Promise<{
    byStrategy: StrategyPerformance[];
    bestStrategy: string;
    worstStrategy: string;
  }> {
    const tradeRows = await db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId));

    const strategyMap = new Map<string, typeof tradeRows>();
    for (const t of tradeRows) {
      const strat = t.strategy || 'Unknown';
      if (!strategyMap.has(strat)) strategyMap.set(strat, []);
      strategyMap.get(strat)!.push(t);
    }

    const byStrategy: StrategyPerformance[] = [];
    for (const [strategy, stratTrades] of strategyMap) {
      const wins = stratTrades.filter((t) => Number(t.pnl) > 0);
      const losses = stratTrades.filter((t) => Number(t.pnl) <= 0);
      const totalPnl = stratTrades.reduce((sum, t) => sum + Number(t.pnl), 0);
      const grossProfit = wins.reduce((sum, t) => sum + Number(t.pnl), 0);
      const grossLoss = Math.abs(
        losses.reduce((sum, t) => sum + Number(t.pnl), 0),
      );

      byStrategy.push({
        strategy,
        totalTrades: stratTrades.length,
        winRate:
          stratTrades.length > 0
            ? Math.round((wins.length / stratTrades.length) * 10000) / 100
            : 0,
        profitFactor:
          grossLoss > 0
            ? Math.round((grossProfit / grossLoss) * 100) / 100
            : grossProfit > 0
              ? Infinity
              : 0,
        expectancy:
          stratTrades.length > 0
            ? Math.round((totalPnl / stratTrades.length) * 100) / 100
            : 0,
        totalPnl: Math.round(totalPnl * 100) / 100,
      });
    }

    byStrategy.sort((a, b) => b.totalPnl - a.totalPnl);
    const bestStrategy = byStrategy.length > 0 ? byStrategy[0].strategy : '';
    const worstStrategy =
      byStrategy.length > 0 ? byStrategy[byStrategy.length - 1].strategy : '';

    return { byStrategy, bestStrategy, worstStrategy };
  }

  async getTagAnalytics(userId: string): Promise<{
    byTag: TagPerformance[];
    byCategory: {
      category: string;
      totalTrades: number;
      winRate: number;
      totalPnl: number;
    }[];
    topTagCombinations: {
      tags: string[];
      trades: number;
      pnl: number;
      winRate: number;
    }[];
  }> {
    const tradeRows = await db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId));

    const tradeIds = tradeRows.map((t) => t.id);
    if (tradeIds.length === 0) {
      return { byTag: [], byCategory: [], topTagCombinations: [] };
    }

    const tagLinks = await db
      .select()
      .from(tradeTags)
      .where(inArray(tradeTags.tradeId, tradeIds));

    const tagMap = new Map<string, string[]>();
    for (const link of tagLinks) {
      if (!tagMap.has(link.tradeId)) tagMap.set(link.tradeId, []);
      tagMap.get(link.tradeId)!.push(link.tagId);
    }

    const tagDetails = await db.select().from(tags);
    const tagLookup = new Map<string, { name: string; category: string }>();
    for (const tag of tagDetails) {
      tagLookup.set(tag.id, {
        name: tag.name,
        category: tag.category ?? 'uncategorized',
      });
    }

    const tagStats = new Map<
      string,
      { trades: number; wins: number; pnl: number; category: string }
    >();
    for (const [tradeId, tagIds] of tagMap) {
      const trade = tradeRows.find((t) => t.id === tradeId);
      if (!trade) continue;
      for (const tagId of tagIds) {
        const info = tagLookup.get(tagId);
        if (!info) continue;
        const key = info.name;
        if (!tagStats.has(key))
          tagStats.set(key, {
            trades: 0,
            wins: 0,
            pnl: 0,
            category: info.category,
          });
        const stat = tagStats.get(key)!;
        stat.trades++;
        if (Number(trade.pnl) > 0) stat.wins++;
        stat.pnl += Number(trade.pnl);
      }
    }

    const byTag: TagPerformance[] = Array.from(tagStats.entries()).map(
      ([tag, stat]) => ({
        tag,
        category: stat.category,
        totalTrades: stat.trades,
        winRate:
          stat.trades > 0
            ? Math.round((stat.wins / stat.trades) * 10000) / 100
            : 0,
        totalPnl: Math.round(stat.pnl * 100) / 100,
      }),
    );

    const categoryMap = new Map<
      string,
      { trades: number; wins: number; pnl: number }
    >();
    for (const stat of tagStats.values()) {
      if (!categoryMap.has(stat.category))
        categoryMap.set(stat.category, { trades: 0, wins: 0, pnl: 0 });
      const cat = categoryMap.get(stat.category)!;
      cat.trades += stat.trades;
      cat.wins += stat.wins;
      cat.pnl += stat.pnl;
    }

    const byCategory = Array.from(categoryMap.entries()).map(
      ([category, stat]) => ({
        category,
        totalTrades: stat.trades,
        winRate:
          stat.trades > 0
            ? Math.round((stat.wins / stat.trades) * 10000) / 100
            : 0,
        totalPnl: Math.round(stat.pnl * 100) / 100,
      }),
    );

    const comboMap = new Map<
      string,
      { trades: number; wins: number; pnl: number }
    >();
    for (const [tradeId, tagIds] of tagMap) {
      if (tagIds.length < 2) continue;
      const trade = tradeRows.find((t) => t.id === tradeId);
      if (!trade) continue;
      const combo = [...tagIds].sort().join('+');
      if (!comboMap.has(combo))
        comboMap.set(combo, { trades: 0, wins: 0, pnl: 0 });
      const c = comboMap.get(combo)!;
      c.trades++;
      if (Number(trade.pnl) > 0) c.wins++;
      c.pnl += Number(trade.pnl);
    }

    const topTagCombinations = Array.from(comboMap.entries())
      .map(([combo, stat]) => ({
        tags: combo.split('+').map((id) => tagLookup.get(id)?.name ?? id),
        trades: stat.trades,
        pnl: Math.round(stat.pnl * 100) / 100,
        winRate:
          stat.trades > 0
            ? Math.round((stat.wins / stat.trades) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.trades - a.trades)
      .slice(0, 10);

    return { byTag, byCategory, topTagCombinations };
  }

  async compareStrategies(
    userId: string,
    strategyA: string,
    strategyB: string,
  ): Promise<StrategyComparison> {
    const all = await this.getStrategyAnalytics(userId);
    const a = all.byStrategy.find((s) => s.strategy === strategyA);
    const b = all.byStrategy.find((s) => s.strategy === strategyB);

    if (!a || !b) {
      throw new Error(`Strategy not found: ${!a ? strategyA : strategyB}`);
    }

    const pnlDiff = Math.round((a.totalPnl - b.totalPnl) * 100) / 100;
    const winner = a.totalPnl > b.totalPnl ? strategyA : strategyB;

    return {
      strategyA: { ...a, name: strategyA },
      strategyB: { ...b, name: strategyB },
      winner,
      metrics: {
        winRateDiff: Math.round((a.winRate - b.winRate) * 100) / 100,
        profitFactorDiff:
          Math.round((a.profitFactor - b.profitFactor) * 100) / 100,
        expectancyDiff: Math.round((a.expectancy - b.expectancy) * 100) / 100,
        pnlDiff,
      },
    };
  }

  async streamExportCsv(userId: string, res: Response): Promise<void> {
    const headers = [
      'id',
      'symbol',
      'direction',
      'entry_price',
      'exit_price',
      'lot_size',
      'pnl',
      'stop_loss',
      'take_profit',
      'strategy',
      'notes',
      'fomo_check',
      'trend_alignment',
      'vengeance_trade',
      'created_at',
    ];
    res.write(`${headers.map(escapeCsvCell).join(',')}\n`);

    let offset = 0;
    for (;;) {
      const rows = await db
        .select()
        .from(trades)
        .where(eq(trades.userId, userId))
        .orderBy(desc(trades.createdAt))
        .limit(CSV_EXPORT_CHUNK)
        .offset(offset);

      if (rows.length === 0) break;

      for (const t of rows) {
        const line = headers
          .map((h) => escapeCsvCell((t as Record<string, unknown>)[h]))
          .join(',');
        res.write(`${line}\n`);
      }

      offset += rows.length;
      if (rows.length < CSV_EXPORT_CHUNK) break;
    }
  }

  async importCsv(
    userId: string,
    csvContent: string,
  ): Promise<{ imported: number; errors: string[] }> {
    const lines = csvContent.trim().split('\n');
    const errors: string[] = [];
    let imported = 0;

    if (lines.length < 2) {
      return { imported: 0, errors: ['CSV file is empty or has no data rows'] };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const requiredHeaders = [
      'symbol',
      'direction',
      'entry_price',
      'exit_price',
      'lot_size',
    ];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return {
        imported: 0,
        errors: [`Missing required headers: ${missingHeaders.join(', ')}`],
      };
    }

    const getValue = (row: string[], header: string): string => {
      const idx = headers.indexOf(header);
      return idx >= 0 ? (row[idx]?.trim() ?? '') : '';
    };

    return db.transaction(async (tx) => {
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const row = this.parseCsvLine(line);

        try {
          const symbol = getValue(row, 'symbol');
          const direction = getValue(row, 'direction').toLowerCase();
          const entryPrice = parseFloat(getValue(row, 'entry_price'));
          const exitPrice = parseFloat(getValue(row, 'exit_price'));
          const lotSize = parseFloat(getValue(row, 'lot_size'));

          if (!symbol) {
            errors.push(`Row ${i + 1}: Missing symbol`);
            continue;
          }
          if (isNaN(entryPrice) || isNaN(exitPrice) || isNaN(lotSize)) {
            errors.push(`Row ${i + 1}: Invalid numeric values`);
            continue;
          }
          if (direction !== 'buy' && direction !== 'sell') {
            errors.push(
              `Row ${i + 1}: Invalid direction (must be 'buy' or 'sell')`,
            );
            continue;
          }

          const pnl =
            direction === 'buy'
              ? (exitPrice - entryPrice) * lotSize * 100000
              : (entryPrice - exitPrice) * lotSize * 100000;

          const stopLoss = parseFloat(getValue(row, 'stop_loss')) || null;
          const takeProfit = parseFloat(getValue(row, 'take_profit')) || null;
          const strategy = getValue(row, 'strategy') || null;
          const notes = getValue(row, 'notes') || null;
          const fomoCheck =
            getValue(row, 'fomo_check').toLowerCase() === 'true';
          const trendAlignment =
            getValue(row, 'trend_alignment').toLowerCase() === 'true';
          const vengeanceTrade =
            getValue(row, 'vengeance_trade').toLowerCase() === 'true';

          await tx.insert(trades).values({
            userId,
            symbol,
            direction,
            entryPrice: String(entryPrice),
            exitPrice: String(exitPrice),
            lotSize: String(lotSize),
            pnl: String(pnl),
            stopLoss: stopLoss !== null ? String(stopLoss) : null,
            takeProfit: takeProfit !== null ? String(takeProfit) : null,
            strategy,
            notes,
            fomoCheck,
            trendAlignment,
            vengeanceTrade,
          });
          imported++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`Row ${i + 1}: ${message}`);
        }
      }

      return { imported, errors };
    });
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }
}

import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  eq,
  and,
  or,
  ilike,
  desc,
  asc,
  sql,
  count,
  lt,
  gt,
  gte,
  lte,
  inArray,
} from 'drizzle-orm';
import { db } from '../db/drizzle';
import { trades, tags, tradeTags } from '@tradezen/db';
import { CsvUtils } from '../common/utils/csv';
import { CursorPagination } from '../common/utils/cursor-pagination';
import { CreateTradeDto, UpdateTradeDto, QueryTradesDto } from './dto';
import { EventPublisherService } from '../common/services/event-publisher.service';
import { calculateRiskReward } from '../common/trading/risk-reward';
import { SeedService } from '../seed/seed.service';
import { TradeImageService } from './trades-image.service';
import { MemoryService } from '../ai/memory.service';
import type { Response } from 'express';

const CSV_EXPORT_CHUNK = 500;

interface AnalyticsSummaryRow {
  total_trades: number;
  total_pnl: number;
  win_count: number;
  loss_count: number;
  gross_profit: number;
  gross_loss: number;
  best_trade: number;
  worst_trade: number;
  avg_win: number;
  avg_loss: number;
  fomo_count: number;
  vengeance_count: number;
  trend_aligned_count: number;
}
interface PnlRow {
  pnl: number;
}
interface MaxDrawdownRow {
  max_drawdown: number;
}
interface AvgRrRow {
  avg_rr: number;
}
interface StrategyRow {
  name: string;
  trades: number;
  wins: number;
  pnl: number;
}
interface DayOfWeekRow {
  dow: number;
  trades: number;
  wins: number;
  pnl: number;
}
interface MonthRow {
  month: string;
  trades: number;
  wins: number;
  pnl: number;
}
interface AdvancedTradeRow {
  pnl: number;
  symbol: string;
  direction: string;
  trade_date: string;
  created_at: string;
}
interface StrategyMonthlyRow {
  month: string;
  trades: number;
  pnl: number;
  win_rate: number;
}

export interface TradeAnalytics {
  totalTrades: number;
  totalPnl: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  avgRR: number;
  byStrategy: {
    name: string;
    trades: number;
    wins: number;
    winRate: number;
    pnl: number;
  }[];
  byDayOfWeek: {
    day: string;
    trades: number;
    winRate: number;
    pnl: number;
  }[];
  byMonth: {
    month: string;
    trades: number;
    winRate: number;
    pnl: number;
  }[];
  behavioralStats: {
    fomoCount: number;
    vengeanceCount: number;
    trendAlignedCount: number;
  };
}

export interface StrategyPerformance {
  strategy: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  totalPnl: number;
  avgRr: number;
  maxDrawdown: number;
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

export interface RiskByStrategy {
  strategy: string;
  avgRisk: number;
  maxRisk: number;
  count: number;
  winRate: number;
  avgR: number;
}

export interface RiskByWeek {
  week: string;
  totalRisk: number;
  totalPnl: number;
  tradeCount: number;
  maxRisk: number;
}

export interface RiskAnalyticsResponse {
  avgRiskPerTrade: number;
  maxRiskPerTrade: number;
  avgRMultiple: number;
  riskEfficiency: number;
  var95: number;
  distribution: { bucket: string; count: number; totalPnl: number }[];
  byStrategy: RiskByStrategy[];
  byWeek: RiskByWeek[];
  riskByDirection: {
    long: { avgRisk: number; count: number; winRate: number };
    short: { avgRisk: number; count: number; winRate: number };
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
    { data: TradeAnalytics; expiresAt: number }
  >();
  private readonly csvUtils = new CsvUtils();

  constructor(
    private readonly eventPublisher: EventPublisherService,
    private readonly seedService: SeedService,
    private readonly imageService: TradeImageService,
    @Optional() private readonly memoryService?: MemoryService,
  ) {}

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

    this.cleanupSampleData(userId).catch(() => {});

    await this.eventPublisher.publish(`trades:${userId}`, [
      'trade:created',
      trade,
    ]);

    // Embed trade for semantic retrieval (fire-and-forget)
    if (this.memoryService) {
      this.memoryService.embedNewTrade(userId, trade).catch(() => {});
    }

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
      cursor,
      tagId,
    } = query;

    const allowedSorts = ['created_at', 'pnl', 'symbol'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
    const safeOrder = order === 'asc' ? 'asc' : 'desc';

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

    const sortField =
      safeSort === 'pnl'
        ? trades.pnl
        : safeSort === 'symbol'
          ? trades.symbol
          : trades.createdAt;

    if (tagId) {
      conditions.push(eq(tradeTags.tagId, tagId));
    }

    if (cursor) {
      const decoded = CursorPagination.decodeCursor(cursor);
      const cursorOp = safeOrder === 'asc' ? gt : lt;
      const cursorEq = and(
        eq(sortField, decoded.sortValue),
        cursorOp(trades.id, decoded.id),
      )!;
      const cursorCond = cursorOp(sortField, decoded.sortValue);

      const combined = or(cursorCond, cursorEq)!;
      conditions.push(combined);
    }

    const whereClause = and(...conditions);

    const orderBy =
      safeSort === 'pnl'
        ? safeOrder === 'asc'
          ? asc(trades.pnl)
          : desc(trades.pnl)
        : safeSort === 'symbol'
          ? safeOrder === 'asc'
            ? asc(trades.symbol)
            : desc(trades.symbol)
          : safeOrder === 'asc'
            ? asc(trades.createdAt)
            : desc(trades.createdAt);

    const fetchLimit = cursor ? limit + 1 : limit;

    const queryBuilder = db.select().from(trades);
    if (tagId) {
      queryBuilder.innerJoin(tradeTags, eq(trades.id, tradeTags.tradeId));
    }

    const data = await queryBuilder
      .where(whereClause)
      .orderBy(orderBy)
      .limit(fetchLimit);

    if (cursor) {
      const hasMore = data.length > limit;
      if (hasMore) data.pop();

      const last = data[data.length - 1];
      const nextCursor = last
        ? CursorPagination.encodeCursor(
            last.id,
            safeSort === 'created_at'
              ? (last.createdAt ?? new Date().toISOString())
              : safeSort === 'pnl'
                ? (last.pnl ?? 0)
                : (last.symbol ?? ''),
          )
        : null;

      return { data, meta: { nextCursor, hasMore } };
    }

    const countQuery = db.select({ count: count() }).from(trades);
    if (tagId) {
      countQuery.innerJoin(tradeTags, eq(trades.id, tradeTags.tradeId));
    }
    const countResult = await countQuery.where(whereClause);
    const total = Number(countResult[0]?.count ?? 0);
    const offset = (page - 1) * limit;

    const paginated = data.slice(offset, offset + limit);

    const tradeIds = paginated.map((t) => t.id);
    const [thumbnailMap, countMap] = await Promise.all([
      this.imageService.getThumbnails(tradeIds),
      this.imageService.getImageCounts(tradeIds),
    ]);

    const tradesWithImages = paginated.map((trade) => {
      const previewImage = thumbnailMap.get(trade.id) ?? null;
      const imageCount = countMap.get(trade.id) ?? 0;
      const riskReward = calculateRiskReward(
        Number(trade.entryPrice),
        trade.stopLoss != null ? Number(trade.stopLoss) : null,
        trade.takeProfit != null ? Number(trade.takeProfit) : null,
      );
      return {
        ...trade,
        previewImage: previewImage
          ? {
              id: previewImage.id,
              url: previewImage.url,
              width: previewImage.width,
              height: previewImage.height,
            }
          : null,
        imageCount,
        hasImages: imageCount > 0,
        riskReward,
      };
    });

    return {
      data: tradesWithImages,
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

    const images = await this.imageService.getImages(id);
    return { ...result[0], images };
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

    // Delete all images from Cloudinary before deleting the trade
    const images = await this.imageService.getImages(id);
    for (const image of images) {
      try {
        await this.imageService.deleteImage(userId, id, image.id);
      } catch {
        // Non-fatal: continue with trade deletion even if image deletion fails
      }
    }

    await db
      .delete(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, userId)));

    await this.eventPublisher.publish(`trades:${userId}`, [
      'trade:deleted',
      { id },
    ]);

    return { deleted: true };
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

  async getAnalytics(userId: string): Promise<TradeAnalytics> {
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

    const s = summaryRes[0] as unknown as AnalyticsSummaryRow;
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

    const pnls = (pnlSeriesRes as unknown as PnlRow[]).map((r) =>
      Number(r.pnl),
    );
    const { maxConsWins, maxConsLosses } = computeMaxConsecutive(pnls);

    const maxDrawdown = Number(
      (maxDdRes[0] as unknown as MaxDrawdownRow | undefined)?.max_drawdown ?? 0,
    );
    const avgRR = Number(
      (avgRrRes[0] as unknown as AvgRrRow | undefined)?.avg_rr ?? 0,
    );

    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const byStrategy = (strategyRes as unknown as StrategyRow[]).map((r) => ({
      name: r.name,
      trades: Number(r.trades),
      wins: Number(r.wins),
      winRate: Number(r.trades) > 0 ? Number(r.wins) / Number(r.trades) : 0,
      pnl: Number(r.pnl),
    }));
    const byDayOfWeek = (dowRes as unknown as DayOfWeekRow[]).map((r) => ({
      day: dayNames[Number(r.dow) % 7],
      trades: Number(r.trades),
      winRate: Number(r.trades) > 0 ? Number(r.wins) / Number(r.trades) : 0,
      pnl: Number(r.pnl),
    }));
    const byMonth = (monthRes as unknown as MonthRow[]).map((r) => ({
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

    const allTrades = tradesRes as unknown as AdvancedTradeRow[];
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
    const maxDrawdown = Number(
      (maxDdRes[0] as unknown as MaxDrawdownRow | undefined)?.max_drawdown ?? 0,
    );

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

      // Compute avg R:R per strategy
      const rrValues = stratTrades
        .filter((t) => t.stopLoss && t.takeProfit)
        .map((t) => {
          const entry = Number(t.entryPrice);
          const sl = Number(t.stopLoss);
          const tp = Number(t.takeProfit);
          return Math.abs(tp - entry) / Math.abs(entry - sl);
        });
      const avgRr =
        rrValues.length > 0
          ? Math.round(
              (rrValues.reduce((s, v) => s + v, 0) / rrValues.length) * 100,
            ) / 100
          : 0;

      // Compute max drawdown per strategy
      const sorted = [...stratTrades].sort(
        (a, b) =>
          new Date(a.createdAt ?? 0).getTime() -
          new Date(b.createdAt ?? 0).getTime(),
      );
      let cum = 0;
      let peak = 0;
      let maxDd = 0;
      for (const t of sorted) {
        cum += Number(t.pnl);
        if (cum > peak) peak = cum;
        const dd = peak - cum;
        if (dd > maxDd) maxDd = dd;
      }

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
        avgRr,
        maxDrawdown: Math.round(maxDd * 100) / 100,
      });
    }

    byStrategy.sort((a, b) => b.totalPnl - a.totalPnl);
    const bestStrategy = byStrategy.length > 0 ? byStrategy[0].strategy : '';
    const worstStrategy =
      byStrategy.length > 0 ? byStrategy[byStrategy.length - 1].strategy : '';

    return { byStrategy, bestStrategy, worstStrategy };
  }

  async getStrategyPerformance(
    userId: string,
    strategyName: string,
  ): Promise<{
    strategy: string;
    monthly: { month: string; trades: number; pnl: number; winRate: number }[];
  }> {
    const monthlyRes = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', COALESCE(trade_date, created_at)), 'YYYY-MM') AS month,
        COUNT(*)::int AS trades,
        COALESCE(SUM(pnl), 0)::float8 AS pnl,
        ROUND(
          (COUNT(*) FILTER (WHERE pnl > 0)::float8 / GREATEST(COUNT(*), 1) * 100)::numeric,
          2
        ) AS win_rate
      FROM trades
      WHERE user_id = ${userId}
        AND (strategy = ${strategyName} OR strategy IS NULL AND ${strategyName} = 'No Strategy')
      GROUP BY DATE_TRUNC('month', COALESCE(trade_date, created_at))
      ORDER BY month ASC
    `);

    const monthly = (monthlyRes as unknown as StrategyMonthlyRow[]).map(
      (r) => ({
        month: r.month,
        trades: Number(r.trades),
        pnl: Math.round(Number(r.pnl) * 100) / 100,
        winRate: Number(r.win_rate),
      }),
    );

    return { strategy: strategyName, monthly };
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

  async getDashboardData(
    userId: string,
  ): Promise<import('./dto/dashboard.dto').DashboardResponseDto> {
    const allTrades = await db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId))
      .orderBy(asc(trades.createdAt));

    const toDateStr = (d: Date | string | null): string => {
      if (!d) return '';
      if (typeof d === 'string') return d.slice(0, 10);
      return d.toISOString().slice(0, 10);
    };

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const isoWeekStart = new Date(today);
    isoWeekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekStartStr = isoWeekStart.toISOString().slice(0, 10);

    // Weekly stats
    const weekTrades = allTrades.filter(
      (t) => t.tradeDate && toDateStr(t.tradeDate) >= weekStartStr,
    );
    const weeklyTrades = weekTrades.length;
    const weeklyPnl = weekTrades.reduce((sum, t) => sum + Number(t.pnl), 0);
    const weeklyWins = weekTrades.filter((t) => Number(t.pnl) > 0).length;
    const weeklyWinRate =
      weeklyTrades > 0 ? Math.round((weeklyWins / weeklyTrades) * 100) : 0;

    // Equity curve
    const sorted = allTrades
      .filter((t) => t.tradeDate)
      .sort((a, b) =>
        toDateStr(a.tradeDate).localeCompare(toDateStr(b.tradeDate)),
      );
    let cum = 0;
    const equityMap = new Map<string, number>();
    for (const t of sorted) {
      const d = toDateStr(t.tradeDate);
      cum += Number(t.pnl);
      equityMap.set(d, Math.round(cum * 100) / 100);
    }
    const equityCurve = Array.from(equityMap.entries()).map(
      ([date, equity]) => ({
        date,
        equity,
      }),
    );

    // Daily summary
    const todayTrades = allTrades.filter(
      (t) => t.tradeDate && toDateStr(t.tradeDate) === todayStr,
    );
    const dailyWins = todayTrades.filter((t) => Number(t.pnl) > 0).length;
    const tradesToday = todayTrades.length;
    const winRateToday =
      tradesToday > 0 ? Math.round((dailyWins / tradesToday) * 100) : 0;
    const pnlToday = todayTrades.reduce((sum, t) => sum + Number(t.pnl), 0);
    const openRisk = allTrades
      .filter((t) => !t.tradeDate)
      .reduce((sum, t) => {
        const sl = t.stopLoss ? Number(t.stopLoss) : 0;
        const entry = Number(t.entryPrice);
        const lot = Number(t.lotSize);
        return entry > 0 && sl > 0 ? sum + Math.abs(entry - sl) * lot : sum;
      }, 0);

    // Behavior analytics
    const totalTrades = allTrades.length;
    const fomoCount = allTrades.filter((t) => t.fomoCheck).length;
    const vengeanceCount = allTrades.filter((t) => t.vengeanceTrade).length;
    const disciplineScore =
      totalTrades > 0
        ? Math.min(
            100,
            Math.round(
              ((totalTrades - (fomoCount + vengeanceCount)) / totalTrades) *
                100,
            ),
          )
        : 0;
    const fomoRate = totalTrades > 0 ? fomoCount / totalTrades : 0;
    const fomoScore: 'Low' | 'Medium' | 'High' =
      fomoRate < 0.1 ? 'Low' : fomoRate < 0.25 ? 'Medium' : 'High';

    const thisMonthStr = today.toISOString().slice(0, 7);
    const revengeTradesThisMonth = allTrades.filter(
      (t) =>
        t.vengeanceTrade &&
        t.createdAt &&
        String(t.createdAt).startsWith(thisMonthStr),
    ).length;

    const trendAlignedCount = allTrades.filter((t) => t.trendAlignment).length;
    const trendAlignment =
      totalTrades > 0 ? Math.round((trendAlignedCount / totalTrades) * 100) : 0;

    // Insights
    const strategyMap = new Map<
      string,
      { trades: number; wins: number; pnl: number }
    >();
    const dayMap = new Map<
      number,
      { trades: number; wins: number; pnl: number }
    >();
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    for (const t of allTrades) {
      const strat = t.strategy || 'No Strategy';
      if (!strategyMap.has(strat))
        strategyMap.set(strat, { trades: 0, wins: 0, pnl: 0 });
      const sm = strategyMap.get(strat)!;
      sm.trades++;
      if (Number(t.pnl) > 0) sm.wins++;
      sm.pnl += Number(t.pnl);

      if (t.createdAt) {
        const dow = new Date(String(t.createdAt)).getDay();
        if (!dayMap.has(dow)) dayMap.set(dow, { trades: 0, wins: 0, pnl: 0 });
        const dm = dayMap.get(dow)!;
        dm.trades++;
        if (Number(t.pnl) > 0) dm.wins++;
        dm.pnl += Number(t.pnl);
      }
    }

    let bestStrategy = '';
    let bestStrategyWR = 0;
    for (const [name, stats] of strategyMap) {
      if (stats.trades >= 3) {
        const wr = stats.wins / stats.trades;
        if (wr > bestStrategyWR) {
          bestStrategyWR = wr;
          bestStrategy = name;
        }
      }
    }

    let bestDay = '';
    let bestDayPnl = -Infinity;
    for (const [dow, stats] of dayMap) {
      if (stats.pnl > bestDayPnl) {
        bestDayPnl = stats.pnl;
        bestDay = dayNames[dow];
      }
    }

    const grossProfit = allTrades
      .filter((t) => Number(t.pnl) > 0)
      .reduce((s, t) => s + Number(t.pnl), 0);
    const grossLoss = Math.abs(
      allTrades
        .filter((t) => Number(t.pnl) < 0)
        .reduce((s, t) => s + Number(t.pnl), 0),
    );
    const profitFactor =
      grossLoss > 0
        ? Math.round((grossProfit / grossLoss) * 100) / 100
        : grossProfit > 0
          ? 999
          : 0;

    const rrValues = allTrades
      .filter((t) => t.stopLoss && t.takeProfit)
      .map((t) => {
        const entry = Number(t.entryPrice);
        const sl = Number(t.stopLoss);
        const tp = Number(t.takeProfit);
        return entry > 0 && sl > 0 && tp > 0
          ? Math.abs(tp - entry) / Math.abs(entry - sl)
          : 0;
      })
      .filter((v) => v > 0);
    const avgRR =
      rrValues.length > 0
        ? Math.round(
            (rrValues.reduce((s, v) => s + v, 0) / rrValues.length) * 10,
          ) / 10
        : 0;

    // Heatmap
    const heatmapMap = new Map<
      string,
      { trades: number; pnl: number; disciplined: boolean }
    >();
    for (const t of allTrades) {
      const d = toDateStr(t.tradeDate || t.createdAt);
      if (!d) continue;
      if (!heatmapMap.has(d))
        heatmapMap.set(d, { trades: 0, pnl: 0, disciplined: true });
      const hm = heatmapMap.get(d)!;
      hm.trades++;
      hm.pnl += Number(t.pnl);
      if (t.vengeanceTrade || !t.tradeDate) hm.disciplined = false;
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const yearAgoStr = oneYearAgo.toISOString().slice(0, 10);
    const heatmap = Array.from(heatmapMap.entries())
      .filter(([date]) => date >= yearAgoStr)
      .map(([date, data]) => ({
        date,
        trades: data.trades,
        pnl: Math.round(data.pnl * 100) / 100,
        disciplined: data.disciplined,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalPnl = allTrades.reduce((sum, t) => sum + Number(t.pnl), 0);
    const overallWins = allTrades.filter((t) => Number(t.pnl) > 0).length;
    const overallWinRate =
      totalTrades > 0 ? Math.round((overallWins / totalTrades) * 100) : 0;

    return {
      weeklyTrades,
      weeklyPnl: Math.round(weeklyPnl * 100) / 100,
      weeklyWinRate,
      totalPnl,
      overallWinRate,
      equityCurve,
      dailySummary: {
        tradesToday,
        winRateToday,
        pnlToday: Math.round(pnlToday * 100) / 100,
        openRisk: Math.round(openRisk * 100) / 100,
      },
      behaviorAnalytics: {
        disciplineScore,
        fomoScore,
        revengeTradesThisMonth,
        trendAlignment,
      },
      insights: {
        bestStrategy,
        bestDay,
        avgRR,
        profitFactor,
      },
      heatmap,
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

        const row = this.csvUtils.parseCsvLine(line);

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

          const contractSize =
            parseFloat(getValue(row, 'contract_size')) || 100000;
          const pnl =
            direction === 'buy'
              ? (exitPrice - entryPrice) * lotSize * contractSize
              : (entryPrice - exitPrice) * lotSize * contractSize;

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

  async getRiskAnalytics(userId: string): Promise<RiskAnalyticsResponse> {
    const tradeRows = await db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId))
      .orderBy(asc(trades.createdAt));

    const emptyResponse: RiskAnalyticsResponse = {
      avgRiskPerTrade: 0,
      maxRiskPerTrade: 0,
      avgRMultiple: 0,
      riskEfficiency: 0,
      var95: 0,
      distribution: [],
      byStrategy: [],
      byWeek: [],
      riskByDirection: {
        long: { avgRisk: 0, count: 0, winRate: 0 },
        short: { avgRisk: 0, count: 0, winRate: 0 },
      },
    };

    if (tradeRows.length === 0) return emptyResponse;

    const DEFAULT_CONTRACT_SIZE = 100000;

    interface TradeRisk {
      pnl: number;
      risk: number | null;
      rMultiple: number | null;
      strategy: string;
      direction: string;
      tradeDate: string;
    }

    const tradeRisks: TradeRisk[] = tradeRows.map((t) => {
      const pnl = Number(t.pnl);
      const entry = t.entryPrice !== null ? Number(t.entryPrice) : null;
      const sl = t.stopLoss !== null ? Number(t.stopLoss) : null;
      const lot = Number(t.lotSize);
      const cs =
        t.contractSize !== null
          ? Number(t.contractSize)
          : DEFAULT_CONTRACT_SIZE;

      let risk: number | null = null;
      let rMultiple: number | null = null;

      if (entry !== null && sl !== null && lot > 0) {
        risk = Math.abs(entry - sl) * lot * cs;
        rMultiple = risk > 0 ? pnl / risk : null;
      }

      return {
        pnl,
        risk,
        rMultiple,
        strategy: t.strategy || 'Unknown',
        direction: t.direction || 'unknown',
        tradeDate: String(t.tradeDate ?? t.createdAt?.toISOString?.() ?? ''),
      };
    });

    const tradesWithRisk = tradeRisks.filter(
      (t) => t.risk !== null && t.rMultiple !== null,
    ) as (TradeRisk & { risk: number; rMultiple: number })[];

    const totalRisk = tradesWithRisk.reduce((sum, t) => sum + t.risk, 0);
    const totalPnl = tradeRisks.reduce((sum, t) => sum + t.pnl, 0);
    const avgRiskPerTrade =
      tradesWithRisk.length > 0 ? totalRisk / tradesWithRisk.length : 0;
    const maxRiskPerTrade =
      tradesWithRisk.length > 0
        ? Math.max(...tradesWithRisk.map((t) => t.risk))
        : 0;
    const avgRMultiple =
      tradesWithRisk.length > 0
        ? tradesWithRisk.reduce((sum, t) => sum + t.rMultiple, 0) /
          tradesWithRisk.length
        : 0;
    const riskEfficiency = totalRisk > 0 ? totalPnl / totalRisk : 0;

    const pnls = tradeRisks.map((t) => t.pnl).sort((a, b) => a - b);
    const varIndex = Math.max(0, Math.floor(pnls.length * 0.05));
    const var95 = pnls[varIndex] ?? 0;

    const BUCKETS = [
      { label: '< -3R', min: -Infinity, max: -3 },
      { label: '-3R to -2R', min: -3, max: -2 },
      { label: '-2R to -1R', min: -2, max: -1 },
      { label: '-1R to 0R', min: -1, max: 0 },
      { label: '0R to 1R', min: 0, max: 1 },
      { label: '1R to 2R', min: 1, max: 2 },
      { label: '2R to 3R', min: 2, max: 3 },
      { label: '> 3R', min: 3, max: Infinity },
    ];

    const distribution = BUCKETS.map((bucket) => {
      const inBucket = tradesWithRisk.filter(
        (t) => t.rMultiple >= bucket.min && t.rMultiple < bucket.max,
      );
      return {
        bucket: bucket.label,
        count: inBucket.length,
        totalPnl: inBucket.reduce((sum, t) => sum + t.pnl, 0),
      };
    });

    const strategyMap = new Map<string, TradeRisk[]>();
    for (const t of tradeRisks) {
      if (!strategyMap.has(t.strategy)) strategyMap.set(t.strategy, []);
      strategyMap.get(t.strategy)!.push(t);
    }

    const byStrategy: RiskByStrategy[] = [];
    for (const [strategy, trades] of strategyMap) {
      const tradesWithR = trades.filter(
        (t) => t.risk !== null,
      ) as (TradeRisk & { risk: number })[];
      const wins = trades.filter((t) => t.pnl > 0);
      const avgRisk =
        tradesWithR.length > 0
          ? tradesWithR.reduce((sum, t) => sum + t.risk, 0) / tradesWithR.length
          : 0;
      const maxRisk =
        tradesWithR.length > 0
          ? Math.max(...tradesWithR.map((t) => t.risk))
          : 0;
      const avgR =
        tradesWithR.filter((t) => t.rMultiple !== null).length > 0
          ? tradesWithR
              .filter((t) => t.rMultiple !== null)
              .reduce((sum, t) => sum + t.rMultiple!, 0) /
            tradesWithR.filter((t) => t.rMultiple !== null).length
          : 0;

      byStrategy.push({
        strategy,
        avgRisk: Math.round(avgRisk * 100) / 100,
        maxRisk: Math.round(maxRisk * 100) / 100,
        count: trades.length,
        winRate:
          trades.length > 0
            ? Math.round((wins.length / trades.length) * 10000) / 100
            : 0,
        avgR: Math.round(avgR * 100) / 100,
      });
    }

    const weekMap = new Map<
      string,
      { risk: number; pnl: number; count: number; maxRisk: number }
    >();
    for (const t of tradeRisks) {
      if (!t.tradeDate) continue;
      const d = new Date(t.tradeDate);
      if (isNaN(d.getTime())) continue;
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(
        ((d.getTime() - yearStart.getTime()) / 86400000 +
          yearStart.getDay() +
          1) /
          7,
      );
      const weekKey = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      const existing = weekMap.get(weekKey) || {
        risk: 0,
        pnl: 0,
        count: 0,
        maxRisk: 0,
      };
      existing.risk += t.risk || 0;
      existing.pnl += t.pnl;
      existing.count += 1;
      existing.maxRisk = Math.max(existing.maxRisk, t.risk || 0);
      weekMap.set(weekKey, existing);
    }

    const byWeek: RiskByWeek[] = Array.from(weekMap.entries())
      .map(([week, data]) => ({
        week,
        totalRisk: Math.round(data.risk * 100) / 100,
        totalPnl: Math.round(data.pnl * 100) / 100,
        tradeCount: data.count,
        maxRisk: Math.round(data.maxRisk * 100) / 100,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    const longTrades = tradeRisks.filter((t) => t.direction === 'buy');
    const shortTrades = tradeRisks.filter((t) => t.direction === 'sell');

    const computeDirectionRisk = (trades: TradeRisk[]) => {
      const withRisk = trades.filter((t) => t.risk !== null) as (TradeRisk & {
        risk: number;
      })[];
      const wins = trades.filter((t) => t.pnl > 0);
      const avgRisk =
        withRisk.length > 0
          ? withRisk.reduce((sum, t) => sum + t.risk, 0) / withRisk.length
          : 0;
      return {
        avgRisk: Math.round(avgRisk * 100) / 100,
        count: trades.length,
        winRate:
          trades.length > 0
            ? Math.round((wins.length / trades.length) * 10000) / 100
            : 0,
      };
    };

    return {
      avgRiskPerTrade: Math.round(avgRiskPerTrade * 100) / 100,
      maxRiskPerTrade: Math.round(maxRiskPerTrade * 100) / 100,
      avgRMultiple: Math.round(avgRMultiple * 100) / 100,
      riskEfficiency: Math.round(riskEfficiency * 100) / 100,
      var95: Math.round(var95 * 100) / 100,
      distribution,
      byStrategy,
      byWeek,
      riskByDirection: {
        long: computeDirectionRisk(longTrades),
        short: computeDirectionRisk(shortTrades),
      },
    };
  }

  private async cleanupSampleData(userId: string) {
    const sampleCount = await db
      .select({ c: count() })
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.isSample, true)));
    if (Number(sampleCount[0]?.c ?? 0) > 0) {
      await this.seedService.deleteSampleData(userId);
    }
  }
}

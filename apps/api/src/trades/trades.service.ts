import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, like, ilike, desc, asc, sql, count } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { trades } from '../db/schema';
import { CreateTradeDto, UpdateTradeDto, QueryTradesDto } from './dto';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';

const CSV_EXPORT_CHUNK = 500;

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

    return result[0];
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
    return result[0];
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
    const conditions = [sql`user_id = ${userId}`];

    if (from) {
      conditions.push(sql`created_at >= ${from}`);
    }
    if (to) {
      conditions.push(sql`created_at <= ${to}`);
    }

    const where = conditions.join(' AND ');

    const result = await db.execute(sql`
      SELECT DATE(created_at) as date,
             SUM(pnl) as total_pnl,
             COUNT(*) as trade_count,
             COUNT(*) FILTER (WHERE pnl > 0) as wins,
             COUNT(*) FILTER (WHERE pnl < 0) as losses
      FROM trades WHERE ${sql.raw(where)}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    return result;
  }

  async getAnalytics(userId: string) {
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
        SELECT pnl::float8 AS pnl FROM trades WHERE user_id = ${userId} ORDER BY created_at ASC, id ASC
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

    return {
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

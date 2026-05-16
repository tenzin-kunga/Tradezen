import { Injectable, NotFoundException } from '@nestjs/common';
import { pool } from '../db';
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

    const res = await pool.query(
      `INSERT INTO trades (
        user_id, symbol, direction, entry_price, exit_price, lot_size, pnl,
        stop_loss, take_profit, strategy, notes,
        fomo_check, trend_alignment, vengeance_trade, trade_date, commission, contract_size
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        userId,
        symbol,
        direction,
        entry,
        exit,
        lot,
        netPnl,
        stop_loss,
        take_profit,
        strategy,
        notes,
        fomo_check,
        trend_alignment,
        vengeance_trade,
        trade_date,
        commission,
        contract_size,
      ],
    );

    return res.rows[0];
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

    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let idx = 2;

    if (symbol) {
      conditions.push(`symbol ILIKE $${idx}`);
      params.push(`%${symbol}%`);
      idx++;
    }
    if (direction) {
      conditions.push(`direction = $${idx}`);
      params.push(direction);
      idx++;
    }
    if (strategy) {
      conditions.push(`strategy ILIKE $${idx}`);
      params.push(`%${strategy}%`);
      idx++;
    }
    if (from) {
      conditions.push(`created_at >= $${idx}`);
      params.push(from);
      idx++;
    }
    if (to) {
      conditions.push(`created_at <= $${idx}`);
      params.push(to);
      idx++;
    }

    const where = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM trades WHERE ${where}`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;
    const dataRes = await pool.query(
      `SELECT * FROM trades WHERE ${where}
       ORDER BY ${safeSort} ${safeOrder}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    );

    return {
      data: dataRes.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const res = await pool.query(
      'SELECT * FROM trades WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    if (res.rowCount === 0)
      throw new NotFoundException(`Trade ${id} not found`);
    return res.rows[0];
  }

  async update(userId: string, id: string, dto: UpdateTradeDto) {
    // Get current trade
    const current = await this.findOne(userId, id);

    const symbol = dto.symbol ?? current.symbol;
    const direction = dto.direction ?? current.direction;
    const entry = dto.entry ?? Number(current.entry_price);
    const exit = dto.exit ?? Number(current.exit_price);
    const lot = dto.lot ?? Number(current.lot_size);
    const contract_size =
      dto.contract_size ?? Number(current.contract_size ?? 100000);
    const commission =
      dto.commission !== undefined
        ? dto.commission
        : Number(current.commission ?? 0);

    // Recalculate PnL
    const pnl =
      direction === 'buy'
        ? (exit - entry) * lot * contract_size
        : (entry - exit) * lot * contract_size;
    const netPnl = commission ? pnl - commission : pnl;

    const res = await pool.query(
      `UPDATE trades SET
        symbol = $1, direction = $2, entry_price = $3, exit_price = $4,
        lot_size = $5, pnl = $6, stop_loss = $7, take_profit = $8,
        strategy = $9, notes = $10, fomo_check = $11, trend_alignment = $12,
        vengeance_trade = $13, trade_date = $14, commission = $15,
        contract_size = $16, updated_at = NOW()
       WHERE id = $17 AND user_id = $18
       RETURNING *`,
      [
        symbol,
        direction,
        entry,
        exit,
        lot,
        netPnl,
        dto.stop_loss !== undefined ? dto.stop_loss : current.stop_loss,
        dto.take_profit !== undefined ? dto.take_profit : current.take_profit,
        dto.strategy !== undefined ? dto.strategy : current.strategy,
        dto.notes !== undefined ? dto.notes : current.notes,
        dto.fomo_check !== undefined ? dto.fomo_check : current.fomo_check,
        dto.trend_alignment !== undefined
          ? dto.trend_alignment
          : current.trend_alignment,
        dto.vengeance_trade !== undefined
          ? dto.vengeance_trade
          : current.vengeance_trade,
        dto.trade_date !== undefined ? dto.trade_date : current.trade_date,
        commission,
        contract_size,
        id,
        userId,
      ],
    );

    return res.rows[0];
  }

  async remove(userId: string, id: string) {
    const trade = await this.findOne(userId, id);

    // Remove chart image if exists
    if (trade.chart_image) {
      const imagePath = path.join(process.cwd(), trade.chart_image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await pool.query('DELETE FROM trades WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
    return { deleted: true };
  }

  async uploadImage(userId: string, id: string, filename: string) {
    await this.findOne(userId, id);

    const imageUrl = `/uploads/${filename}`;
    await pool.query(
      'UPDATE trades SET chart_image = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [imageUrl, id, userId],
    );
    return { chart_image: imageUrl };
  }

  async getDailyPnl(userId: string, from?: string, to?: string) {
    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let idx = 2;

    if (from) {
      conditions.push(`created_at >= $${idx}`);
      params.push(from);
      idx++;
    }
    if (to) {
      conditions.push(`created_at <= $${idx}`);
      params.push(to);
      idx++;
    }

    const where = conditions.join(' AND ');
    const res = await pool.query(
      `SELECT DATE(created_at) as date,
              SUM(pnl) as total_pnl,
              COUNT(*) as trade_count,
              COUNT(*) FILTER (WHERE pnl > 0) as wins,
              COUNT(*) FILTER (WHERE pnl < 0) as losses
       FROM trades WHERE ${where}
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      params,
    );
    return res.rows;
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
      pool.query(
        `SELECT
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
         FROM trades WHERE user_id = $1`,
        [userId],
      ),
      pool.query(
        `WITH ordered AS (
           SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn,
                  pnl::float8 AS pnl
           FROM trades WHERE user_id = $1
         ),
         cum AS (
           SELECT rn, SUM(pnl) OVER (ORDER BY rn) AS eq FROM ordered
         ),
         peaked AS (
           SELECT eq, MAX(eq) OVER (ORDER BY rn ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS peak
           FROM cum
         )
         SELECT COALESCE(MAX(peak - eq), 0)::float8 AS max_drawdown FROM peaked`,
        [userId],
      ),
      pool.query(
        `SELECT COALESCE(AVG(
           ABS(take_profit - entry_price) / NULLIF(ABS(entry_price - stop_loss), 0)
         ), 0)::float8 AS avg_rr
         FROM trades
         WHERE user_id = $1
           AND stop_loss IS NOT NULL
           AND take_profit IS NOT NULL`,
        [userId],
      ),
      pool.query(
        `SELECT pnl::float8 AS pnl FROM trades WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
        [userId],
      ),
      pool.query(
        `SELECT COALESCE(NULLIF(TRIM(COALESCE(strategy, '')), ''), 'No Strategy') AS name,
                COUNT(*)::int AS trades,
                COUNT(*) FILTER (WHERE pnl > 0)::int AS wins,
                COALESCE(SUM(pnl), 0)::float8 AS pnl
         FROM trades WHERE user_id = $1
         GROUP BY 1
         ORDER BY pnl DESC`,
        [userId],
      ),
      pool.query(
        `SELECT EXTRACT(DOW FROM created_at)::int AS dow,
                COUNT(*)::int AS trades,
                COUNT(*) FILTER (WHERE pnl > 0)::int AS wins,
                COALESCE(SUM(pnl), 0)::float8 AS pnl
         FROM trades WHERE user_id = $1
         GROUP BY 1
         ORDER BY 1`,
        [userId],
      ),
      pool.query(
        `SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
                COUNT(*)::int AS trades,
                COUNT(*) FILTER (WHERE pnl > 0)::int AS wins,
                COALESCE(SUM(pnl), 0)::float8 AS pnl
         FROM trades WHERE user_id = $1
         GROUP BY 1
         ORDER BY 1`,
        [userId],
      ),
    ]);

    const s = summaryRes.rows[0];
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
    /** JSON-safe: no losses but wins => large finite PF (legacy in-memory used Infinity). */
    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999999 : 0;
    const avgWin = Number(s.avg_win);
    const avgLoss = Number(s.avg_loss);
    const expectancy = winRateRatio * avgWin - (1 - winRateRatio) * avgLoss;

    const pnls = pnlSeriesRes.rows.map((r: { pnl: string | number }) =>
      Number(r.pnl),
    );
    const { maxConsWins, maxConsLosses } = computeMaxConsecutive(pnls);

    const maxDrawdown = Number(maxDdRes.rows[0]?.max_drawdown ?? 0);
    const avgRR = Number(avgRrRes.rows[0]?.avg_rr ?? 0);

    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const byStrategy = strategyRes.rows.map((r: any) => ({
      name: r.name,
      trades: Number(r.trades),
      winRate: Number(r.trades) > 0 ? Number(r.wins) / Number(r.trades) : 0,
      pnl: Number(r.pnl),
    }));
    const byDayOfWeek = dowRes.rows.map((r: any) => ({
      day: dayNames[Number(r.dow) % 7],
      trades: Number(r.trades),
      winRate: Number(r.trades) > 0 ? Number(r.wins) / Number(r.trades) : 0,
      pnl: Number(r.pnl),
    }));
    const byMonth = monthRes.rows.map((r: any) => ({
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

  /** Streams CSV in DB chunks to avoid loading all rows into memory. */
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
      const { rows } = await pool.query(
        `SELECT id, symbol, direction, entry_price, exit_price, lot_size, pnl,
                stop_loss, take_profit, strategy, notes,
                fomo_check, trend_alignment, vengeance_trade, created_at
         FROM trades WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, CSV_EXPORT_CHUNK, offset],
      );
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

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

          await client.query(
            `INSERT INTO trades (user_id, symbol, direction, entry_price, exit_price, lot_size, pnl, stop_loss, take_profit, strategy, notes, fomo_check, trend_alignment, vengeance_trade)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              userId,
              symbol,
              direction,
              entryPrice,
              exitPrice,
              lotSize,
              pnl,
              stopLoss,
              takeProfit,
              strategy,
              notes,
              fomoCheck,
              trendAlignment,
              vengeanceTrade,
            ],
          );
          imported++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`Row ${i + 1}: ${message}`);
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Transaction failed: ${message}`);
    } finally {
      client.release();
    }

    return { imported, errors };
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

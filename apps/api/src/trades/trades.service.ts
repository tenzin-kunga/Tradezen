import { Injectable, NotFoundException } from "@nestjs/common";
import { pool } from "../db";
import { CreateTradeDto, UpdateTradeDto, QueryTradesDto } from "./dto";
import * as fs from "fs";
import * as path from "path";

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
    } = dto;

    const pnl =
      direction === "buy"
        ? (exit - entry) * lot
        : (entry - exit) * lot;

    const res = await pool.query(
      `INSERT INTO trades (
        user_id, symbol, direction, entry_price, exit_price, lot_size, pnl,
        stop_loss, take_profit, strategy, notes,
        fomo_check, trend_alignment, vengeance_trade, trade_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        userId, symbol, direction, entry, exit, lot, pnl,
        stop_loss, take_profit, strategy, notes,
        fomo_check, trend_alignment, vengeance_trade, trade_date,
      ],
    );

    return res.rows[0];
  }

  async findAll(userId: string, query: QueryTradesDto) {
    const {
      page = 1,
      limit = 20,
      sort = "created_at",
      order = "desc",
      symbol,
      direction,
      strategy,
      from,
      to,
    } = query;

    const allowedSorts = ["created_at", "pnl", "symbol"];
    const safeSort = allowedSorts.includes(sort) ? sort : "created_at";
    const safeOrder = order === "asc" ? "ASC" : "DESC";

    const conditions: string[] = ["user_id = $1"];
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

    const where = conditions.join(" AND ");

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
      "SELECT * FROM trades WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    if (res.rowCount === 0) throw new NotFoundException(`Trade ${id} not found`);
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

    // Recalculate PnL
    const pnl =
      direction === "buy"
        ? (exit - entry) * lot
        : (entry - exit) * lot;

    const res = await pool.query(
      `UPDATE trades SET
        symbol = $1, direction = $2, entry_price = $3, exit_price = $4,
        lot_size = $5, pnl = $6, stop_loss = $7, take_profit = $8,
        strategy = $9, notes = $10, fomo_check = $11, trend_alignment = $12,
        vengeance_trade = $13, updated_at = NOW()
       WHERE id = $14 AND user_id = $15
       RETURNING *`,
      [
        symbol, direction, entry, exit, lot, pnl,
        dto.stop_loss !== undefined ? dto.stop_loss : current.stop_loss,
        dto.take_profit !== undefined ? dto.take_profit : current.take_profit,
        dto.strategy !== undefined ? dto.strategy : current.strategy,
        dto.notes !== undefined ? dto.notes : current.notes,
        dto.fomo_check !== undefined ? dto.fomo_check : current.fomo_check,
        dto.trend_alignment !== undefined ? dto.trend_alignment : current.trend_alignment,
        dto.vengeance_trade !== undefined ? dto.vengeance_trade : current.vengeance_trade,
        id, userId,
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

    await pool.query("DELETE FROM trades WHERE id = $1 AND user_id = $2", [id, userId]);
    return { deleted: true };
  }

  async uploadImage(userId: string, id: string, filename: string) {
    // Verify ownership
    await this.findOne(userId, id);

    const imageUrl = `/uploads/${filename}`;
    const res = await pool.query(
      "UPDATE trades SET chart_image = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [imageUrl, id, userId],
    );
    return { chart_image: imageUrl };
  }

  async getDailyPnl(userId: string, from?: string, to?: string) {
    const conditions: string[] = ["user_id = $1"];
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

    const where = conditions.join(" AND ");
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
    const tradesRes = await pool.query(
      "SELECT * FROM trades WHERE user_id = $1 ORDER BY created_at ASC",
      [userId],
    );
    const trades = tradesRes.rows;

    if (trades.length === 0) {
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
        behavioralStats: { fomoCount: 0, vengeanceCount: 0, trendAlignedCount: 0 },
      };
    }

    const wins = trades.filter((t: any) => Number(t.pnl) > 0);
    const losses = trades.filter((t: any) => Number(t.pnl) < 0);

    const totalPnl = trades.reduce((s: number, t: any) => s + Number(t.pnl), 0);
    const grossProfit = wins.reduce((s: number, t: any) => s + Number(t.pnl), 0);
    const grossLoss = Math.abs(losses.reduce((s: number, t: any) => s + Number(t.pnl), 0));

    const winRate = trades.length > 0 ? wins.length / trades.length : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const expectancy = trades.length > 0
      ? (winRate * avgWin) - ((1 - winRate) * avgLoss)
      : 0;

    // Max consecutive wins/losses
    let maxConsWins = 0, maxConsLosses = 0, curWins = 0, curLosses = 0;
    for (const t of trades) {
      if (Number(t.pnl) > 0) { curWins++; curLosses = 0; }
      else if (Number(t.pnl) < 0) { curLosses++; curWins = 0; }
      else { curWins = 0; curLosses = 0; }
      maxConsWins = Math.max(maxConsWins, curWins);
      maxConsLosses = Math.max(maxConsLosses, curLosses);
    }

    // Max drawdown
    let peak = 0, equity = 0, maxDrawdown = 0;
    for (const t of trades) {
      equity += Number(t.pnl);
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const pnls = trades.map((t: any) => Number(t.pnl));
    const bestTrade = Math.max(...pnls);
    const worstTrade = Math.min(...pnls);

    // Avg R:R from trades that have SL and TP
    const rrTrades = trades.filter((t: any) => t.stop_loss && t.take_profit);
    let avgRR = 0;
    if (rrTrades.length > 0) {
      const rrs = rrTrades.map((t: any) => {
        const risk = Math.abs(Number(t.entry_price) - Number(t.stop_loss));
        const reward = Math.abs(Number(t.take_profit) - Number(t.entry_price));
        return risk > 0 ? reward / risk : 0;
      });
      avgRR = rrs.reduce((s: number, r: number) => s + r, 0) / rrs.length;
    }

    // By strategy
    const stratMap = new Map<string, { wins: number; losses: number; pnl: number }>();
    for (const t of trades) {
      const key = t.strategy || "No Strategy";
      const entry = stratMap.get(key) || { wins: 0, losses: 0, pnl: 0 };
      entry.pnl += Number(t.pnl);
      if (Number(t.pnl) > 0) entry.wins++;
      else if (Number(t.pnl) < 0) entry.losses++;
      stratMap.set(key, entry);
    }
    const byStrategy = Array.from(stratMap.entries()).map(([name, s]) => ({
      name,
      trades: s.wins + s.losses,
      winRate: (s.wins + s.losses) > 0 ? s.wins / (s.wins + s.losses) : 0,
      pnl: s.pnl,
    }));

    // By day of week
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayMap = new Map<number, { wins: number; total: number; pnl: number }>();
    for (const t of trades) {
      const d = new Date(t.created_at).getDay();
      const entry = dayMap.get(d) || { wins: 0, total: 0, pnl: 0 };
      entry.total++;
      entry.pnl += Number(t.pnl);
      if (Number(t.pnl) > 0) entry.wins++;
      dayMap.set(d, entry);
    }
    const byDayOfWeek = Array.from(dayMap.entries()).map(([d, s]) => ({
      day: days[d],
      trades: s.total,
      winRate: s.total > 0 ? s.wins / s.total : 0,
      pnl: s.pnl,
    }));

    // By month
    const monthMap = new Map<string, { wins: number; total: number; pnl: number }>();
    for (const t of trades) {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key) || { wins: 0, total: 0, pnl: 0 };
      entry.total++;
      entry.pnl += Number(t.pnl);
      if (Number(t.pnl) > 0) entry.wins++;
      monthMap.set(key, entry);
    }
    const byMonth = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, s]) => ({
        month,
        trades: s.total,
        winRate: s.total > 0 ? s.wins / s.total : 0,
        pnl: s.pnl,
      }));

    // Behavioral stats
    const fomoCount = trades.filter((t: any) => t.fomo_check).length;
    const vengeanceCount = trades.filter((t: any) => t.vengeance_trade).length;
    const trendAlignedCount = trades.filter((t: any) => t.trend_alignment).length;

    return {
      totalTrades: trades.length,
      totalPnl: Math.round(totalPnl * 100) / 100,
      winRate: Math.round(winRate * 10000) / 100,
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
      behavioralStats: { fomoCount, vengeanceCount, trendAlignedCount },
    };
  }

  async exportCsv(userId: string) {
    const res = await pool.query(
      "SELECT * FROM trades WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    const trades = res.rows;

    const headers = [
      "id", "symbol", "direction", "entry_price", "exit_price", "lot_size",
      "pnl", "stop_loss", "take_profit", "strategy", "notes",
      "fomo_check", "trend_alignment", "vengeance_trade", "created_at",
    ];

    const csvRows = [headers.join(",")];
    for (const t of trades) {
      const row = headers.map((h) => {
        const val = t[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      });
      csvRows.push(row.join(","));
    }

    return csvRows.join("\n");
  }
}

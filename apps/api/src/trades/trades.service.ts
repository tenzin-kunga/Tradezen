import { pool } from "../db";

export class TradesService {
  async create(trade: any) {
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
    } = trade;

    const pnl =
      direction === "buy"
        ? (exit - entry) * lot
        : (entry - exit) * lot;

    const res = await pool.query(
      `INSERT INTO trades (
        symbol, direction, entry_price, exit_price, lot_size, pnl,
        stop_loss, take_profit, strategy, notes,
        fomo_check, trend_alignment, vengeance_trade
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        symbol, direction, entry, exit, lot, pnl,
        stop_loss, take_profit, strategy, notes,
        fomo_check, trend_alignment, vengeance_trade,
      ]
    );

    return res.rows[0];
  }

  async findAll() {
    const res = await pool.query("SELECT * FROM trades ORDER BY created_at DESC");
    return res.rows;
  }

  async uploadImage(id: string, filename: string) {
    const imageUrl = `/uploads/${filename}`;
    const res = await pool.query(
      "UPDATE trades SET chart_image = $1 WHERE id = $2 RETURNING *",
      [imageUrl, id],
    );
    if (res.rowCount === 0) throw new Error(`Trade ${id} not found`);
    return { chart_image: imageUrl };
  }
}

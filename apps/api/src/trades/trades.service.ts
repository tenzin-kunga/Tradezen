import { pool } from "../db";

export class TradesService {
  async create(trade: any) {
    const { symbol, direction, entry, exit, lot } = trade;

    const pnl =
      direction === "buy"
        ? (exit - entry) * lot
        : (entry - exit) * lot;

    const res = await pool.query(
      `INSERT INTO trades (symbol, direction, entry_price, exit_price, lot_size, pnl)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [symbol, direction, entry, exit, lot, pnl]
    );

    return res.rows[0];
  }

  async findAll() {
    const res = await pool.query("SELECT * FROM trades");
    return res.rows;
  }
}

import { Pool } from "pg";

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER ?? "postgres",
      host: process.env.DB_HOST ?? "localhost",
      database: process.env.DB_NAME ?? "tradezen",
      password: process.env.DB_PASSWORD ?? "pass",
      port: Number(process.env.DB_PORT ?? 5432),
    });

export async function runMigrations() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trades (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      symbol TEXT,
      direction TEXT,
      entry_price NUMERIC,
      exit_price NUMERIC,
      lot_size NUMERIC,
      pnl NUMERIC,
      stop_loss NUMERIC,
      take_profit NUMERIC,
      strategy TEXT,
      notes TEXT,
      fomo_check BOOLEAN DEFAULT false,
      trend_alignment BOOLEAN DEFAULT false,
      vengeance_trade BOOLEAN DEFAULT false,
      chart_image TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS chart_image TEXT`);
}

-- 001_initial_trades.sql
-- Extracted from original db.ts inline migration

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC NOT NULL,
  lot_size NUMERIC NOT NULL,
  pnl NUMERIC NOT NULL,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  strategy TEXT,
  notes TEXT,
  fomo_check BOOLEAN DEFAULT false,
  trend_alignment BOOLEAN DEFAULT false,
  vengeance_trade BOOLEAN DEFAULT false,
  chart_image TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

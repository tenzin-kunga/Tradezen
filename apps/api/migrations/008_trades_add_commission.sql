-- 008_trades_add_commission.sql
-- Add commission/fees column to trades

ALTER TABLE trades ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;

-- 008_trades_add_commission.sql
-- Add commission/fees and contract_size columns to trades

ALTER TABLE trades ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS contract_size NUMERIC DEFAULT 100000;

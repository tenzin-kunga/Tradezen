-- 006_trades_add_trade_date.sql
-- Add trade_date column for user-specified execution date/time

ALTER TABLE trades ADD COLUMN IF NOT EXISTS trade_date TIMESTAMP;

-- Analytics-heavy queries need these indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_pnl ON trades(user_id, pnl);
CREATE INDEX IF NOT EXISTS idx_trades_user_date_pnl ON trades(user_id, trade_date, pnl);
CREATE INDEX IF NOT EXISTS idx_trades_user_symbol_pnl ON trades(user_id, symbol, pnl);
CREATE INDEX IF NOT EXISTS idx_trades_user_strategy_pnl ON trades(user_id, strategy, pnl);

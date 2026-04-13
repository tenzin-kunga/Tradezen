-- 007_user_settings.sql
-- User settings: initial capital, default lot size, timezone, theme

ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_capital NUMERIC DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_lot_size NUMERIC DEFAULT 0.01;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark';

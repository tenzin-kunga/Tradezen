-- Watchlist schema: symbols + watchlists + watchlist_items

CREATE TABLE symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  exchange TEXT,
  asset_type TEXT,
  currency TEXT,
  name TEXT,
  symbol_key TEXT NOT NULL UNIQUE,
  provider_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX idx_symbols_ticker_exchange ON symbols (ticker, exchange);
CREATE INDEX idx_symbols_symbol_key ON symbols (symbol_key);

CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  type TEXT NOT NULL DEFAULT 'manual',
  definition JSONB,
  definition_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_watchlists_user ON watchlists (user_id);

CREATE TABLE watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol_id UUID NOT NULL REFERENCES symbols(id),
  priority INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  tags JSONB DEFAULT '[]',
  alerts JSONB DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_watchlist_items_watchlist ON watchlist_items (watchlist_id);
CREATE INDEX idx_watchlist_items_symbol ON watchlist_items (symbol_id);

-- TradeZen OAuth Database Migration
-- Run this manually if drizzle-kit fails
-- Apply to PostgreSQL database

-- Make password_hash nullable (OAuth users don't have passwords)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add auth_method column to track login method
ALTER TABLE users ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'password';

-- Create accounts table for OAuth provider linking
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider_email TEXT,
  provider_username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

-- Indexes for performance
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider);

-- Set existing users to have auth_method = 'password' (explicit)
UPDATE users SET auth_method = 'password' WHERE auth_method IS NULL;
-- Add ai_providers JSONB column to user_settings for per-user API key storage
-- OpenRouter keys are stored encrypted (AES-256-GCM) via the application layer

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS ai_providers jsonb DEFAULT '{}';

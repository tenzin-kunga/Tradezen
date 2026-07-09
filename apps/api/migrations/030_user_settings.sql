-- Migration 0030: User settings store (separate from identity)

CREATE TABLE IF NOT EXISTS user_settings (
    user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    assistant_settings jsonb DEFAULT '{}'::jsonb,
    workspace_settings jsonb DEFAULT '{}'::jsonb,
    notification_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp DEFAULT NOW(),
    updated_at timestamp DEFAULT NOW()
);

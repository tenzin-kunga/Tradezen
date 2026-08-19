-- Migration 0007: Add summary, primaryType, tags, pinned to chat_threads

ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS primary_type varchar(50);
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;

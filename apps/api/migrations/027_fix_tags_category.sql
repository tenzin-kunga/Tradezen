-- 027_fix_tags_category.sql
-- Tags CHECK constraint too narrow — seed data uses 'psychology' and 'market'

ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_category_check;
ALTER TABLE tags ADD CONSTRAINT tags_category_check
  CHECK (category IN ('setup', 'condition', 'emotion', 'market', 'psychology'));

-- Add is_sample column migrations concurrently (safe IF NOT EXISTS)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;

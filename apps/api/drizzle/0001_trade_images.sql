CREATE TABLE trade_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_version INTEGER NOT NULL DEFAULT 1,
  width INTEGER,
  height INTEGER,
  format TEXT,
  bytes INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT trade_images_trade_order UNIQUE (trade_id, display_order)
);

CREATE INDEX idx_trade_images_trade ON trade_images(trade_id);
CREATE INDEX idx_trade_images_order ON trade_images(trade_id, display_order);

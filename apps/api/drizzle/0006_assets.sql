-- Assets service (reusable storage infra) + Research asset links

CREATE TYPE asset_status AS ENUM ('active', 'deleting', 'deleted', 'failed');
CREATE TYPE processing_status AS ENUM ('none', 'queued', 'processing', 'ready', 'failed');
CREATE TYPE document_category AS ENUM (
  'annual_report', 'quarterly_report', 'earnings_transcript', 'investor_presentation',
  'valuation', 'model', 'spreadsheet', 'chart', 'screenshot', 'news', 'other'
);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'cloudinary',
  provider_key TEXT NOT NULL,
  mime_type TEXT,
  file_name TEXT,
  file_size INTEGER,
  sha256_hash TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  status asset_status NOT NULL DEFAULT 'active',
  processing_status processing_status NOT NULL DEFAULT 'none',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_assets_status ON assets (status);
CREATE INDEX idx_assets_created ON assets (created_at);

CREATE TABLE research_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  category document_category NOT NULL DEFAULT 'other',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_research_assets_project ON research_assets (project_id);
CREATE INDEX idx_research_assets_asset ON research_assets (asset_id);
CREATE INDEX idx_research_assets_category ON research_assets (category);
CREATE INDEX idx_research_assets_created ON research_assets (created_at);

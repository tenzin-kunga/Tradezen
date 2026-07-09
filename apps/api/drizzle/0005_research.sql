-- Research Workspace schema (MVP)

CREATE TABLE research_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol_id UUID REFERENCES symbols(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idea',
  conviction TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_research_projects_user ON research_projects (user_id);
CREATE INDEX idx_research_projects_symbol ON research_projects (symbol_id);
CREATE INDEX idx_research_projects_status ON research_projects (status);

CREATE TABLE research_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_research_notes_project ON research_notes (project_id);

CREATE TABLE research_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
  thesis_complete BOOLEAN NOT NULL DEFAULT false,
  valuation_complete BOOLEAN NOT NULL DEFAULT false,
  risks_reviewed BOOLEAN NOT NULL DEFAULT false,
  earnings_reviewed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_research_checklists_project ON research_checklists (project_id);

CREATE TABLE research_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#888888',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_research_tags_project ON research_tags (project_id);

CREATE TABLE research_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  detail JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_research_activity_project ON research_activity (project_id);

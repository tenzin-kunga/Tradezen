-- Knowledge Workspace schema

CREATE TABLE knowledge_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_knowledge_folders_user ON knowledge_folders (user_id);
CREATE INDEX idx_knowledge_folders_parent ON knowledge_folders (parent_id);

CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id UUID,
  title TEXT NOT NULL,
  content TEXT,
  doc_type TEXT NOT NULL DEFAULT 'note',
  template_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  current_version INTEGER NOT NULL DEFAULT 1,
  ai_summary TEXT,
  frontmatter JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_knowledge_documents_user ON knowledge_documents (user_id);
CREATE INDEX idx_knowledge_documents_folder ON knowledge_documents (folder_id);
CREATE INDEX idx_knowledge_documents_type ON knowledge_documents (doc_type);
CREATE INDEX idx_knowledge_documents_status ON knowledge_documents (status);

CREATE TABLE knowledge_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_knowledge_versions_document ON knowledge_document_versions (document_id);

CREATE TABLE knowledge_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT,
  file_name TEXT,
  file_size INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_knowledge_assets_document ON knowledge_assets (document_id);

CREATE TABLE knowledge_document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  target_document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_knowledge_links_source ON knowledge_document_links (source_document_id);
CREATE INDEX idx_knowledge_links_target ON knowledge_document_links (target_document_id);

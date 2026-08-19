export enum SemanticSourceType {
  TRADE = 'trade',
  JOURNAL = 'journal',
  KNOWLEDGE_DOCUMENT = 'knowledge_document',
  RESEARCH_PROJECT = 'research_project',
  RESEARCH_DOCUMENT = 'research_document',
  AI_INSIGHT = 'ai_insight',
  COACHING = 'coaching',
}

export enum RetrievalIntent {
  CHAT = 'chat',
  REVIEW = 'review',
  REPORT = 'report',
  INSPECT = 'inspect',
  COACH = 'coach',
}

export type DocumentOperation = 'create' | 'update' | 'delete';

export interface DocumentProvenance {
  source: string;
  entity: string;
  operation: DocumentOperation;
  version?: number;
}

export interface SemanticDocument {
  id: string;
  userId: string;
  sourceType: SemanticSourceType;
  title?: string;
  content: string;
  metadata: Record<string, unknown>;
  provenance?: DocumentProvenance;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmbeddingRecord {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface SemanticResult {
  id: string;
  sourceType: SemanticSourceType;
  title: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface RetrievalProfile {
  maxResults: number;
  similarityThreshold: number;
  maxTokens: number;
}

export interface EmbeddingEvent {
  sourceType: SemanticSourceType;
  sourceId: string;
  userId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
}

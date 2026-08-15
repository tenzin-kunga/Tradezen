export interface TradeImagePreview {
  id: string;
  url: string;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}

// --- Retrieval contract (shared by NestJS API and Python ai-service) ---
// See docs/planning/2026-08-14-rag-consolidation-remediation.md §15.

export type RetrievalIntent =
  | 'chat'
  | 'review'
  | 'report'
  | 'inspect'
  | 'coach';

export type RetrievalSourceType =
  | 'trade'
  | 'journal'
  | 'memory'
  | 'knowledge_document'
  | 'research_project'
  | 'research_document'
  | 'ai_insight'
  | 'coaching';

export interface RetrievalRequest {
  query: string;
  intent: RetrievalIntent;
  sourceTypes?: RetrievalSourceType[];
  filters?: Record<string, unknown>;
  requestId: string;
  budgetTokens?: number; // global/context budget only — NOT retrieval algorithm tuning
}

export interface RetrievalResult {
  requestId: string;
  documents: Array<{
    documentId: string;
    chunkId?: string;
    sourceType: string;
    sourceId?: string;
    content: string;
    title?: string;
    score: number;
    retrievalMethod: 'vector' | 'keyword' | 'rrf';
    metadata?: Record<string, unknown>;
  }>;
  debug: {
    candidates: number;
    filtered: number;
    latencyMs: number;
    method: 'hybrid' | 'vector';
    breakdown: Record<string, number>;
    degraded?: boolean; // true when retrieval failed and documents were emptied
  };
}

// Ownership marker: set when a request's context is fully assembled by NestJS
// and Python must NOT build its own context / run autonomous RAG.
export const CONTEXT_OWNED_BY_NESTJS = 'context-owned-by-nestjs';


export type Trade = {
  id: string;
  userId: string;
  symbol: string;
  direction: "buy" | "sell";
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  pnl: number;
  stopLoss: number | null;
  takeProfit: number | null;
  strategy: string | null;
  notes: string | null;
  chartImage: string | null;
  fomoCheck: boolean;
  trendAlignment: boolean;
  vengeanceTrade: boolean;
  commission: number | null;
  tradeDate: string | null;
  contractSize: number | null;
  createdAt: string;
  updatedAt: string;
  previewImage?: TradeImagePreview | null;
  imageCount?: number;
  hasImages?: boolean;
  riskReward?: number | null;
};

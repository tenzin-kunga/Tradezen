export interface ContextRequest {
  providers?: string[];
  entities?: string[];
  tradeIds?: string[];
  researchIds?: string[];
  portfolio?: boolean;
  limit?: number;
}

export interface ContextBlock {
  source: string;
  title: string;
  priority: number;
  freshness: string;
  tokens: number;
  content: string;
  relevance?: number;
  dataCompleteness?: number;
  retrievalReason?: string;
}

export interface RetrievalTrace {
  type: "retrieval";
  timestamp: string;
  scores: Array<{
    provider: string;
    score: number;
    reasons: string[];
    filtered: boolean;
  }>;
  budgetAllocated: Record<string, number>;
  budgetUsed: Record<string, number>;
  totalTokens: number;
  warnings: string[];
  latencies: Record<string, number>;
}

export interface BuiltContext {
  blocks: ContextBlock[];
  totalTokens: number;
  warnings: string[];
  metadata: {
    providersUsed: string[];
    providersSkipped: string[];
    latencies: Record<string, number>;
    retrievalTrace?: RetrievalTrace;
  };
}

export function buildReviewRequest(limit = 10): ContextRequest {
  return { providers: ["trades", "analytics"], limit };
}

export function buildResearchRequest(entity: string): ContextRequest {
  return { providers: ["research", "documents"], entities: [entity] };
}

export function buildExplainRequest(tradeId: string): ContextRequest {
  return { providers: ["trades"], tradeIds: [tradeId] };
}

export function buildPortfolioRequest(): ContextRequest {
  return { providers: ["portfolio"], portfolio: true };
}

export function buildFullContext(): ContextRequest {
  return {};
}

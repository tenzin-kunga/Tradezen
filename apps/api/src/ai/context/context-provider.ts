export interface ContextRequest {
  providers?: string[];
  entities?: string[];
  tradeIds?: string[];
  researchIds?: string[];
  portfolio?: boolean;
  limit?: number;
}

// --- Scoring ---

export interface ScoringRule {
  id: string;
  weight: number;
  predicate(message: string): boolean;
}

export interface ProviderScore {
  provider: string;
  score: number;
  reasons: string[];
}

// --- Context blocks ---

export interface ContextBlock {
  source: string;
  title: string;
  priority: number;
  freshness: Date;
  tokens: number;
  content: string;
  relevance?: number;
  dataCompleteness?: number;
  retrievalReason?: string;
}

// --- Tracing ---

export interface TraceEvent {
  type: 'retrieval' | 'tool';
  timestamp: Date;
}

export interface RetrievalTrace extends TraceEvent {
  type: 'retrieval';
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

export interface ToolTrace extends TraceEvent {
  type: 'tool';
  toolName: string;
  args: Record<string, unknown>;
  success: boolean;
  latencyMs: number;
  suggestedActions?: WorkspaceAction[];
}

// --- Workspace actions ---

export interface WorkspaceAction<T = Record<string, unknown>> {
  version: 1;
  kind: 'navigate' | 'create' | 'update' | 'open';
  module: string;
  params: T;
  label: string;
}

// --- Built context ---

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

// --- Provider ---

export interface ProviderCapability {
  id: string;
  description: string;
  patterns: string[];
}

export interface ContextProvider {
  id: string;
  priority: number;
  timeoutMs: number;
  cacheMs: number;
  capabilities(): ProviderCapability[];
  scoringRules(): ScoringRule[];
  score(request: ContextRequest, lastUserMessage?: string): ProviderScore;
  dataCompleteness(block: ContextBlock | null, request: ContextRequest): number;
  supports(request: ContextRequest): boolean;
  build(
    userId: string,
    request: ContextRequest,
    lastUserMessage?: string,
  ): Promise<ContextBlock>;
}

export const TOTAL_TOKEN_BUDGET = 2000;
export const SCORE_THRESHOLD = 0.1;

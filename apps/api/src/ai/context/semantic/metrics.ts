export interface ShadowComparison {
  oldLatencyMs: number;
  newLatencyMs: number;
  oldCount: number;
  newCount: number;
  oldAvgScore: number;
  newAvgScore: number;
  oldTokens: number;
  newTokens: number;
  degraded: boolean;
}

export interface SemanticMetrics {
  embeddingLatency: Record<string, number>;
  retrievalLatency: number;
  chunkCount: Record<string, number>;
  similarityDistribution: number[];
  documentsIndexed: number;
  totalEmbeddings: number;
  shadowComparisons: ShadowComparison[];
}

export interface SemanticMetrics {
  embeddingLatency: Record<string, number>;
  retrievalLatency: number;
  chunkCount: Record<string, number>;
  similarityDistribution: number[];
  documentsIndexed: number;
  totalEmbeddings: number;
}

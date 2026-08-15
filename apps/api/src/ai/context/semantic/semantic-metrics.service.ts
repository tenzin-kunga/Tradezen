import { Injectable } from '@nestjs/common';
import type { SemanticMetrics, ShadowComparison } from './metrics';

@Injectable()
export class SemanticMetricsService {
  private embeddingLatencySum: Record<string, number> = {};
  private embeddingLatencyCount: Record<string, number> = {};
  private retrievalLatencies: number[] = [];
  private similarityScores: number[] = [];
  private documentsIndexed = 0;
  private totalEmbeddings = 0;
  private shadowComparisons: ShadowComparison[] = [];

  private readonly maxSamples = 100;

  recordEmbedding(sourceType: string, latencyMs: number, chunks: number): void {
    this.embeddingLatencySum[sourceType] =
      (this.embeddingLatencySum[sourceType] ?? 0) + latencyMs;
    this.embeddingLatencyCount[sourceType] =
      (this.embeddingLatencyCount[sourceType] ?? 0) + 1;
    this.documentsIndexed += 1;
    this.totalEmbeddings += chunks;
  }

  recordRetrieval(latencyMs: number, similarities: number[]): void {
    this.retrievalLatencies.push(latencyMs);
    if (this.retrievalLatencies.length > this.maxSamples) {
      this.retrievalLatencies.shift();
    }
    for (const s of similarities) {
      this.similarityScores.push(s);
    }
    while (this.similarityScores.length > this.maxSamples) {
      this.similarityScores.shift();
    }
  }

  recordShadowComparison(comparison: ShadowComparison): void {
    this.shadowComparisons.push(comparison);
    if (this.shadowComparisons.length > this.maxSamples) {
      this.shadowComparisons.shift();
    }
  }

  recordEmbeddingCount(count: number): void {
    this.totalEmbeddings = count;
  }

  getMetrics(): SemanticMetrics {
    const embeddingLatency: Record<string, number> = {};
    for (const [k, sum] of Object.entries(this.embeddingLatencySum)) {
      embeddingLatency[k] = Math.round(
        sum / (this.embeddingLatencyCount[k] ?? 1),
      );
    }

    const avgRetrieval =
      this.retrievalLatencies.length > 0
        ? Math.round(
            this.retrievalLatencies.reduce((a, b) => a + b, 0) /
              this.retrievalLatencies.length,
          )
        : 0;

    return {
      embeddingLatency,
      retrievalLatency: avgRetrieval,
      chunkCount: { ...this.embeddingLatencyCount },
      similarityDistribution: [...this.similarityScores],
      documentsIndexed: this.documentsIndexed,
      totalEmbeddings: this.totalEmbeddings,
      shadowComparisons: [...this.shadowComparisons],
    };
  }

  reset(): void {
    this.embeddingLatencySum = {};
    this.embeddingLatencyCount = {};
    this.retrievalLatencies = [];
    this.similarityScores = [];
    this.documentsIndexed = 0;
    this.totalEmbeddings = 0;
    this.shadowComparisons = [];
  }
}

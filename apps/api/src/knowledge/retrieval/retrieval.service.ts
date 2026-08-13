import { Injectable, Logger } from '@nestjs/common';
import { db } from '../../db/drizzle';
import {
  embeddings,
  knowledgeDocumentLinks,
  knowledgeDocuments,
} from '@tradezen/db';
import { eq, sql } from 'drizzle-orm';
import { EmbeddingService } from '../../ai/embedding.service';

// ─── Retrieval Profiles ──────────────────────

export interface RetrievalProfile {
  name: string;
  maxResults: number;
  similarityThreshold: number;
  includeSemantic: boolean;
  includeExplicit: boolean;
  includeTrades: boolean;
  includeJournals: boolean;
  maxContextTokens: number;
}

export const RETRIEVAL_PROFILES: Record<string, RetrievalProfile> = {
  fast: {
    name: 'fast',
    maxResults: 5,
    similarityThreshold: 0.6,
    includeSemantic: true,
    includeExplicit: false,
    includeTrades: false,
    includeJournals: false,
    maxContextTokens: 500,
  },
  inspector: {
    name: 'inspector',
    maxResults: 10,
    similarityThreshold: 0.7,
    includeSemantic: true,
    includeExplicit: true,
    includeTrades: true,
    includeJournals: true,
    maxContextTokens: 1500,
  },
  chat: {
    name: 'chat',
    maxResults: 15,
    similarityThreshold: 0.7,
    includeSemantic: true,
    includeExplicit: true,
    includeTrades: true,
    includeJournals: true,
    maxContextTokens: 3000,
  },
  report: {
    name: 'report',
    maxResults: 20,
    similarityThreshold: 0.6,
    includeSemantic: true,
    includeExplicit: true,
    includeTrades: true,
    includeJournals: true,
    maxContextTokens: 5000,
  },
};

// ─── Evidence Model ──────────────────────────

export interface Evidence {
  source: string;
  score: number;
  reason: string;
  matchedChunks: string[];
  highlights: string[];
}

export interface RelatedResult {
  id: string;
  type: string;
  title: string;
  score: number;
  evidence: Evidence[];
}

export interface DocumentContext {
  document: {
    id: string;
    title: string;
    content: string;
    summary: string;
  };
  related: {
    documents: RelatedResult[];
    trades: RelatedResult[];
    journals: RelatedResult[];
  };
  semantic: {
    chunks: Array<{ content: string; similarity: number }>;
  };
  citations: {
    sources: string[];
  };
}

// ─── Retrieval Service ───────────────────────

@Injectable()
export class KnowledgeRetrievalService {
  private readonly logger = new Logger(KnowledgeRetrievalService.name);

  constructor(private readonly embeddingService: EmbeddingService) {}

  async semanticSearch(
    userId: string,
    query: string,
    profileName: string = 'fast',
  ): Promise<RelatedResult[]> {
    const profile = RETRIEVAL_PROFILES[profileName] || RETRIEVAL_PROFILES.fast;

    try {
      const queryVector = await this.embeddingService.generateEmbedding(
        userId,
        query,
      );

      const results = await db
        .select({
          sourceType: embeddings.sourceType,
          sourceId: embeddings.sourceId,
          content: embeddings.content,
          similarity: sql<number>`1 - (${embeddings.embedding} <=> ${queryVector}::vector)`,
        })
        .from(embeddings)
        .where(eq(embeddings.userId, userId))
        .orderBy(sql`${embeddings.embedding} <=> ${queryVector}::vector`)
        .limit(profile.maxResults);

      return results
        .filter((r) => r.similarity >= profile.similarityThreshold)
        .map((r) => ({
          id: r.sourceId,
          type: r.sourceType,
          title: r.content.slice(0, 100),
          score: r.similarity,
          evidence: [
            {
              source: 'semantic',
              score: r.similarity,
              reason: `Matched: "${r.content.slice(0, 50)}..."`,
              matchedChunks: [r.content],
              highlights: [],
            },
          ],
        }));
    } catch (e) {
      this.logger.error(`Semantic search failed: ${e}`);
      return [];
    }
  }

  async findRelated(
    resourceType: string,
    resourceId: string,
    profileName: string = 'inspector',
    userId?: string,
  ): Promise<RelatedResult[]> {
    const profile =
      RETRIEVAL_PROFILES[profileName] || RETRIEVAL_PROFILES.inspector;
    const results: RelatedResult[] = [];

    // 1. Explicit links
    if (profile.includeExplicit) {
      const links = await db
        .select()
        .from(knowledgeDocumentLinks)
        .where(eq(knowledgeDocumentLinks.sourceDocumentId, resourceId));

      for (const link of links) {
        const doc = await db
          .select({
            id: knowledgeDocuments.id,
            title: knowledgeDocuments.title,
          })
          .from(knowledgeDocuments)
          .where(eq(knowledgeDocuments.id, link.targetDocumentId))
          .limit(1);

        if (doc.length > 0) {
          results.push({
            id: doc[0].id,
            type: 'knowledge_document',
            title: doc[0].title,
            score: 0.9,
            evidence: [
              {
                source: 'explicit',
                score: 0.9,
                reason: `Linked: ${link.relationshipType}`,
                matchedChunks: [],
                highlights: [link.relationshipType],
              },
            ],
          });
        }
      }
    }

    // 2. Semantic similarity
    if (profile.includeSemantic) {
      const doc = await db
        .select({ content: knowledgeDocuments.content })
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.id, resourceId))
        .limit(1);

      if (doc.length > 0 && doc[0].content) {
        const semanticResults = await this.semanticSearch(
          userId ?? 'system',
          doc[0].content.slice(0, 500),
          'fast',
        );

        for (const sr of semanticResults) {
          if (sr.id !== resourceId && !results.find((r) => r.id === sr.id)) {
            results.push(sr);
          }
        }
      }
    }

    // 3. Sort by score and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, profile.maxResults);
  }

  async getDocumentContext(
    documentId: string,
    userId: string,
    profileName: string = 'inspector',
  ): Promise<DocumentContext | null> {
    const doc = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, documentId))
      .limit(1);

    if (doc.length === 0) return null;

    const document = doc[0];
    const related = await this.findRelated(
      'knowledge_document',
      documentId,
      profileName,
      userId,
    );

    return {
      document: {
        id: document.id,
        title: document.title,
        content: document.content || '',
        summary: document.aiSummary || '',
      },
      related: {
        documents: related.filter((r) => r.type === 'knowledge_document'),
        trades: related.filter((r) => r.type === 'trade'),
        journals: related.filter((r) => r.type === 'journal'),
      },
      semantic: {
        chunks: [], // Populated by semantic search if needed
      },
      citations: {
        sources: related
          .filter((r) => r.type === 'knowledge_document')
          .map((r) => r.title),
      },
    };
  }

  // Hybrid ranker
  rankResults(
    results: RelatedResult[],
    weights: {
      semantic: number;
      explicit: number;
      recency: number;
      importance: number;
    } = { semantic: 0.5, explicit: 0.3, recency: 0.15, importance: 0.05 },
  ): RelatedResult[] {
    return results.sort((a, b) => {
      const scoreA =
        a.score * weights.semantic +
        (a.evidence.some((e) => e.source === 'explicit')
          ? weights.explicit
          : 0);
      const scoreB =
        b.score * weights.semantic +
        (b.evidence.some((e) => e.source === 'explicit')
          ? weights.explicit
          : 0);
      return scoreB - scoreA;
    });
  }
}

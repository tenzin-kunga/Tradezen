import { Inject, Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { knowledgeDocuments } from '@tradezen/db';
import { eq } from 'drizzle-orm';
import { AIClient } from '../ai/ai-client';
import type { EmbeddingPipeline } from '../ai/context/semantic/embedding-pipeline';
import { FormatterRegistry } from '../ai/context/semantic/formatters/registry';
import { SemanticSourceType } from '../ai/context/semantic/types';

const SUMMARY_SYSTEM_PROMPT = `You are a trading research assistant. Summarize the following knowledge document in 2-3 concise sentences. Focus on the core thesis, key facts, and risks. No greetings, no questions, no markdown headers.`;

const MAX_SUMMARY_INPUT_CHARS = 6000;

@Injectable()
export class KnowledgeEnrichmentService {
  private readonly logger = new Logger(KnowledgeEnrichmentService.name);

  constructor(
    @Inject('EmbeddingPipeline') private readonly pipeline: EmbeddingPipeline,
    private readonly aiClient: AIClient,
    private readonly formatterRegistry: FormatterRegistry,
  ) {}

  async enrichDocument(
    userId: string,
    documentId: string,
    content: string,
  ): Promise<void> {
    if (!content || content.trim().length === 0) return;

    const [doc] = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, documentId))
      .limit(1);
    const formatter = this.formatterRegistry.get(
      SemanticSourceType.KNOWLEDGE_DOCUMENT,
    );
    const canonical = doc && formatter ? formatter.format(doc, userId) : null;

    await Promise.all([
      canonical
        ? this.pipeline
            .enqueue(canonical)
            .catch((e) =>
              this.logger.error(`Failed to embed document ${documentId}: ${e}`),
            )
        : Promise.resolve(),
      this.generateSummary(documentId, content).catch((e) =>
        this.logger.error(`Failed to summarize document ${documentId}: ${e}`),
      ),
    ]);
  }

  private async generateSummary(
    documentId: string,
    content: string,
  ): Promise<void> {
    const input =
      content.length > MAX_SUMMARY_INPUT_CHARS
        ? content.slice(0, MAX_SUMMARY_INPUT_CHARS)
        : content;
    if (input !== content) {
      this.logger.warn(
        `Summary input truncated from ${content.length} to ${MAX_SUMMARY_INPUT_CHARS} chars for document ${documentId}`,
      );
    }
    const response = await this.aiClient.complete([
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: input },
    ]);

    const summary = response?.content?.trim();
    if (!summary) return;

    await db
      .update(knowledgeDocuments)
      .set({ aiSummary: summary })
      .where(eq(knowledgeDocuments.id, documentId));
  }
}

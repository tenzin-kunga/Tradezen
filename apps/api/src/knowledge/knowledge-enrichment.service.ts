import { Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { knowledgeDocuments } from '@tradezen/db';
import { eq } from 'drizzle-orm';
import { DocumentEmbedder } from './indexing/embedder';
import { AIClient } from '../ai/ai-client';

const SUMMARY_SYSTEM_PROMPT = `You are a trading research assistant. Summarize the following knowledge document in 2-3 concise sentences. Focus on the core thesis, key facts, and risks. No greetings, no questions, no markdown headers.`;

const MAX_SUMMARY_INPUT_CHARS = 6000;

@Injectable()
export class KnowledgeEnrichmentService {
  private readonly logger = new Logger(KnowledgeEnrichmentService.name);

  constructor(
    private readonly embedder: DocumentEmbedder,
    private readonly aiClient: AIClient,
  ) {}

  async enrichDocument(
    userId: string,
    documentId: string,
    content: string,
  ): Promise<void> {
    if (!content || content.trim().length === 0) return;

    await Promise.all([
      this.embedder
        .embedDocument(userId, documentId, content)
        .catch((e) =>
          this.logger.error(`Failed to embed document ${documentId}: ${e}`),
        ),
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

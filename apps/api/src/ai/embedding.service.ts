import { Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { embeddings } from '@tradezen/db';
import { UserSettingsService } from '../user-settings/user-settings.service';

export const EMBEDDING_VERSION = 1;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger('EmbeddingService');
  private readonly embeddingModel =
    process.env.EMBEDDING_MODEL?.trim() || 'openai/text-embedding-3-small';

  constructor(private readonly userSettings: UserSettingsService) {}

  getModelInfo(): { model: string; version: number } {
    return { model: this.embeddingModel, version: EMBEDDING_VERSION };
  }

  async generateEmbedding(userId: string, text: string): Promise<number[]> {
    const creds = await this.userSettings.getDecryptedApiKey(userId);
    const cloudApiKey = creds?.key;
    if (!cloudApiKey) {
      throw new Error(
        'No API key configured for this user. Add one in Settings.',
      );
    }
    const cloudBaseUrl = creds?.baseUrl ?? 'https://openrouter.ai/api/v1';
    const response = await fetch(`${cloudBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cloudApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.embeddingModel, input: [text] }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async storeEmbedding(
    userId: string,
    sourceType: string,
    sourceId: string,
    content: string,
    embedding: number[],
  ): Promise<void> {
    await db.insert(embeddings).values({
      userId,
      sourceType,
      sourceId,
      content,
      embedding,
      embeddingModel: this.embeddingModel,
      embeddingVersion: EMBEDDING_VERSION,
    });
  }

  async embedAndStore(
    userId: string,
    sourceType: string,
    sourceId: string,
    content: string,
  ): Promise<void> {
    const embedding = await this.generateEmbedding(userId, content);
    await this.storeEmbedding(userId, sourceType, sourceId, content, embedding);
  }
}

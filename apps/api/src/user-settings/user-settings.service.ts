import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { userSettings, type AiProvidersConfig } from '@tradezen/db';
import { EncryptionService } from '../crypto/encryption.service';

export interface UserSettingsRow {
  userId: string;
  assistantSettings: {
    activeModels?: string[];
    defaultModel?: string;
    temperature?: number;
    reasoningMode?: 'auto' | 'on' | 'off';
    aiProviders?: AiProvidersConfig;
  };
  workspaceSettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ApiKeyStatus {
  configured: boolean;
  provider: string | null;
  validated: boolean;
  validatedAt: string | null;
  lastError: string | null;
}

@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger('UserSettings');

  constructor(private readonly encryption: EncryptionService) {}

  async get(userId: string): Promise<UserSettingsRow> {
    const [row] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    if (!row) {
      const [created] = await db
        .insert(userSettings)
        .values({ userId })
        .returning();
      return created as UserSettingsRow;
    }
    return row as UserSettingsRow;
  }

  async update(
    userId: string,
    dto: {
      assistantSettings?: Record<string, unknown>;
      workspaceSettings?: Record<string, unknown>;
      notificationSettings?: Record<string, unknown>;
    },
  ): Promise<UserSettingsRow> {
    const existing = await this.get(userId);
    const merged = {
      assistantSettings: {
        ...existing.assistantSettings,
        ...(dto.assistantSettings ?? {}),
      },
      workspaceSettings: {
        ...existing.workspaceSettings,
        ...(dto.workspaceSettings ?? {}),
      },
      notificationSettings: {
        ...existing.notificationSettings,
        ...(dto.notificationSettings ?? {}),
      },
    };

    const [updated] = await db
      .update(userSettings)
      .set({ ...merged, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    return updated as UserSettingsRow;
  }

  async getActiveModels(userId: string): Promise<string[]> {
    const settings = await this.get(userId);
    return settings.assistantSettings?.activeModels ?? ['qwen3:latest'];
  }

  async setActiveModels(userId: string, models: string[]): Promise<void> {
    await this.update(userId, { assistantSettings: { activeModels: models } });
  }

  // --- API Key management ---

  async getApiKeyStatus(userId: string): Promise<ApiKeyStatus> {
    const settings = await this.get(userId);
    const cloudConfig = settings.assistantSettings?.aiProviders?.cloud;
    if (!cloudConfig?.encryptedKey) {
      return {
        configured: false,
        provider: null,
        validated: false,
        validatedAt: null,
        lastError: null,
      };
    }
    return {
      configured: true,
      provider: cloudConfig.provider ?? null,
      validated: cloudConfig.status?.validated ?? false,
      validatedAt: cloudConfig.status?.validatedAt ?? null,
      lastError: cloudConfig.status?.lastError ?? null,
    };
  }

  async setApiKey(
    userId: string,
    apiKey: string,
    provider: string,
    validated: boolean,
    error?: string,
    baseUrl?: string,
  ): Promise<ApiKeyStatus> {
    if (!this.encryption.isConfigured) {
      throw new Error('Encryption not configured — cannot store API keys');
    }
    const encryptedKey = this.encryption.encrypt(apiKey);
    const status = {
      validated,
      validatedAt: new Date().toISOString(),
      lastError: error ?? null,
    };

    const existingProviders =
      (await this.get(userId)).assistantSettings?.aiProviders ?? {};
    await this.update(userId, {
      assistantSettings: {
        aiProviders: {
          ...existingProviders,
          cloud: { provider, encryptedKey, status, baseUrl },
        },
      },
    });

    this.logger.log(
      `${provider} API key ${validated ? 'saved' : 'saved (unvalidated)'} for user ${userId}`,
    );
    return this.getApiKeyStatus(userId);
  }

  async deleteApiKey(userId: string): Promise<ApiKeyStatus> {
    const existingProviders =
      (await this.get(userId)).assistantSettings?.aiProviders ?? {};
    await this.update(userId, {
      assistantSettings: {
        aiProviders: { ...existingProviders, cloud: null },
      },
    });
    this.logger.log(`API key removed for user ${userId}`);
    return this.getApiKeyStatus(userId);
  }

  async getDecryptedApiKey(
    userId: string,
  ): Promise<{ key: string; provider: string; baseUrl?: string } | null> {
    const settings = await this.get(userId);
    const cloudConfig = settings.assistantSettings?.aiProviders?.cloud;
    if (!cloudConfig?.encryptedKey) return null;
    try {
      const key = this.encryption.decrypt(cloudConfig.encryptedKey);
      return {
        key,
        provider: cloudConfig.provider ?? 'cloud',
        baseUrl: cloudConfig.baseUrl,
      };
    } catch {
      this.logger.warn(`Failed to decrypt API key for user ${userId}`);
      return null;
    }
  }
}

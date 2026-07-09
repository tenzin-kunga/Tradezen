import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { db } from '../db/drizzle';
import { assets } from '@tradezen/db';
import { eq, inArray } from 'drizzle-orm';
import { CloudinaryProvider } from '../storage/cloudinary.provider';
import type { UploadFile } from '../storage/storage.provider';

export interface StoredAsset {
  id: string;
  provider: string;
  providerKey: string;
  version: number;
  mimeType: string | null;
  fileName: string | null;
  fileSize: number | null;
  sha256Hash: string | null;
  status: string;
  processingStatus: string;
  createdAt: Date;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(private readonly storage: CloudinaryProvider) {}

  async upload(
    file: UploadFile,
    uploadedBy: string,
    source = 'manual',
  ): Promise<StoredAsset> {
    const result = await this.storage.upload(file);
    const [row] = await db
      .insert(assets)
      .values({
        provider: 'cloudinary',
        providerKey: result.providerKey,
        mimeType: file.mimetype,
        fileName: file.originalname ?? null,
        fileSize: file.size,
        sha256Hash: createHash('sha256').update(file.buffer).digest('hex'),
        uploadedBy,
        source,
      })
      .returning();

    return this.toStored(row);
  }

  async getMetadata(assetId: string): Promise<StoredAsset | null> {
    const [row] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1);
    return row ? this.toStored(row) : null;
  }

  getUrl(
    stored: StoredAsset,
    kind: 'original' | 'thumbnail' = 'original',
  ): string {
    // Cloudinary URLs resolve without an explicit version, so 0 is fine.
    if (kind === 'thumbnail') {
      return this.storage.getThumbnailUrl(
        stored.providerKey,
        0,
        stored.mimeType ?? undefined,
      );
    }
    return this.storage.getOriginalUrl(
      stored.providerKey,
      0,
      stored.mimeType ?? undefined,
    );
  }

  async deleteStorageObject(stored: StoredAsset): Promise<void> {
    await this.storage.delete(stored.providerKey);
  }

  /** Retry-safe: delete the Cloudinary object for any asset in a deletable state. */
  async retryDeletions(): Promise<number> {
    const candidates = await db
      .select()
      .from(assets)
      .where(inArray(assets.status, ['deleting', 'failed']))
      .limit(50);

    let done = 0;
    for (const row of candidates) {
      const stored = this.toStored(row);
      try {
        await this.deleteStorageObject(stored);
        await db
          .update(assets)
          .set({ status: 'deleted' })
          .where(eq(assets.id, stored.id));
        done += 1;
      } catch (e) {
        await db
          .update(assets)
          .set({ status: 'failed' })
          .where(eq(assets.id, stored.id));
        this.logger.error(`Asset cleanup failed for ${stored.id}: ${e}`);
      }
    }
    return done;
  }

  private toStored(row: typeof assets.$inferSelect): StoredAsset {
    return {
      id: row.id,
      provider: row.provider,
      providerKey: row.providerKey,
      version: 0,
      mimeType: row.mimeType,
      fileName: row.fileName,
      fileSize: row.fileSize,
      sha256Hash: row.sha256Hash,
      status: row.status,
      processingStatus: row.processingStatus,
      createdAt: row.createdAt,
    };
  }
}

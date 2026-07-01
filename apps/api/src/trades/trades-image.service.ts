import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, asc, count, sql, inArray } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { tradeImages, trades } from '@tradezen/db';
import { CloudinaryProvider } from '../storage/cloudinary.provider';
import { storageConfig } from '../storage/storage.config';
import { ImageResponseDto } from './dto/image.dto';

@Injectable()
export class TradeImageService {
  constructor(private readonly storageProvider: CloudinaryProvider) {}

  async uploadImage(
    userId: string,
    tradeId: string,
    file: Express.Multer.File,
  ): Promise<ImageResponseDto> {
    // Validate trade ownership
    const trade = await this.findTradeWithOwnership(tradeId, userId);
    if (!trade) throw new ForbiddenException();

    // Validate file
    this.validateFile(file);

    // Check image count
    await this.checkImageCount(tradeId);

    // Upload to Cloudinary
    const result = await this.storageProvider.upload({
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Get next display order
    const nextOrder = await this.getNextDisplayOrder(tradeId);

    // Insert to database
    try {
      const image = await db
        .insert(tradeImages)
        .values({
          tradeId,
          cloudinaryPublicId: result.publicId,
          cloudinaryVersion: result.version,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          displayOrder: nextOrder,
        })
        .returning();

      return this.formatImageResponse(image[0]);
    } catch (error) {
      // Rollback: delete uploaded asset
      await this.storageProvider.delete(result.publicId, result.version);
      throw error;
    }
  }

  async deleteImage(
    userId: string,
    tradeId: string,
    imageId: string,
  ): Promise<void> {
    // Validate trade ownership
    const trade = await this.findTradeWithOwnership(tradeId, userId);
    if (!trade) throw new ForbiddenException();

    // Find image
    const image = await db.query.tradeImages.findFirst({
      where: and(eq(tradeImages.id, imageId), eq(tradeImages.tradeId, tradeId)),
    });
    if (!image) throw new NotFoundException();

    // Delete from Cloudinary
    await this.storageProvider.delete(
      image.cloudinaryPublicId,
      image.cloudinaryVersion,
    );

    // Delete from database
    await db.delete(tradeImages).where(eq(tradeImages.id, imageId));
  }

  async replaceImage(
    userId: string,
    tradeId: string,
    imageId: string,
    file: Express.Multer.File,
  ): Promise<ImageResponseDto> {
    // Validate trade ownership
    const trade = await this.findTradeWithOwnership(tradeId, userId);
    if (!trade) throw new ForbiddenException();

    // Find existing image
    const existingImage = await db.query.tradeImages.findFirst({
      where: and(eq(tradeImages.id, imageId), eq(tradeImages.tradeId, tradeId)),
    });
    if (!existingImage) throw new NotFoundException();

    // Validate file
    this.validateFile(file);

    // Upload new asset
    const newResult = await this.storageProvider.upload({
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Update database
    const updated = await db
      .update(tradeImages)
      .set({
        cloudinaryPublicId: newResult.publicId,
        cloudinaryVersion: newResult.version,
        width: newResult.width,
        height: newResult.height,
        format: newResult.format,
        bytes: newResult.bytes,
        updatedAt: new Date(),
      })
      .where(eq(tradeImages.id, imageId))
      .returning();

    // Delete old Cloudinary asset
    await this.storageProvider.delete(
      existingImage.cloudinaryPublicId,
      existingImage.cloudinaryVersion,
    );

    return this.formatImageResponse(updated[0]);
  }

  async reorderImages(
    userId: string,
    tradeId: string,
    imageOrders: { id: string; displayOrder: number }[],
  ): Promise<void> {
    // Validate trade ownership
    const trade = await this.findTradeWithOwnership(tradeId, userId);
    if (!trade) throw new ForbiddenException();

    await db.transaction(async (tx) => {
      // Set temporary negative orders to avoid conflicts
      for (const item of imageOrders) {
        await tx
          .update(tradeImages)
          .set({ displayOrder: -1 })
          .where(
            and(eq(tradeImages.id, item.id), eq(tradeImages.tradeId, tradeId)),
          );
      }

      // Set final orders
      for (const item of imageOrders) {
        await tx
          .update(tradeImages)
          .set({ displayOrder: item.displayOrder })
          .where(
            and(eq(tradeImages.id, item.id), eq(tradeImages.tradeId, tradeId)),
          );
      }
    });
  }

  async getImages(tradeId: string): Promise<ImageResponseDto[]> {
    const images = await db.query.tradeImages.findMany({
      where: eq(tradeImages.tradeId, tradeId),
      orderBy: [asc(tradeImages.displayOrder)],
    });

    return images.map((img) => this.formatImageResponse(img));
  }

  async getThumbnail(tradeId: string): Promise<ImageResponseDto | null> {
    const images = await db.query.tradeImages.findMany({
      where: eq(tradeImages.tradeId, tradeId),
      orderBy: [asc(tradeImages.displayOrder)],
      limit: 1,
    });

    return images.length > 0 ? this.formatImageResponse(images[0]) : null;
  }

  async getImageCount(tradeId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(tradeImages)
      .where(eq(tradeImages.tradeId, tradeId));
    return Number(result[0]?.count ?? 0);
  }

  async getThumbnails(
    tradeIds: string[],
  ): Promise<Map<string, ImageResponseDto>> {
    if (tradeIds.length === 0) return new Map();

    const results = await db
      .selectDistinctOn([tradeImages.tradeId])
      .from(tradeImages)
      .where(inArray(tradeImages.tradeId, tradeIds))
      .orderBy(asc(tradeImages.tradeId), asc(tradeImages.displayOrder));

    const map = new Map<string, ImageResponseDto>();
    for (const row of results) {
      map.set(row.tradeId, this.formatImageResponse(row));
    }
    return map;
  }

  async getImageCounts(tradeIds: string[]): Promise<Map<string, number>> {
    if (tradeIds.length === 0) return new Map();

    const results = await db
      .select({
        tradeId: tradeImages.tradeId,
        count: count(),
      })
      .from(tradeImages)
      .where(inArray(tradeImages.tradeId, tradeIds))
      .groupBy(tradeImages.tradeId);

    const map = new Map<string, number>();
    for (const row of results) {
      map.set(row.tradeId, Number(row.count));
    }
    return map;
  }

  private async findTradeWithOwnership(tradeId: string, userId: string) {
    const result = await db.query.trades.findFirst({
      where: and(eq(trades.id, tradeId), eq(trades.userId, userId)),
    });
    return result;
  }

  private validateFile(file: Express.Multer.File): void {
    const maxSize = storageConfig.maxImageSizeMb * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds ${storageConfig.maxImageSizeMb}MB limit`,
      );
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!storageConfig.allowedImageTypes.includes(ext)) {
      throw new BadRequestException(
        `File type not allowed. Allowed: ${storageConfig.allowedImageTypes.join(', ')}`,
      );
    }
  }

  private async checkImageCount(tradeId: string): Promise<void> {
    const count = await this.getImageCount(tradeId);
    if (count >= storageConfig.maxImagesPerTrade) {
      throw new BadRequestException(
        `Maximum ${storageConfig.maxImagesPerTrade} images per trade`,
      );
    }
  }

  private async getNextDisplayOrder(tradeId: string): Promise<number> {
    const result = await db
      .select({
        maxOrder: sql<number>`COALESCE(MAX(${tradeImages.displayOrder}), -1)`,
      })
      .from(tradeImages)
      .where(eq(tradeImages.tradeId, tradeId));
    return Number(result[0]?.maxOrder ?? -1) + 1;
  }

  private formatImageResponse(image: any): ImageResponseDto {
    return {
      id: image.id,
      url: this.storageProvider.getOriginalUrl(
        image.cloudinaryPublicId,
        image.cloudinaryVersion,
      ),
      thumbnailUrl: this.storageProvider.getThumbnailUrl(
        image.cloudinaryPublicId,
        image.cloudinaryVersion,
      ),
      width: image.width,
      height: image.height,
      format: image.format,
      bytes: image.bytes,
      displayOrder: image.displayOrder,
      metadata: image.metadata,
    };
  }
}

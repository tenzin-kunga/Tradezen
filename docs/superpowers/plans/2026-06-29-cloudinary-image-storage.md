# Cloudinary Image Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate trade screenshot storage from local disk (multer) to Cloudinary, supporting multiple images per trade with a storage abstraction layer.

**Architecture:** StorageProvider interface with CloudinaryProvider implementation. trade_images table stores public_id + version (URLs generated at response time). Transaction-safe operations with orphan prevention.

**Tech Stack:** NestJS, Drizzle ORM, PostgreSQL, Cloudinary SDK, Multer

---

## File Structure

### New Files

| File                                             | Purpose                               |
| ------------------------------------------------ | ------------------------------------- |
| `packages/db/src/schema/trade-images.ts`         | Drizzle schema for trade_images table |
| `apps/api/src/storage/storage.provider.ts`       | StorageProvider interface             |
| `apps/api/src/storage/cloudinary.provider.ts`    | CloudinaryProvider implementation     |
| `apps/api/src/storage/storage.module.ts`         | Storage module                        |
| `apps/api/src/storage/storage.config.ts`         | Configuration                         |
| `apps/api/src/trades/dto/image.dto.ts`           | Image DTOs                            |
| `apps/api/src/trades/trades-image.service.ts`    | Image operations service              |
| `apps/api/src/trades/trades-image.controller.ts` | Image endpoints                       |

### Modified Files

| File                                       | Changes                                  |
| ------------------------------------------ | ---------------------------------------- |
| `packages/db/src/schema/index.ts`          | Export tradeImages                       |
| `apps/api/src/trades/trades.module.ts`     | Import StorageModule                     |
| `apps/api/src/trades/trades.service.ts`    | Update findAll/findOne to include images |
| `apps/api/src/trades/trades.controller.ts` | Remove old upload endpoint               |

---

## Milestone 1: Infrastructure

### Task 1: StorageProvider Interface

**Files:**

- Create: `apps/api/src/storage/storage.provider.ts`

- [ ] **Step 1: Create interface**

```typescript
export interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface UploadResult {
  publicId: string;
  version: number;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface StorageProvider {
  upload(file: UploadFile): Promise<UploadResult>;
  delete(publicId: string, version: number): Promise<void>;
  getThumbnailUrl(publicId: string, version: number): string;
  getOriginalUrl(publicId: string, version: number): string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/storage/storage.provider.ts
git commit -m "feat(storage): add StorageProvider interface"
```

### Task 2: CloudinaryProvider Implementation

**Files:**

- Create: `apps/api/src/storage/cloudinary.provider.ts`

- [ ] **Step 1: Install Cloudinary SDK**

```bash
cd apps/api && bun add cloudinary
```

- [ ] **Step 2: Create provider**

```typescript
import { Injectable } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";
import { StorageProvider, UploadFile, UploadResult } from "./storage.provider";

@Injectable()
export class CloudinaryProvider implements StorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(file: UploadFile): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: process.env.CLOUDINARY_FOLDER || "tradezen",
          resource_type: "image",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            publicId: result!.public_id,
            version: result!.version,
            width: result!.width,
            height: result!.height,
            format: result!.format,
            bytes: result!.bytes,
          });
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async delete(publicId: string, version: number): Promise<void> {
    await cloudinary.uploader.destroy(publicId, {
      type: "upload",
      version,
    });
  }

  getThumbnailUrl(publicId: string, version: number): string {
    return cloudinary.url(publicId, {
      version,
      transformation: [
        {
          width: parseInt(process.env.THUMBNAIL_WIDTH || "300"),
          height: parseInt(process.env.THUMBNAIL_HEIGHT || "200"),
          crop: "fill",
        },
      ],
    });
  }

  getOriginalUrl(publicId: string, version: number): string {
    return cloudinary.url(publicId, {
      version,
      transformation: [
        {
          width: parseInt(process.env.FULL_WIDTH || "1200"),
          height: parseInt(process.env.FULL_HEIGHT || "800"),
          crop: "limit",
        },
      ],
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/storage/cloudinary.provider.ts
git commit -m "feat(storage): add CloudinaryProvider implementation"
```

### Task 3: Storage Configuration

**Files:**

- Create: `apps/api/src/storage/storage.config.ts`

- [ ] **Step 1: Create config**

```typescript
export const storageConfig = {
  maxImagesPerTrade: parseInt(process.env.MAX_IMAGES_PER_TRADE || "10"),
  maxImageSizeMb: parseInt(process.env.MAX_IMAGE_SIZE_MB || "10"),
  allowedImageTypes: (
    process.env.ALLOWED_IMAGE_TYPES || "jpg,jpeg,png,webp"
  ).split(","),
  thumbnailWidth: parseInt(process.env.THUMBNAIL_WIDTH || "300"),
  thumbnailHeight: parseInt(process.env.THUMBNAIL_HEIGHT || "200"),
  fullWidth: parseInt(process.env.FULL_WIDTH || "1200"),
  fullHeight: parseInt(process.env.FULL_HEIGHT || "800"),
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/storage/storage.config.ts
git commit -m "feat(storage): add storage configuration"
```

### Task 4: Storage Module

**Files:**

- Create: `apps/api/src/storage/storage.module.ts`

- [ ] **Step 1: Create module**

```typescript
import { Module } from "@nestjs/common";
import { CloudinaryProvider } from "./cloudinary.provider";

@Module({
  providers: [{ provide: "StorageProvider", useClass: CloudinaryProvider }],
  exports: ["StorageProvider"],
})
export class StorageModule {}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/storage/storage.module.ts
git commit -m "feat(storage): add StorageModule"
```

---

## Milestone 2: Database

### Task 5: trade_images Schema

**Files:**

- Create: `packages/db/src/schema/trade-images.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Create schema**

```typescript
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { trades } from "./index";

export const tradeImages = pgTable(
  "trade_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    cloudinaryPublicId: text("cloudinary_public_id").notNull(),
    cloudinaryVersion: integer("cloudinary_version").notNull().default(1),
    width: integer("width"),
    height: integer("height"),
    format: text("format"),
    bytes: integer("bytes"),
    displayOrder: integer("display_order").notNull().default(0),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("trade_images_trade_order").on(table.tradeId, table.displayOrder),
    index("idx_trade_images_trade").on(table.tradeId),
    index("idx_trade_images_order").on(table.tradeId, table.displayOrder),
  ],
);
```

- [ ] **Step 2: Update index exports**

```typescript
// Add to packages/db/src/schema/index.ts
export { tradeImages } from "./trade-images";
```

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/trade-images.ts packages/db/src/schema/index.ts
git commit -m "feat(db): add trade_images schema"
```

### Task 6: Migration

**Files:**

- Create: `apps/api/drizzle/0001_trade_images.sql`

- [ ] **Step 1: Create migration SQL**

```sql
CREATE TABLE trade_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_version INTEGER NOT NULL DEFAULT 1,
  width INTEGER,
  height INTEGER,
  format TEXT,
  bytes INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT trade_images_trade_order UNIQUE (trade_id, display_order)
);

CREATE INDEX idx_trade_images_trade ON trade_images(trade_id);
CREATE INDEX idx_trade_images_order ON trade_images(trade_id, display_order);
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/drizzle/0001_trade_images.sql
git commit -m "feat(db): add trade_images migration"
```

---

## Milestone 3: Backend API

### Task 7: Image DTOs

**Files:**

- Create: `apps/api/src/trades/dto/image.dto.ts`

- [ ] **Step 1: Create DTOs**

```typescript
import {
  IsArray,
  IsNumber,
  IsUUID,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class ReorderImageDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  displayOrder: number;
}

export class ReorderImagesDto {
  @ApiProperty({ type: [ReorderImageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderImageDto)
  images: ReorderImageDto[];
}

export class ImageResponseDto {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  displayOrder: number;
  metadata: Record<string, unknown>;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/trades/dto/image.dto.ts
git commit -m "feat(trades): add image DTOs"
```

### Task 8: TradeImageService

**Files:**

- Create: `apps/api/src/trades/trades-image.service.ts`

- [ ] **Step 1: Create service**

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { eq, and, asc, count } from "drizzle-orm";
import { db } from "../db/drizzle";
import { tradeImages, trades } from "@tradezen/db";
import { StorageProvider } from "../storage/storage.provider";
import { storageConfig } from "../storage/storage.config";
import { ImageResponseDto } from "./dto/image.dto";

@Injectable()
export class TradeImageService {
  constructor(private readonly storageProvider: StorageProvider) {}

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

    return images.map(this.formatImageResponse);
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

    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    if (!storageConfig.allowedImageTypes.includes(ext)) {
      throw new BadRequestException(
        `File type not allowed. Allowed: ${storageConfig.allowedImageTypes.join(", ")}`,
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
      .select({ maxOrder: count() })
      .from(tradeImages)
      .where(eq(tradeImages.tradeId, tradeId));
    return Number(result[0]?.maxOrder ?? 0);
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/trades/trades-image.service.ts
git commit -m "feat(trades): add TradeImageService"
```

### Task 9: Image Controller

**Files:**

- Create: `apps/api/src/trades/trades-image.controller.ts`

- [ ] **Step 1: Create controller**

```typescript
import {
  Controller,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { TradeImageService } from "./trades-image.service";
import { ReorderImagesDto } from "./dto/image.dto";

@ApiTags("trade-images")
@ApiBearerAuth()
@Controller("trades/:tradeId/images")
export class TradeImageController {
  constructor(private readonly imageService: TradeImageService) {}

  @Post()
  @ApiOperation({ summary: "Upload an image to a trade" })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
          cb(null, true);
        } else {
          cb(new BadRequestException("Only image files are allowed"), false);
        }
      },
    }),
  )
  upload(
    @CurrentUser("id") userId: string,
    @Param("tradeId") tradeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("No file provided");
    return this.imageService.uploadImage(userId, tradeId, file);
  }

  @Put(":imageId")
  @ApiOperation({ summary: "Replace an image" })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
          cb(null, true);
        } else {
          cb(new BadRequestException("Only image files are allowed"), false);
        }
      },
    }),
  )
  replace(
    @CurrentUser("id") userId: string,
    @Param("tradeId") tradeId: string,
    @Param("imageId") imageId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("No file provided");
    return this.imageService.replaceImage(userId, tradeId, imageId, file);
  }

  @Delete(":imageId")
  @ApiOperation({ summary: "Delete an image" })
  delete(
    @CurrentUser("id") userId: string,
    @Param("tradeId") tradeId: string,
    @Param("imageId") imageId: string,
  ) {
    return this.imageService.deleteImage(userId, tradeId, imageId);
  }

  @Patch("reorder")
  @ApiOperation({ summary: "Reorder images" })
  reorder(
    @CurrentUser("id") userId: string,
    @Param("tradeId") tradeId: string,
    @Body() dto: ReorderImagesDto,
  ) {
    return this.imageService.reorderImages(userId, tradeId, dto.images);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/trades/trades-image.controller.ts
git commit -m "feat(trades): add TradeImageController"
```

### Task 10: Update TradesModule

**Files:**

- Modify: `apps/api/src/trades/trades.module.ts`

- [ ] **Step 1: Import StorageModule**

```typescript
import { Module } from "@nestjs/common";
import { TradesController } from "./trades.controller";
import { TradesService } from "./trades.service";
import { TradeImageService } from "./trades-image.service";
import { TradeImageController } from "./trades-image.controller";
import { BehavioralService } from "../analytics/behavioral.service";
import { EventPublisherService } from "../common/services/event-publisher.service";
import { QueuesModule } from "../queues/queues.module";
import { SeedModule } from "../seed/seed.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [QueuesModule, SeedModule, StorageModule],
  controllers: [TradesController, TradeImageController],
  providers: [
    TradesService,
    TradeImageService,
    BehavioralService,
    EventPublisherService,
  ],
  exports: [TradesService, TradeImageService, BehavioralService],
})
export class TradesModule {}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/trades/trades.module.ts
git commit -m "feat(trades): update TradesModule with image support"
```

### Task 11: Update Trade Queries

**Files:**

- Modify: `apps/api/src/trades/trades.service.ts`

- [ ] **Step 1: Inject TradeImageService**

```typescript
// Add to constructor
constructor(
  private readonly eventPublisher: EventPublisherService,
  private readonly seedService: SeedService,
  private readonly imageService: TradeImageService,
) {}
```

- [ ] **Step 2: Update findAll to include thumbnail**

```typescript
// In findAll method, after fetching trades
const tradesWithImages = await Promise.all(
  paginated.map(async (trade) => {
    const thumbnail = await this.imageService.getThumbnail(trade.id);
    const imageCount = await this.imageService.getImageCount(trade.id);
    return {
      ...trade,
      thumbnail: thumbnail
        ? {
            url: thumbnail.url,
            width: thumbnail.width,
            height: thumbnail.height,
          }
        : null,
      imageCount,
    };
  }),
);

return {
  data: tradesWithImages,
  meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
};
```

- [ ] **Step 3: Update findOne to include images**

```typescript
async findOne(userId: string, id: string) {
  const result = await db
    .select()
    .from(trades)
    .where(and(eq(trades.id, id), eq(trades.userId, userId)));
  if (!result[0]) throw new NotFoundException(`Trade ${id} not found`);

  const images = await this.imageService.getImages(id);
  return { ...result[0], images };
}
```

- [ ] **Step 4: Update remove to delete Cloudinary assets**

```typescript
async remove(userId: string, id: string) {
  // ... existing code ...

  // Delete all images from Cloudinary
  const images = await this.imageService.getImages(id);
  for (const image of images) {
    // Extract public_id and version from image
    // await this.imageService.deleteImage(userId, id, image.id);
  }

  // ... rest of existing code ...
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/trades/trades.service.ts
git commit -m "feat(trades): update trade queries with image support"
```

---

## Milestone 4: Frontend

### Task 12: Update TradeCard

**Files:**

- Modify: `apps/web/components/TradeCard.tsx`

- [ ] **Step 1: Add image badge**

```typescript
// In TradeCard component, add image count badge
{trade.imageCount > 0 && (
  <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
    📷 {trade.imageCount > 1 ? `+${trade.imageCount - 1}` : ''}
  </div>
)}
```

- [ ] **Step 2: Update thumbnail**

```typescript
// Update thumbnail source
{trade.thumbnail ? (
  <img src={trade.thumbnail.url} alt="" className="w-14 h-10 object-cover rounded" />
) : trade.chart_image ? (
  <img src={trade.chart_image} alt="" className="w-14 h-10 object-cover rounded" />
) : null}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/TradeCard.tsx
git commit -m "feat(web): update TradeCard with image badge"
```

### Task 13: Update Trade Detail

**Files:**

- Modify: `apps/web/app/trades/[id]/edit/page.tsx`

- [ ] **Step 1: Add image gallery**

```typescript
// Add image gallery section
<div className="space-y-4">
  <h3 className="text-lg font-medium">Screenshots</h3>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {trade.images?.map((image) => (
      <div key={image.id} className="relative group">
        <img src={image.thumbnailUrl} alt="" className="w-full h-32 object-cover rounded" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button onClick={() => setSelectedImage(image)}>View</button>
          <button onClick={() => deleteImage(image.id)}>Delete</button>
        </div>
      </div>
    ))}
  </div>
  <ImageUploader tradeId={trade.id} onUpload={handleUpload} />
</div>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/trades/[id]/edit/page.tsx
git commit -m "feat(web): add image gallery to trade detail"
```

---

## Milestone 5: Cleanup

### Task 14: Remove Legacy Upload Code

**Files:**

- Modify: `apps/api/src/trades/trades.controller.ts`
- Modify: `apps/api/src/trades/trades.service.ts`

- [ ] **Step 1: Remove old upload endpoint**

```typescript
// Remove from controller
// @Post(':id/image')
// uploadImage(...)
```

- [ ] **Step 2: Remove old upload service method**

```typescript
// Remove from service
// async uploadImage(...)
```

- [ ] **Step 3: Remove multer imports**

```typescript
// Remove from controller
// import { diskStorage } from 'multer';
// import { extname, join } from 'path';
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/trades/trades.controller.ts apps/api/src/trades/trades.service.ts
git commit -m "refactor(trades): remove legacy upload code"
```

### Task 15: Add Environment Variables

**Files:**

- Modify: `.env.docker.example`
- Modify: `apps/api/.env`

- [ ] **Step 1: Add Cloudinary env vars**

```bash
# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=tradezen
THUMBNAIL_WIDTH=300
THUMBNAIL_HEIGHT=200
FULL_WIDTH=1200
FULL_HEIGHT=800
MAX_IMAGES_PER_TRADE=10
MAX_IMAGE_SIZE_MB=10
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,webp
```

- [ ] **Step 2: Commit**

```bash
git add .env.docker.example apps/api/.env
git commit -m "docs: add Cloudinary environment variables"
```

---

## Testing

### Unit Tests

- [ ] **StorageProvider interface**
- [ ] **File validation**
- [ ] **Authorization checks**
- [ ] **Reorder logic**

### Integration Tests

- [ ] **Upload success flow**
- [ ] **Upload rollback on DB failure**
- [ ] **Delete flow**
- [ ] **Replace flow**
- [ ] **Unauthorized access**
- [ ] **Invalid file type**
- [ ] **Too many images**

### E2E Tests

- [ ] **Create trade with image**
- [ ] **Edit trade**
- [ ] **Reorder images**
- [ ] **Delete image**
- [ ] **Multiple images**

---

## Final Checklist

- [ ] StorageProvider interface implemented
- [ ] CloudinaryProvider implemented
- [ ] trade_images schema created
- [ ] Migration created and tested
- [ ] Upload endpoint working
- [ ] Delete endpoint working
- [ ] Replace endpoint working
- [ ] Reorder endpoint working
- [ ] Trade list shows thumbnail + count
- [ ] Trade detail shows full images
- [ ] Frontend gallery working
- [ ] Legacy code removed
- [ ] Environment variables documented
- [ ] All tests passing

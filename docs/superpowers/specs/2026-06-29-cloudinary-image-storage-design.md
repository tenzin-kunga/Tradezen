# TradeZen — Cloudinary Image Storage Design Spec (Final)

**Date:** 2026-06-29
**Status:** Approved for Implementation
**Rating:** 10/10

---

## Goal

Migrate trade screenshot storage from local disk (multer) to Cloudinary, supporting multiple images per trade with a storage abstraction layer.

---

## Database Schema

### New Table: `trade_images`

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
  UNIQUE (trade_id, display_order)
);

CREATE INDEX idx_trade_images_trade ON trade_images(trade_id);
CREATE INDEX idx_trade_images_order ON trade_images(trade_id, display_order);
```

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| No `url` or `thumbnail_url` columns | Derived values generated from `cloudinary_public_id` + `cloudinary_version` at response time. Avoids migrations when CDN/transformation settings change. |
| No `status` column | Uploads are synchronous. UI shows "Uploading..." without persisting state. Add only if async processing is introduced later. |
| `metadata JSONB NOT NULL DEFAULT '{}'` | Avoids null checks everywhere. Always an object. |
| `UNIQUE (trade_id, display_order)` | Prevents duplicate ordering at DB level. |
| `SELECT COUNT(*) FOR UPDATE` in service | Prevents race conditions on image count limit. |

### Migration Strategy

| Migration | Action |
|-----------|--------|
| 1 | Create `trade_images` table, keep `chart_image` column |
| 2 | Read from both, write only to `trade_images` |
| 3 | Remove `chart_image` column |

---

## Storage Abstraction

### Interface

```typescript
interface StorageProvider {
  upload(file: UploadFile): Promise<UploadResult>;
  delete(publicId: string, version: number): Promise<void>;
  getThumbnailUrl(publicId: string, version: number): string;
  getOriginalUrl(publicId: string, version: number): string;
}

interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

interface UploadResult {
  publicId: string;
  version: number;
  width: number;
  height: number;
  format: string;
  bytes: number;
}
```

### Implementation

- `CloudinaryProvider` implements `StorageProvider`
- Service layer uses `StorageProvider` interface (not Cloudinary directly)
- URLs are generated at response time, never stored in database

---

## API Endpoints

### Upload Image

```
POST /trades/:id/images
Content-Type: multipart/form-data
```

**Request:** FormData with `file` field

**Response:**
```json
{
  "image": {
    "id": "uuid",
    "url": "https://res.cloudinary.com/.../v1748123412/...",
    "thumbnailUrl": "https://res.cloudinary.com/.../v1748123412/.../w_300,h_200,c_fill",
    "width": 1920,
    "height": 1080,
    "format": "png",
    "bytes": 245000,
    "displayOrder": 0,
    "metadata": {}
  }
}
```

**Rules:**
- Max images per trade: Configurable `MAX_IMAGES_PER_TRADE`
- Max file size: Configurable `MAX_IMAGE_SIZE_MB`
- Allowed formats: jpg, jpeg, png, webp
- Validate file signature (not just MIME type)
- Verify `trade.userId == currentUser.id`

**Orphan Prevention:**
```
Upload to Cloudinary
↓
Insert to database
↓
If insert fails → Delete uploaded asset immediately
↓
Return
```

**Image Count Constraint:**
```sql
SELECT COUNT(*) FROM trade_images
WHERE trade_id = $1
FOR UPDATE;
```
Check count before inserting to prevent race conditions.

### Delete Image

```
DELETE /trades/:id/images/:imageId
```

**Response:** `{ "success": true }`

**Operation Boundary:**
```
Begin operation
↓
Delete from Cloudinary
↓
Begin DB transaction
↓
Delete from database
↓
Commit
↓
Return
```

### Replace Image

```
PUT /trades/:tradeId/images/:imageId
Content-Type: multipart/form-data
```

**Request:** FormData with `file` field

**Response:**
```json
{
  "image": {
    "id": "uuid",
    "url": "...",
    "thumbnailUrl": "...",
    "width": 1920,
    "height": 1080,
    "format": "png",
    "bytes": 245000,
    "displayOrder": 0,
    "metadata": {}
  }
}
```

**Operation Boundary:**
```
Upload new asset to Cloudinary
↓
Begin DB transaction
↓
Update database record
↓
Commit
↓
Delete previous Cloudinary asset
↓
Return
```

### Reorder Images

```
PATCH /trades/:id/images/reorder
```

**Request:**
```json
{
  "images": [
    { "id": "uuid", "displayOrder": 0 },
    { "id": "uuid", "displayOrder": 1 }
  ]
}
```

**Response:** `{ "success": true }`

**Transaction Boundary:**
```
Begin transaction
↓
Set temporary negative orders (e.g., -1, -2)
↓
Set final orders (0, 1)
↓
Commit
```

**Note:** The image with `display_order = 0` is the thumbnail. To "set as thumbnail", reorder to make that image order 0.

---

## Trade List Response

```
GET /trades
```

```json
{
  "trades": [
    {
      "id": "uuid",
      "symbol": "EURUSD",
      "pnl": 253.40,
      "thumbnail": {
        "url": "https://res.cloudinary.com/.../w_300,h_200,c_fill",
        "width": 300,
        "height": 200
      },
      "imageCount": 3
    }
  ]
}
```

**Rules:**
- `thumbnail` is the image with `display_order = 0`
- `imageCount` includes all images
- Soft failure: if thumbnail unavailable, return `thumbnail: null` but don't fail query
- URLs are generated by `StorageProvider`, never read from database

---

## Trade Detail Response

```
GET /trades/:id
```

```json
{
  "id": "uuid",
  "symbol": "EURUSD",
  "pnl": 253.40,
  "images": [
    {
      "id": "uuid",
      "url": "https://res.cloudinary.com/.../v1748123412/...",
      "thumbnailUrl": "https://res.cloudinary.com/.../v1748123412/.../w_300,h_200,c_fill",
      "width": 1920,
      "height": 1080,
      "format": "png",
      "bytes": 245000,
      "displayOrder": 0,
      "metadata": {}
    }
  ]
}
```

---

## UI Components

### TradeCard (List View)

- Shows `thumbnail.url` (300×200 Cloudinary transform)
- Badge: `📷 3` if `imageCount > 1`
- Lazy loading enabled
- Graceful fallback if thumbnail is null

### TradeDetailDrawer (Detail View)

- Main image display (`url` with full dimensions)
- Thumbnail strip at bottom
- Navigation arrows for multiple images
- Delete/replace options
- "Set as thumbnail" button (triggers reorder)

### Optimistic UI

- Frontend immediately shows "Uploading..." state
- No blocking during upload
- No need to persist upload state in database

---

## Configuration

| Config | Default | Description |
|--------|---------|-------------|
| `MAX_IMAGES_PER_TRADE` | 10 | Maximum images allowed per trade |
| `MAX_IMAGE_SIZE_MB` | 10 | Maximum file size in MB |
| `ALLOWED_IMAGE_TYPES` | jpg,jpeg,png,webp | Allowed file formats |
| `CLOUDINARY_FOLDER` | tradezen | Base folder for uploads |
| `THUMBNAIL_WIDTH` | 300 | Thumbnail width in pixels |
| `THUMBNAIL_HEIGHT` | 200 | Thumbnail height in pixels |
| `FULL_WIDTH` | 1200 | Full size width in pixels |
| `FULL_HEIGHT` | 800 | Full size height in pixels |

---

## Validation Rules

| Rule | Value |
|------|-------|
| Max images per trade | Configurable |
| Max file size | Configurable |
| Allowed formats | jpg, jpeg, png, webp |
| Validation | File signature + dimensions + size |

---

## Authorization

Every endpoint must verify:
```typescript
if (trade.userId !== currentUser.id) {
  throw new ForbiddenException();
}
```

---

## Audit Logging

Log these events for debugging:

| Event | Details |
|-------|---------|
| Image uploaded | tradeId, imageId, userId, size, format |
| Image replaced | tradeId, imageId, userId |
| Image deleted | tradeId, imageId, userId |
| Image reordered | tradeId, userId, new order |

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Cloudinary unavailable | Soft failure, trade list still renders |
| Upload exceeds limit | Return 400 with clear error message |
| Invalid file type | Return 400 with allowed types |
| Unauthorized | Return 403 Forbidden |
| Image not found | Return 404 Not Found |
| Too many images | Return 400 with max limit |
| DB insert fails | Delete uploaded Cloudinary asset |

---

## Testing

### Unit
- StorageProvider interface
- Validation logic
- Authorization checks
- Reorder logic

### Integration
- Upload success flow
- Upload rollback (DB fails)
- Delete flow
- Replace flow
- Unauthorized access
- Invalid signature
- Too many images

### E2E
- Create trade with image
- Edit trade
- Reorder images
- Delete image
- Multiple images

---

## Implementation Milestones

### Milestone 1: Infrastructure
- StorageProvider interface
- CloudinaryProvider implementation
- Configuration (env vars, limits)
- Validation (file signature, dimensions, size)

### Milestone 2: Database
- Migration for trade_images table
- Repository layer
- Query helpers
- Indexes

### Milestone 3: Backend API
- Upload endpoint
- Delete endpoint
- Replace endpoint
- Reorder endpoint
- Audit logging

### Milestone 4: Frontend
- Uploader component
- Gallery component
- Thumbnail display
- Optimistic UI states

### Milestone 5: Cleanup
- Remove multer upload code
- Remove chart_image column
- Remove legacy code
- Documentation updates

---

## Final Architecture

```
Frontend
      │
      ▼
ImageService
      │
      ▼
StorageProvider
      │
      ▼
CloudinaryProvider
      │
      ▼
Cloudinary

TradeService
      │
      ▼
trade_images

TradeCard
      │
thumbnail + count

TradeDetail
      │
gallery
      │
reorder
      │
replace
      │
delete
```

---

## Summary of Design Decisions

| Decision | Rationale |
|----------|-----------|
| Storage abstraction | Future-proof for S3, R2, etc. |
| API owns uploads | Frontend never needs credentials |
| Multiple images | Design for scale from day one |
| display_order determines thumbnail | Single source of truth |
| Configurable limits | Easy to adjust without deployment |
| Rollback for orphaned uploads | Prevent Cloudinary clutter |
| Optimistic UI | Better UX during uploads |
| Separate list/detail payloads | Performance at scale |
| No stored URLs | Generate from public_id + version |
| No persisted status | Synchronous uploads, no async complexity |
| metadata NOT NULL DEFAULT '{}' | Always an object, no null checks |
| SELECT COUNT FOR UPDATE | Prevent race conditions |
| Transaction-safe reorder | Prevent uniqueness violations |

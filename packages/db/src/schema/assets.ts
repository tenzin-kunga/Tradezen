import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./index";
import { researchProjects } from "./research";

export const assetStatus = pgEnum("asset_status", [
  "active",
  "deleting",
  "deleted",
  "failed",
]);

export const processingStatus = pgEnum("processing_status", [
  "none",
  "queued",
  "processing",
  "ready",
  "failed",
]);

export const documentCategory = pgEnum("document_category", [
  "annual_report",
  "quarterly_report",
  "earnings_transcript",
  "investor_presentation",
  "valuation",
  "model",
  "spreadsheet",
  "chart",
  "screenshot",
  "news",
  "other",
]);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull().default("cloudinary"),
    providerKey: text("provider_key").notNull(),
    mimeType: text("mime_type"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    sha256Hash: text("sha256_hash"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    source: text("source").notNull().default("manual"),
    status: assetStatus("status").notNull().default("active"),
    processingStatus: processingStatus("processing_status")
      .notNull()
      .default("none"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_assets_status").on(table.status),
    index("idx_assets_created").on(table.createdAt),
  ],
);

export const researchAssets = pgTable(
  "research_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => researchProjects.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    category: documentCategory("category").notNull().default("other"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_research_assets_project").on(table.projectId),
    index("idx_research_assets_asset").on(table.assetId),
    index("idx_research_assets_category").on(table.category),
    index("idx_research_assets_created").on(table.createdAt),
  ],
);

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./index";

export const knowledgeFolders = pgTable(
  "knowledge_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_knowledge_folders_user").on(table.userId),
    index("idx_knowledge_folders_parent").on(table.parentId),
  ],
);

export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id"),
    title: text("title").notNull(),
    content: text("content"),
    docType: text("doc_type").notNull().default("note"),
    templateId: text("template_id"),
    status: text("status").notNull().default("draft"), // draft | active | archived
    currentVersion: integer("current_version").notNull().default(1),
    aiSummary: text("ai_summary"),
    frontmatter: jsonb("frontmatter").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_knowledge_documents_user").on(table.userId),
    index("idx_knowledge_documents_folder").on(table.folderId),
    index("idx_knowledge_documents_type").on(table.docType),
    index("idx_knowledge_documents_status").on(table.status),
  ],
);

export const knowledgeDocumentVersions = pgTable(
  "knowledge_document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_knowledge_versions_document").on(table.documentId),
  ],
);

export const knowledgeAssets = pgTable(
  "knowledge_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    assetType: text("asset_type").notNull(), // pdf, image, spreadsheet, earnings_report, annual_report
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_knowledge_assets_document").on(table.documentId),
  ],
);

export const knowledgeDocumentLinks = pgTable(
  "knowledge_document_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    targetDocumentId: uuid("target_document_id")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    relationshipType: text("relationship_type").notNull(), // references, cites, related, contradicts, supports
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_knowledge_links_source").on(table.sourceDocumentId),
    index("idx_knowledge_links_target").on(table.targetDocumentId),
  ],
);

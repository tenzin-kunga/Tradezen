import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as schema from "./schema";

export type User = InferSelectModel<typeof schema.users>;
export type NewUser = InferInsertModel<typeof schema.users>;

export type Trade = InferSelectModel<typeof schema.trades>;
export type NewTrade = InferInsertModel<typeof schema.trades>;

export type Journal = InferSelectModel<typeof schema.journals>;
export type NewJournal = InferInsertModel<typeof schema.journals>;

export type Tag = InferSelectModel<typeof schema.tags>;
export type NewTag = InferInsertModel<typeof schema.tags>;

export type TradeTag = InferSelectModel<typeof schema.tradeTags>;
export type NewTradeTag = InferInsertModel<typeof schema.tradeTags>;

export type LoginAttempt = InferSelectModel<typeof schema.loginAttempts>;
export type NewLoginAttempt = InferInsertModel<typeof schema.loginAttempts>;

export type AuditLog = InferSelectModel<typeof schema.auditLog>;
export type NewAuditLog = InferInsertModel<typeof schema.auditLog>;

export type Checklist = InferSelectModel<typeof schema.checklists>;
export type NewChecklist = InferInsertModel<typeof schema.checklists>;
export type ChecklistItem = InferSelectModel<typeof schema.checklistItems>;
export type NewChecklistItem = InferInsertModel<typeof schema.checklistItems>;
export type ChecklistRun = InferSelectModel<typeof schema.checklistRuns>;
export type NewChecklistRun = InferInsertModel<typeof schema.checklistRuns>;
export type ChecklistRunItem = InferSelectModel<
  typeof schema.checklistRunItems
>;
export type NewChecklistRunItem = InferInsertModel<
  typeof schema.checklistRunItems
>;

export type Symbol = InferSelectModel<typeof schema.symbols>;
export type NewSymbol = InferInsertModel<typeof schema.symbols>;

export type Watchlist = InferSelectModel<typeof schema.watchlists>;
export type NewWatchlist = InferInsertModel<typeof schema.watchlists>;

export type WatchlistItem = InferSelectModel<typeof schema.watchlistItems>;
export type NewWatchlistItem = InferInsertModel<typeof schema.watchlistItems>;

export type KnowledgeFolder = InferSelectModel<typeof schema.knowledgeFolders>;
export type NewKnowledgeFolder = InferInsertModel<typeof schema.knowledgeFolders>;

export type KnowledgeDocument = InferSelectModel<typeof schema.knowledgeDocuments>;
export type NewKnowledgeDocument = InferInsertModel<typeof schema.knowledgeDocuments>;

export type KnowledgeDocumentVersion = InferSelectModel<typeof schema.knowledgeDocumentVersions>;
export type NewKnowledgeDocumentVersion = InferInsertModel<typeof schema.knowledgeDocumentVersions>;

export type KnowledgeAsset = InferSelectModel<typeof schema.knowledgeAssets>;
export type NewKnowledgeAsset = InferInsertModel<typeof schema.knowledgeAssets>;

export type KnowledgeDocumentLink = InferSelectModel<typeof schema.knowledgeDocumentLinks>;
export type NewKnowledgeDocumentLink = InferInsertModel<typeof schema.knowledgeDocumentLinks>;

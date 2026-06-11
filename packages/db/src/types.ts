import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import * as schema from './schema';

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
export type ChecklistRunItem = InferSelectModel<typeof schema.checklistRunItems>;
export type NewChecklistRunItem = InferInsertModel<typeof schema.checklistRunItems>;

import { relations } from 'drizzle-orm';
import {
  users,
  accounts,
  trades,
  checklists,
  checklistItems,
  checklistRuns,
  checklistRunItems,
} from './schema';

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const checklistsRelations = relations(checklists, ({ one, many }) => ({
  user: one(users, {
    fields: [checklists.userId],
    references: [users.id],
  }),
  items: many(checklistItems),
  runs: many(checklistRuns),
}));

export const checklistItemsRelations = relations(checklistItems, ({ one }) => ({
  checklist: one(checklists, {
    fields: [checklistItems.checklistId],
    references: [checklists.id],
  }),
}));

export const checklistRunsRelations = relations(checklistRuns, ({ one, many }) => ({
  user: one(users, {
    fields: [checklistRuns.userId],
    references: [users.id],
  }),
  checklist: one(checklists, {
    fields: [checklistRuns.checklistId],
    references: [checklists.id],
  }),
  trade: one(trades, {
    fields: [checklistRuns.tradeId],
    references: [trades.id],
  }),
  runItems: many(checklistRunItems),
}));

export const checklistRunItemsRelations = relations(checklistRunItems, ({ one }) => ({
  run: one(checklistRuns, {
    fields: [checklistRunItems.runId],
    references: [checklistRuns.id],
  }),
  item: one(checklistItems, {
    fields: [checklistRunItems.itemId],
    references: [checklistItems.id],
  }),
}));

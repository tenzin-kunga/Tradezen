import { z } from "zod";

// Trade schemas
export const createTradeSchema = z.object({
  symbol: z.string().min(2).max(20),
  direction: z.enum(["buy", "sell"]),
  entry: z.number().positive().max(99999999.99999999),
  exit: z.number().positive().max(99999999.99999999),
  lot: z.number().min(0.01).max(1000),
  stop_loss: z.number().positive().max(99999999.99999999).nullish(),
  take_profit: z.number().positive().max(99999999.99999999).nullish(),
  strategy: z.string().max(100).nullish(),
  notes: z.string().max(2000).nullish(),
  fomo_check: z.boolean().optional(),
  trend_alignment: z.boolean().optional(),
  vengeance_trade: z.boolean().optional(),
  contract_size: z.number().min(1).max(1000000).optional(),
  trade_date: z.string().nullish(),
  commission: z.number().min(0).max(10000).nullish(),
});

// Auth schemas
export const loginSchema = z.object({
  identifier: z.string().min(3).max(100),
  password: z.string().min(8).max(128),
  remember_me: z.boolean().optional(),
});

export const updateSettingsSchema = z.object({
  initial_capital: z.number().min(0).max(10000000).optional(),
  default_lot_size: z.number().min(0.01).max(1000).optional(),
  timezone: z.string().max(50).optional(),
  theme: z.enum(["dark", "light"]).optional(),
});

// Journal schemas
export const journalMoodEnum = z.enum([
  "great",
  "good",
  "neutral",
  "bad",
  "terrible",
]);

export const createJournalSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  pre_market_notes: z.string().max(5000).optional(),
  post_market_notes: z.string().max(5000).optional(),
  mood: journalMoodEnum.optional(),
  market_conditions: z.string().max(2000).optional(),
  lessons: z.string().max(5000).optional(),
});

// Tag schemas
export const tagCategoryEnum = z.enum(["setup", "condition", "emotion"]);

export const createTagSchema = z.object({
  name: z.string().min(1).max(30),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, {
      message: "Color must be a valid hex color (e.g., #888888)",
    })
    .optional(),
  category: tagCategoryEnum.optional(),
});

// Chat schemas
export const chatRoleEnum = z.enum(["system", "user", "assistant"]);

export const chatMessageSchema = z.object({
  role: chatRoleEnum,
  content: z.string().min(1).max(4000),
  context: z.string().max(100).optional(),
});

// Checklist schemas
export const checklistItemSchema = z.object({
  title: z.string().min(1).max(200),
  isCritical: z.boolean().optional(),
});

export const createChecklistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  items: z.array(checklistItemSchema).min(1).max(50),
});

export const updateChecklistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullish(),
  items: z.array(checklistItemSchema).min(1).max(50).optional(),
});

export const createChecklistRunSchema = z.object({
  checklistId: z.string().uuid(),
  tradeId: z.string().uuid().nullish(),
  note: z.string().max(2000).nullish(),
});

export const updateChecklistRunItemSchema = z.object({
  runId: z.string().uuid(),
  itemId: z.string().uuid(),
  checked: z.boolean(),
});

export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;
export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;
export type CreateChecklistRunInput = z.infer<typeof createChecklistRunSchema>;
export type UpdateChecklistRunItemInput = z.infer<
  typeof updateChecklistRunItemSchema
>;

// Export inferred types
export type CreateTradeInput = z.infer<typeof createTradeSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type CreateJournalInput = z.infer<typeof createJournalSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type JournalMood = z.infer<typeof journalMoodEnum>;
export type TagCategory = z.infer<typeof tagCategoryEnum>;
export type ChatRole = z.infer<typeof chatRoleEnum>;

// Symbol schemas
export const createSymbolSchema = z.object({
  ticker: z.string().min(1).max(20),
  exchange: z.string().max(20).nullish(),
  asset_type: z.string().max(20).nullish(),
  currency: z.string().max(10).nullish(),
  name: z.string().max(200).nullish(),
});

// Watchlist schemas
export const createWatchlistSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["manual", "smart"]).optional(),
  definition: z.record(z.unknown()).nullish(),
});

export const createWatchlistItemSchema = z.object({
  ticker: z.string().min(1).max(20),
  exchange: z.string().max(20).nullish(),
  priority: z.number().int().min(0).max(2).optional(),
  notes: z.string().max(1000).nullish(),
});

export const reorderWatchlistSchema = z.object({
  type: z.literal("move"),
  itemId: z.string().uuid(),
  from: z.number().int().min(0),
  to: z.number().int().min(0),
});

export type CreateSymbolInput = z.infer<typeof createSymbolSchema>;
export type CreateWatchlistInput = z.infer<typeof createWatchlistSchema>;
export type CreateWatchlistItemInput = z.infer<typeof createWatchlistItemSchema>;
export type ReorderWatchlistInput = z.infer<typeof reorderWatchlistSchema>;

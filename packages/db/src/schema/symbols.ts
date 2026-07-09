import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const symbols = pgTable(
  "symbols",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticker: text("ticker").notNull(),
    exchange: text("exchange"),
    assetType: text("asset_type"),
    currency: text("currency"),
    name: text("name"),
    symbolKey: text("symbol_key").notNull().unique(),
    providerMetadata: jsonb("provider_metadata").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_symbols_ticker_exchange").on(table.ticker, table.exchange),
    index("idx_symbols_symbol_key").on(table.symbolKey),
  ],
);

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
import { symbols } from "./symbols";

export const watchlists = pgTable(
  "watchlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Default"),
    type: text("type").notNull().default("manual"), // manual | smart
    definition: jsonb("definition"), // NULL for manual, rule for smart
    definitionVersion: integer("definition_version").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_watchlists_user").on(table.userId),
  ],
);

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    watchlistId: uuid("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    symbolId: uuid("symbol_id")
      .notNull()
      .references(() => symbols.id),
    priority: integer("priority").notNull().default(0),
    notes: text("notes"),
    tags: jsonb("tags").notNull().default([]),
    alerts: jsonb("alerts").notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_watchlist_items_watchlist").on(table.watchlistId),
    index("idx_watchlist_items_symbol").on(table.symbolId),
  ],
);

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

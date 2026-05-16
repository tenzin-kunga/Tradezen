import {
  pgTable,
  uuid,
  serial,
  varchar,
  text,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  integer,
  index,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    twoFactorEnabled: boolean('two_factor_enabled').default(false),
    twoFactorSecret: varchar('two_factor_secret', { length: 32 }),
    twoFactorBackupCodes: jsonb('two_factor_backup_codes'),
    initialCapital: numeric('initial_capital').default('0'),
    defaultLotSize: numeric('default_lot_size').default('0.01'),
    timezone: text('timezone').default('UTC'),
    theme: text('theme').default('dark'),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_username').on(table.username),
  ],
);

export const trades = pgTable(
  'trades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    symbol: text('symbol').notNull(),
    direction: text('direction').notNull(),
    entryPrice: numeric('entry_price').notNull(),
    exitPrice: numeric('exit_price').notNull(),
    lotSize: numeric('lot_size').notNull(),
    pnl: numeric('pnl').notNull(),
    stopLoss: numeric('stop_loss'),
    takeProfit: numeric('take_profit'),
    strategy: text('strategy'),
    notes: text('notes'),
    fomoCheck: boolean('fomo_check').default(false),
    trendAlignment: boolean('trend_alignment').default(false),
    vengeanceTrade: boolean('vengeance_trade').default(false),
    chartImage: text('chart_image'),
    tradeDate: timestamp('trade_date'),
    commission: numeric('commission').default('0'),
    contractSize: numeric('contract_size').default('100000'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_trades_user_created').on(table.userId, table.createdAt.desc()),
    index('idx_trades_user_symbol').on(table.userId, table.symbol),
    index('idx_trades_user_strategy').on(table.userId, table.strategy),
  ],
);

export const journals = pgTable(
  'journals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    preMarketNotes: text('pre_market_notes'),
    postMarketNotes: text('post_market_notes'),
    mood: text('mood'),
    marketConditions: text('market_conditions'),
    lessons: text('lessons'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    unique().on(table.userId, table.date),
    index('idx_journals_user_date').on(table.userId, table.date.desc()),
  ],
);

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#888888'),
    category: text('category').default('setup'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    unique().on(table.userId, table.name),
    index('idx_tags_user').on(table.userId),
  ],
);

export const tradeTags = pgTable(
  'trade_tags',
  {
    tradeId: uuid('trade_id')
      .notNull()
      .references(() => trades.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    { primaryKey: [table.tradeId, table.tagId] },
    index('idx_trade_tags_trade').on(table.tradeId),
    index('idx_trade_tags_tag').on(table.tagId),
  ],
);

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: serial('id').primaryKey(),
    identifier: varchar('identifier', { length: 255 }).notNull(),
    ip: varchar('ip', { length: 45 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('idx_login_attempts_identifier').on(table.identifier),
    index('idx_login_attempts_created_at').on(table.createdAt),
  ],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(),
    resource: varchar('resource', { length: 100 }),
    resourceId: integer('resource_id'),
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),
    details: jsonb('details'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('idx_audit_log_user_id').on(table.userId),
    index('idx_audit_log_action').on(table.action),
    index('idx_audit_log_created_at').on(table.createdAt),
  ],
);

export const analyticsSnapshots = pgTable('analytics_snapshots', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  snapshotDate: date('snapshot_date').notNull(),
  metrics: jsonb('metrics').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userDateIdx: index('idx_snapshots_user_date').on(table.userId, table.snapshotDate),
  userDateUnique: uniqueIndex('uq_snapshots_user_date').on(table.userId, table.snapshotDate),
}));

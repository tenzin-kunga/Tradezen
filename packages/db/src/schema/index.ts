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
  customType,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash'),
    authMethod: text('auth_method').notNull().default('password'),
    createdAt: timestamp('created_at').defaultNow(),
    twoFactorEnabled: boolean('two_factor_enabled').default(false),
    twoFactorSecret: varchar('two_factor_secret', { length: 32 }),
    twoFactorBackupCodes: jsonb('two_factor_backup_codes'),
    initialCapital: numeric('initial_capital').default('0'),
    defaultLotSize: numeric('default_lot_size').default('0.01'),
    timezone: text('timezone').default('UTC'),
    theme: text('theme').default('dark'),
    dashboardLayout: jsonb('dashboard_layout').$type<{
      widgets: Array<{ id: string; visible: boolean; size: string }>;
    }>().default({
      widgets: [
        { id: 'equity-curve', visible: true, size: 'M' },
        { id: 'daily-summary', visible: true, size: 'M' },
        { id: 'recent-trades', visible: true, size: 'M' },
        { id: 'journal-snapshot', visible: true, size: 'M' },
        { id: 'behavior-analytics', visible: true, size: 'M' },
        { id: 'heatmap', visible: true, size: 'M' },
        { id: 'analytics-insights', visible: true, size: 'M' },
        { id: 'ai-coach', visible: true, size: 'M' },
      ],
    }),
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
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
    isSample: boolean('is_sample').default(false),
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
    isSample: boolean('is_sample').default(false),
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
    isSample: boolean('is_sample').default(false),
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
    userId: uuid('user_id').references(() => users.id),
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

export const analyticsSnapshots = pgTable(
  'analytics_snapshots',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    snapshotDate: date('snapshot_date').notNull(),
    metrics: jsonb('metrics').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userDateIdx: index('idx_snapshots_user_date').on(
      table.userId,
      table.snapshotDate,
    ),
    userDateUnique: uniqueIndex('uq_snapshots_user_date').on(
      table.userId,
      table.snapshotDate,
    ),
  }),
);

const vector = (name: string, opts: { dimensions: number }) =>
  customType<{ data: number[] }>({
    dataType: () => `vector(${opts.dimensions})`,
  })(name);

export const embeddings = pgTable(
  'embeddings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceType: varchar('source_type', { length: 50 }).notNull(),
    sourceId: uuid('source_id').notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_embeddings_user').on(table.userId),
    sourceIdx: index('idx_embeddings_source').on(
      table.sourceType,
      table.sourceId,
    ),
  }),
);

export const chatThreads = pgTable(
  'chat_threads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_chat_threads_user').on(table.userId),
    updatedIdx: index('idx_chat_threads_updated').on(
      table.userId,
      table.updatedAt,
    ),
  }),
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => chatThreads.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    threadIdx: index('idx_chat_messages_thread').on(table.threadId),
    createdIdx: index('idx_chat_messages_created').on(
      table.threadId,
      table.createdAt,
    ),
  }),
);

export const aiInsights = pgTable(
  'ai_insights',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    insightType: varchar('insight_type', { length: 50 }).notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_insights_user').on(table.userId),
    typeIdx: index('idx_insights_type').on(table.userId, table.insightType),
    createdIdx: index('idx_insights_created').on(table.userId, table.createdAt),
  }),
);

export const coachingSessions = pgTable(
  'coaching_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    severity: varchar('severity', { length: 20 }).notNull(),
    triggers: jsonb('triggers').notNull(),
    message: text('message').notNull(),
    analyticsSnapshot: jsonb('analytics_snapshot'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_coaching_user').on(table.userId),
    severityIdx: index('idx_coaching_severity').on(
      table.userId,
      table.severity,
    ),
    createdIdx: index('idx_coaching_created').on(table.userId, table.createdAt),
  }),
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata'),
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_notifications_user').on(table.userId),
    unreadIdx: index('idx_notifications_unread').on(table.userId, table.isRead),
    createdIdx: index('idx_notifications_created').on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    enabled: boolean('enabled').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    unique().on(table.userId, table.type),
    index('idx_notification_prefs_user').on(table.userId),
  ],
);

export const goals = pgTable(
  'goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    target: numeric('target').notNull(),
    period: text('period').notNull().default('monthly'),
    direction: text('direction').notNull().default('higher'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_goals_user').on(table.userId),
    index('idx_goals_type').on(table.userId, table.type),
  ],
);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerId: text('provider_id').notNull(),
    providerEmail: text('provider_email'),
    providerUsername: text('provider_username'),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    unique().on(table.provider, table.providerId),
    index('idx_accounts_user').on(table.userId),
    index('idx_accounts_provider').on(table.provider),
  ],
);

export const checklists = pgTable(
  'checklists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_checklists_user').on(table.userId),
  ],
);

export const checklistItems = pgTable(
  'checklist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    checklistId: uuid('checklist_id')
      .notNull()
      .references(() => checklists.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    isCritical: boolean('is_critical').default(false),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('idx_checklist_items_checklist').on(table.checklistId),
  ],
);

export const checklistRuns = pgTable(
  'checklist_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    checklistId: uuid('checklist_id')
      .notNull()
      .references(() => checklists.id, { onDelete: 'cascade' }),
    tradeId: uuid('trade_id')
      .references(() => trades.id, { onDelete: 'set null' }),
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('idx_checklist_runs_user').on(table.userId),
    index('idx_checklist_runs_checklist').on(table.checklistId),
    index('idx_checklist_runs_trade').on(table.tradeId),
  ],
);

export const checklistRunItems = pgTable(
  'checklist_run_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => checklistRuns.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => checklistItems.id, { onDelete: 'cascade' }),
    checked: boolean('checked').default(false),
    checkedAt: timestamp('checked_at'),
  },
  (table) => ({
    uniqueRunItem: uniqueIndex('uq_run_items_run_item').on(table.runId, table.itemId),
    runIdx: index('idx_run_items_run').on(table.runId),
  }),
);

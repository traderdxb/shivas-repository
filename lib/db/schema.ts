import { BLOCK_KINDS, type BlockKind } from '@/components/block';
import {
  ASSET_TYPES,
  CONNECTION_STATUSES,
  NOTIFICATION_CHANNELS,
  PERFORMANCE_WINDOWS,
  SYNC_STATUSES,
  TRADE_TYPES,
} from '@/lib/types';
import type { InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  json,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const blockKindEnum = BLOCK_KINDS as [BlockKind, ...BlockKind[]];
const assetTypeEnum = pgEnum('asset_type', ASSET_TYPES);
const tradeTypeEnum = pgEnum('trade_type', TRADE_TYPES);
const syncStatusEnum = pgEnum('sync_status', SYNC_STATUSES);
const notificationChannelEnum = pgEnum('notification_channel', NOTIFICATION_CHANNELS);
const performanceWindowEnum = pgEnum('performance_window', PERFORMANCE_WINDOWS);
const connectionStatusEnum = pgEnum('connection_status', CONNECTION_STATUSES);

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
  displayName: varchar('displayName', { length: 128 }),
  mfaEnabled: boolean('mfaEnabled').notNull().default(false),
  mfaSecretHash: varchar('mfaSecretHash', { length: 255 }),
  lastLoginAt: timestamp('lastLoginAt', { withTimezone: true }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type Message = InferSelectModel<typeof message>;

export const vote = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('kind', { enum: blockKindEnum })
      .$type<BlockKind>()
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const institutionConnection = pgTable('InstitutionConnection', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 64 }).notNull(),
  scope: jsonb('scope').$type<Array<string>>(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  status: connectionStatusEnum('status').notNull().default('pending'),
  lastSyncedAt: timestamp('lastSyncedAt', { withTimezone: true }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});

export type InstitutionConnection = InferSelectModel<typeof institutionConnection>;

export const financialAccount = pgTable('FinancialAccount', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  connectionId: uuid('connectionId')
    .references(() => institutionConnection.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 128 }).notNull(),
  institutionName: varchar('institutionName', { length: 128 }),
  accountNumberMask: varchar('accountNumberMask', { length: 8 }),
  type: assetTypeEnum('type').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  balance: numeric('balance', { precision: 24, scale: 4 }).default('0'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});

export type FinancialAccount = InferSelectModel<typeof financialAccount>;

export const holdingSnapshot = pgTable(
  'HoldingSnapshot',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: uuid('accountId')
      .notNull()
      .references(() => financialAccount.id, { onDelete: 'cascade' }),
    assetId: varchar('assetId', { length: 128 }).notNull(),
    assetType: assetTypeEnum('assetType').notNull(),
    units: numeric('units', { precision: 30, scale: 8 }).notNull(),
    costBasis: numeric('costBasis', { precision: 30, scale: 6 }),
    marketValue: numeric('marketValue', { precision: 30, scale: 6 }),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    asOfDate: timestamp('asOfDate', { withTimezone: true }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userSnapshotUnique: uniqueIndex('HoldingSnapshot_userId_asOfDate_idx').on(
      table.userId,
      table.asOfDate,
      table.assetId,
    ),
    accountAssetUnique: uniqueIndex('HoldingSnapshot_account_asset_idx').on(
      table.accountId,
      table.assetId,
      table.asOfDate,
    ),
  }),
);

export type HoldingSnapshot = InferSelectModel<typeof holdingSnapshot>;

export const transaction = pgTable('Transaction', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  accountId: uuid('accountId')
    .notNull()
    .references(() => financialAccount.id, { onDelete: 'cascade' }),
  assetId: varchar('assetId', { length: 128 }),
  assetType: assetTypeEnum('assetType').notNull(),
  tradeType: tradeTypeEnum('tradeType').notNull(),
  quantity: numeric('quantity', { precision: 30, scale: 8 }).notNull(),
  amount: numeric('amount', { precision: 30, scale: 6 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  executedAt: timestamp('executedAt', { withTimezone: true }).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
});

export type Transaction = InferSelectModel<typeof transaction>;

export const manualAsset = pgTable('ManualAsset', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 128 }).notNull(),
  category: varchar('category', { length: 64 }),
  valuation: numeric('valuation', { precision: 30, scale: 6 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  notes: text('notes'),
  valuedAt: timestamp('valuedAt', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});

export type ManualAsset = InferSelectModel<typeof manualAsset>;

export const performanceMetric = pgTable(
  'PerformanceMetric',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: uuid('accountId').references(() => financialAccount.id, {
      onDelete: 'set null',
    }),
    window: performanceWindowEnum('window').notNull(),
    periodStart: timestamp('periodStart', { withTimezone: true }).notNull(),
    periodEnd: timestamp('periodEnd', { withTimezone: true }).notNull(),
    absoluteReturn: numeric('absoluteReturn', { precision: 30, scale: 6 }).notNull(),
    relativeReturnPct: numeric('relativeReturnPct', {
      precision: 10,
      scale: 6,
    }).notNull(),
    volatility: numeric('volatility', { precision: 10, scale: 6 }),
    sharpe: numeric('sharpe', { precision: 10, scale: 6 }),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userWindowIdx: index('PerformanceMetric_user_window_idx').on(
      table.userId,
      table.window,
    ),
    accountWindowIdx: index('PerformanceMetric_account_window_idx').on(
      table.accountId,
      table.window,
    ),
  }),
);

export type PerformanceMetric = InferSelectModel<typeof performanceMetric>;

export const syncJob = pgTable(
  'SyncJob',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    connectionId: uuid('connectionId')
      .notNull()
      .references(() => institutionConnection.id, { onDelete: 'cascade' }),
    status: syncStatusEnum('status').notNull().default('pending'),
    error: text('error'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    startedAt: timestamp('startedAt', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('endedAt', { withTimezone: true }),
  },
  (table) => ({
    connectionIdx: index('SyncJob_connection_idx').on(table.connectionId),
  }),
);

export type SyncJob = InferSelectModel<typeof syncJob>;

export const notification = pgTable(
  'Notification',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    readAt: timestamp('readAt', { withTimezone: true }),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userChannelIdx: index('Notification_user_channel_idx').on(
      table.userId,
      table.channel,
    ),
  }),
);

export type Notification = InferSelectModel<typeof notification>;

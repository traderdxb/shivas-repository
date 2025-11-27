import { BLOCK_KINDS } from '@/components/block';
import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  doublePrecision,
  integer,
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
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
    kind: varchar('kind', { enum: ['text', 'code', 'spreadsheet'] })
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

export const holdingSnapshot = pgTable('HoldingSnapshot', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  accountId: varchar('accountId', { length: 64 }).notNull(),
  assetId: varchar('assetId', { length: 64 }).notNull(),
  assetType: varchar('assetType', { length: 32 }).notNull().default('equity'),
  quantity: doublePrecision('quantity').notNull().default(0),
  price: doublePrecision('price').notNull().default(0),
  value: doublePrecision('value').notNull().default(0),
  snapshotDate: timestamp('snapshotDate').notNull(),
  currency: varchar('currency', { length: 8 }).default('USD'),
});

export type HoldingSnapshot = InferSelectModel<typeof holdingSnapshot>;

export const portfolioTransaction = pgTable('PortfolioTransaction', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  accountId: varchar('accountId', { length: 64 }).notNull(),
  assetId: varchar('assetId', { length: 64 }).notNull(),
  assetType: varchar('assetType', { length: 32 }).notNull().default('equity'),
  side: varchar('side', { length: 16 }).notNull(),
  quantity: doublePrecision('quantity').notNull().default(0),
  price: doublePrecision('price').notNull().default(0),
  notional: doublePrecision('notional').notNull().default(0),
  transactedAt: timestamp('transactedAt').notNull(),
});

export type PortfolioTransaction = InferSelectModel<typeof portfolioTransaction>;

export const performanceMetric = pgTable('PerformanceMetric', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  accountId: varchar('accountId', { length: 64 }),
  assetId: varchar('assetId', { length: 64 }),
  assetType: varchar('assetType', { length: 32 }),
  metric: varchar('metric', { length: 64 }).notNull(),
  value: doublePrecision('value').notNull().default(0),
  windowDays: integer('windowDays'),
  recordedAt: timestamp('recordedAt').notNull(),
});

export type PerformanceMetric = InferSelectModel<typeof performanceMetric>;

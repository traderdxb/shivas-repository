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
  jsonb,
  uniqueIndex,
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

export const institutionConnection = pgTable('InstitutionConnection', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  provider: varchar('provider', { length: 32 }).notNull(),
  accessToken: text('accessToken'),
  itemId: text('itemId'),
  institutionName: text('institutionName'),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  lastSyncedAt: timestamp('lastSyncedAt'),
  lastAttemptAt: timestamp('lastAttemptAt'),
  cursor: text('cursor'),
  errorMessage: text('errorMessage'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type InstitutionConnection = InferSelectModel<typeof institutionConnection>;

export const account = pgTable(
  'Account',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    connectionId: uuid('connectionId')
      .notNull()
      .references(() => institutionConnection.id),
    providerAccountId: varchar('providerAccountId', { length: 128 }).notNull(),
    name: text('name').notNull(),
    officialName: text('officialName'),
    mask: varchar('mask', { length: 16 }),
    type: varchar('type', { length: 64 }),
    subtype: varchar('subtype', { length: 64 }),
    currency: varchar('currency', { length: 8 }).default('USD'),
    availableBalance: doublePrecision('availableBalance'),
    currentBalance: doublePrecision('currentBalance'),
    institutionValue: doublePrecision('institutionValue'),
    lastSyncedAt: timestamp('lastSyncedAt'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    providerAccountUnique: uniqueIndex('Account_providerAccount_unique').on(
      table.connectionId,
      table.providerAccountId,
    ),
  }),
);

export type Account = InferSelectModel<typeof account>;

export const holdingSnapshot = pgTable('HoldingSnapshot', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  accountId: uuid('accountId')
    .notNull()
    .references(() => account.id),
  capturedAt: timestamp('capturedAt').notNull(),
  securityId: text('securityId'),
  symbol: varchar('symbol', { length: 32 }),
  name: text('name'),
  quantity: doublePrecision('quantity'),
  price: doublePrecision('price'),
  value: doublePrecision('value'),
  costBasis: doublePrecision('costBasis'),
  metadata: jsonb('metadata'),
});

export type HoldingSnapshot = InferSelectModel<typeof holdingSnapshot>;

export const transaction = pgTable(
  'Transaction',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    accountId: uuid('accountId')
      .notNull()
      .references(() => account.id),
    providerTransactionId: varchar('providerTransactionId', {
      length: 128,
    }).notNull(),
    description: text('description').notNull(),
    amount: doublePrecision('amount').notNull(),
    category: varchar('category', { length: 128 }),
    status: varchar('status', { length: 32 }).default('posted'),
    postedAt: timestamp('postedAt').notNull(),
    pending: boolean('pending').default(false),
    metadata: jsonb('metadata'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    providerTransactionUnique: uniqueIndex(
      'Transaction_provider_unique',
    ).on(table.accountId, table.providerTransactionId),
  }),
);

export type Transaction = InferSelectModel<typeof transaction>;

export const manualAsset = pgTable('ManualAsset', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  name: text('name').notNull(),
  category: varchar('category', { length: 64 }).notNull().default('Other'),
  value: doublePrecision('value').notNull(),
  notes: text('notes'),
  lastValuationAt: timestamp('lastValuationAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type ManualAsset = InferSelectModel<typeof manualAsset>;

export const syncJob = pgTable('SyncJob', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  connectionId: uuid('connectionId')
    .notNull()
    .references(() => institutionConnection.id),
  status: varchar('status', { length: 32 }).notNull(),
  startedAt: timestamp('startedAt').notNull(),
  completedAt: timestamp('completedAt'),
  errorMessage: text('errorMessage'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type SyncJob = InferSelectModel<typeof syncJob>;

export const notification = pgTable('Notification', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  type: varchar('type', { length: 32 }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  metadata: jsonb('metadata'),
  readAt: timestamp('readAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type Notification = InferSelectModel<typeof notification>;

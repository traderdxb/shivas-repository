import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { BlockKind } from '@/components/block';
import {
  type AssetType,
  type InstitutionConnectionStatus,
  type NotificationChannel,
  type PerformanceWindow,
  type SyncStatus,
} from '@/lib/types';
import {
  chat,
  document,
  financialAccount,
  holdingSnapshot,
  institutionConnection,
  manualAsset,
  message,
  notification,
  performanceMetric,
  suggestion,
  syncJob,
  transaction,
  user,
  vote,
  type FinancialAccount,
  type HoldingSnapshot,
  type InstitutionConnection,
  type ManualAsset,
  type Message,
  type Notification,
  type PerformanceMetric,
  type Suggestion,
  type SyncJob,
  type Transaction,
  type User,
} from './schema';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

type HoldingSnapshotInsert = typeof holdingSnapshot.$inferInsert;
type ManualAssetInsert = typeof manualAsset.$inferInsert;

export interface AccountActivity {
  account: FinancialAccount;
  holdings: Array<HoldingSnapshot>;
  transactions: Array<Transaction>;
}

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: BlockKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    return await db
      .delete(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

export async function createInstitutionConnection({
  userId,
  provider,
  scope,
  accessToken,
  refreshToken,
  status = 'pending',
  metadata,
}: {
  userId: string;
  provider: string;
  scope?: Array<string>;
  accessToken?: string;
  refreshToken?: string;
  status?: InstitutionConnectionStatus;
  metadata?: Record<string, unknown>;
}): Promise<InstitutionConnection | undefined> {
  try {
    const [connection] = await db
      .insert(institutionConnection)
      .values({
        userId,
        provider,
        scope,
        accessToken,
        refreshToken,
        status,
        metadata,
      })
      .returning();
    return connection;
  } catch (error) {
    console.error('Failed to create institution connection', error);
    throw error;
  }
}

export async function updateInstitutionConnection({
  connectionId,
  status,
  scope,
  accessToken,
  refreshToken,
  lastSyncedAt,
  metadata,
}: {
  connectionId: string;
  status?: InstitutionConnectionStatus;
  scope?: Array<string>;
  accessToken?: string;
  refreshToken?: string;
  lastSyncedAt?: Date;
  metadata?: Record<string, unknown>;
}): Promise<InstitutionConnection | undefined> {
  try {
    const updatePayload: Partial<InstitutionConnection> & {
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (typeof status !== 'undefined') updatePayload.status = status;
    if (typeof scope !== 'undefined') updatePayload.scope = scope;
    if (typeof accessToken !== 'undefined') updatePayload.accessToken = accessToken;
    if (typeof refreshToken !== 'undefined') updatePayload.refreshToken = refreshToken;
    if (typeof metadata !== 'undefined') updatePayload.metadata = metadata;
    if (typeof lastSyncedAt !== 'undefined') updatePayload.lastSyncedAt = lastSyncedAt;

    const [connection] = await db
      .update(institutionConnection)
      .set(updatePayload)
      .where(eq(institutionConnection.id, connectionId))
      .returning();

    return connection;
  } catch (error) {
    console.error('Failed to update institution connection', error);
    throw error;
  }
}

export async function upsertHoldingSnapshots({
  userId,
  snapshots,
}: {
  userId: string;
  snapshots: Array<Omit<HoldingSnapshotInsert, 'userId'>>;
}): Promise<Array<HoldingSnapshot>> {
  if (!snapshots.length) {
    return [];
  }

  try {
    const rows = snapshots.map((snapshot) => ({
      ...snapshot,
      userId,
    }));

    return await db
      .insert(holdingSnapshot)
      .values(rows)
      .onConflictDoUpdate({
        target: [
          holdingSnapshot.accountId,
          holdingSnapshot.assetId,
          holdingSnapshot.asOfDate,
        ],
        set: {
          units: sql`excluded.units`,
          costBasis: sql`excluded.costBasis`,
          marketValue: sql`excluded.marketValue`,
          currency: sql`excluded.currency`,
          metadata: sql`excluded.metadata`,
          createdAt: sql`excluded.createdAt`,
        },
      })
      .returning();
  } catch (error) {
    console.error('Failed to upsert holding snapshots', error);
    throw error;
  }
}

export async function getAccountsWithActivity({
  userId,
  accountIds,
  assetTypes,
  since,
  limitTransactions = 250,
}: {
  userId: string;
  accountIds?: Array<string>;
  assetTypes?: Array<AssetType>;
  since?: Date;
  limitTransactions?: number;
}): Promise<Array<AccountActivity>> {
  try {
    let accountWhere = eq(financialAccount.userId, userId);
    if (accountIds && accountIds.length) {
      accountWhere = and(accountWhere, inArray(financialAccount.id, accountIds))!;
    }

    const accounts = await db
      .select()
      .from(financialAccount)
      .where(accountWhere)
      .orderBy(asc(financialAccount.createdAt));

    if (!accounts.length) {
      return [];
    }

    const accountScope = accountIds && accountIds.length
      ? accountIds
      : accounts.map((account) => account.id);

    let holdingsWhere = and(
      eq(holdingSnapshot.userId, userId),
      inArray(holdingSnapshot.accountId, accountScope),
    )!;

    if (assetTypes && assetTypes.length) {
      holdingsWhere = and(
        holdingsWhere,
        inArray(holdingSnapshot.assetType, assetTypes),
      )!;
    }

    const holdings = await db
      .select()
      .from(holdingSnapshot)
      .where(holdingsWhere)
      .orderBy(desc(holdingSnapshot.asOfDate));

    let transactionsWhere = inArray(transaction.accountId, accountScope);

    if (assetTypes && assetTypes.length) {
      transactionsWhere = and(
        transactionsWhere,
        inArray(transaction.assetType, assetTypes),
      )!;
    }

    if (since) {
      transactionsWhere = and(
        transactionsWhere,
        gte(transaction.executedAt, since),
      )!;
    }

    const transactions = await db
      .select()
      .from(transaction)
      .where(transactionsWhere)
      .orderBy(desc(transaction.executedAt))
      .limit(limitTransactions);

    const holdingsByAccount = new Map<string, Array<HoldingSnapshot>>();
    const transactionsByAccount = new Map<string, Array<Transaction>>();

    for (const position of holdings) {
      const existing = holdingsByAccount.get(position.accountId) ?? [];
      existing.push(position);
      holdingsByAccount.set(position.accountId, existing);
    }

    for (const record of transactions) {
      const existing = transactionsByAccount.get(record.accountId) ?? [];
      existing.push(record);
      transactionsByAccount.set(record.accountId, existing);
    }

    return accounts.map((account) => ({
      account,
      holdings: holdingsByAccount.get(account.id) ?? [],
      transactions: transactionsByAccount.get(account.id) ?? [],
    }));
  } catch (error) {
    console.error('Failed to fetch account activity', error);
    throw error;
  }
}

export async function getHistoricalPerformanceMetrics({
  userId,
  accountIds,
  windows,
}: {
  userId: string;
  accountIds?: Array<string>;
  windows?: Array<PerformanceWindow>;
}): Promise<Array<PerformanceMetric>> {
  try {
    let whereClause = eq(performanceMetric.userId, userId);

    if (accountIds && accountIds.length) {
      whereClause = and(
        whereClause,
        inArray(performanceMetric.accountId, accountIds),
      )!;
    }

    if (windows && windows.length) {
      whereClause = and(
        whereClause,
        inArray(performanceMetric.window, windows),
      )!;
    }

    return await db
      .select()
      .from(performanceMetric)
      .where(whereClause)
      .orderBy(desc(performanceMetric.periodEnd));
  } catch (error) {
    console.error('Failed to fetch performance metrics', error);
    throw error;
  }
}

export async function saveManualAsset({
  id,
  ...values
}: Partial<ManualAssetInsert> & {
  userId: string;
  name: string;
  valuation: ManualAssetInsert['valuation'];
  currency?: string;
}): Promise<ManualAsset | undefined> {
  try {
    if (id) {
      const [updated] = await db
        .update(manualAsset)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(eq(manualAsset.id, id))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(manualAsset)
      .values(values)
      .returning();

    return created;
  } catch (error) {
    console.error('Failed to persist manual asset', error);
    throw error;
  }
}

export async function getManualAssets({
  userId,
  categories,
}: {
  userId: string;
  categories?: Array<string>;
}): Promise<Array<ManualAsset>> {
  try {
    let whereClause = eq(manualAsset.userId, userId);

    if (categories && categories.length) {
      whereClause = and(
        whereClause,
        inArray(manualAsset.category, categories),
      )!;
    }

    return await db
      .select()
      .from(manualAsset)
      .where(whereClause)
      .orderBy(desc(manualAsset.valuedAt));
  } catch (error) {
    console.error('Failed to fetch manual assets', error);
    throw error;
  }
}

export async function createNotification({
  userId,
  channel,
  payload,
}: {
  userId: string;
  channel: NotificationChannel;
  payload: Record<string, unknown>;
}): Promise<Notification | undefined> {
  try {
    const [created] = await db
      .insert(notification)
      .values({ userId, channel, payload })
      .returning();

    return created;
  } catch (error) {
    console.error('Failed to create notification', error);
    throw error;
  }
}

export async function getNotifications({
  userId,
  unreadOnly = false,
}: {
  userId: string;
  unreadOnly?: boolean;
}): Promise<Array<Notification>> {
  try {
    let whereClause = eq(notification.userId, userId);

    if (unreadOnly) {
      whereClause = and(whereClause, isNull(notification.readAt))!;
    }

    return await db
      .select()
      .from(notification)
      .where(whereClause)
      .orderBy(desc(notification.createdAt));
  } catch (error) {
    console.error('Failed to fetch notifications', error);
    throw error;
  }
}

export async function markNotificationRead({
  notificationId,
  readAt = new Date(),
}: {
  notificationId: string;
  readAt?: Date;
}): Promise<Notification | undefined> {
  try {
    const [updated] = await db
      .update(notification)
      .set({ readAt })
      .where(eq(notification.id, notificationId))
      .returning();

    return updated;
  } catch (error) {
    console.error('Failed to mark notification as read', error);
    throw error;
  }
}

export async function startSyncJob({
  connectionId,
  status = 'pending',
  metadata,
}: {
  connectionId: string;
  status?: SyncStatus;
  metadata?: Record<string, unknown>;
}): Promise<SyncJob | undefined> {
  try {
    const [job] = await db
      .insert(syncJob)
      .values({ connectionId, status, metadata })
      .returning();

    return job;
  } catch (error) {
    console.error('Failed to start sync job', error);
    throw error;
  }
}

export async function completeSyncJob({
  jobId,
  status,
  errorMessage,
  metadata,
}: {
  jobId: string;
  status: SyncStatus;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}): Promise<SyncJob | undefined> {
  try {
    const [job] = await db
      .update(syncJob)
      .set({
        status,
        error: errorMessage,
        metadata,
        endedAt: new Date(),
      })
      .where(eq(syncJob.id, jobId))
      .returning();

    return job;
  } catch (error) {
    console.error('Failed to finalize sync job', error);
    throw error;
  }
}

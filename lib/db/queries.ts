import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
  institutionConnection,
  type InstitutionConnection,
  account,
  type Account,
  holdingSnapshot,
  transaction,
  manualAsset,
  type ManualAsset,
  syncJob,
  type SyncJob,
  notification,
  type Notification,
} from './schema';
import { BlockKind } from '@/components/block';
import type {
  NormalizedAccount,
  NormalizedHolding,
  NormalizedTransaction,
} from '@/lib/integrations/base';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

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

export async function getInstitutionConnectionsByUserId({
  userId,
}: {
  userId: string;
}) {
  try {
    return await db
      .select()
      .from(institutionConnection)
      .where(eq(institutionConnection.userId, userId))
      .orderBy(desc(institutionConnection.createdAt));
  } catch (error) {
    console.error('Failed to get institution connections in database');
    throw error;
  }
}

export async function getInstitutionConnectionById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [connectionRecord] = await db
      .select()
      .from(institutionConnection)
      .where(
        and(
          eq(institutionConnection.id, id),
          eq(institutionConnection.userId, userId),
        ),
      );

    return connectionRecord;
  } catch (error) {
    console.error('Failed to get institution connection by id in database');
    throw error;
  }
}

export async function createOrUpdateInstitutionConnection({
  userId,
  provider,
  accessToken,
  itemId,
  institutionName,
}: {
  userId: string;
  provider: string;
  accessToken: string;
  itemId?: string | null;
  institutionName?: string | null;
}) {
  const now = new Date();

  try {
    let existingConnection: InstitutionConnection | null = null;

    if (itemId) {
      const [record] = await db
        .select()
        .from(institutionConnection)
        .where(
          and(
            eq(institutionConnection.userId, userId),
            eq(institutionConnection.itemId, itemId),
          ),
        );

      if (record) {
        existingConnection = record;
      }
    }

    if (existingConnection) {
      const [updated] = await db
        .update(institutionConnection)
        .set({
          accessToken,
          institutionName: institutionName ?? existingConnection.institutionName,
          status: 'linked',
          updatedAt: now,
          lastAttemptAt: now,
          errorMessage: null,
        })
        .where(eq(institutionConnection.id, existingConnection.id))
        .returning();

      return updated;
    }

    const [inserted] = await db
      .insert(institutionConnection)
      .values({
        userId,
        provider,
        accessToken,
        itemId,
        institutionName,
        status: 'linked',
        createdAt: now,
        updatedAt: now,
        lastAttemptAt: now,
      })
      .returning();

    return inserted;
  } catch (error) {
    console.error('Failed to create institution connection in database');
    throw error;
  }
}

export async function markConnectionSynced({
  connectionId,
  cursor,
  status = 'healthy',
}: {
  connectionId: string;
  cursor?: string | null;
  status?: string;
}) {
  const now = new Date();
  try {
    const [record] = await db
      .update(institutionConnection)
      .set({
        status,
        cursor: cursor ?? null,
        lastSyncedAt: now,
        lastAttemptAt: now,
        errorMessage: null,
        updatedAt: now,
      })
      .where(eq(institutionConnection.id, connectionId))
      .returning();

    return record;
  } catch (error) {
    console.error('Failed to mark institution connection sync state');
    throw error;
  }
}

export async function markConnectionErrored({
  connectionId,
  error,
}: {
  connectionId: string;
  error: string;
}) {
  try {
    await db
      .update(institutionConnection)
      .set({
        status: 'error',
        errorMessage: error,
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(institutionConnection.id, connectionId));
  } catch (err) {
    console.error('Failed to mark institution connection as errored');
    throw err;
  }
}

export type ConnectionDashboardRow = {
  connection: InstitutionConnection;
  accounts: Array<Account>;
  latestJob: SyncJob | null;
};

export async function listConnectionsEligibleForSync({
  limit = 50,
}: {
  limit?: number;
} = {}) {
  try {
    const rows = await db
      .select({
        connection: institutionConnection,
        userEmail: user.email,
      })
      .from(institutionConnection)
      .leftJoin(user, eq(user.id, institutionConnection.userId))
      .where(inArray(institutionConnection.status, ['linked', 'healthy']))
      .limit(limit);

    return rows.filter(
      (row) => row.connection.provider !== 'manual' && !!row.connection.accessToken,
    );
  } catch (error) {
    console.error('Failed to list connections for sync jobs');
    throw error;
  }
}

export async function getConnectionDashboardSummary({
  userId,
}: {
  userId: string;
}): Promise<Array<ConnectionDashboardRow>> {
  try {
    const connections = await getInstitutionConnectionsByUserId({ userId });

    if (connections.length === 0) {
      return [];
    }

    const connectionIds = connections.map((connection) => connection.id);

    const accountsByConnection = connectionIds.length
      ? await db
          .select()
          .from(account)
          .where(inArray(account.connectionId, connectionIds))
      : [];

    const jobsByConnection = connectionIds.length
      ? await db
          .select()
          .from(syncJob)
          .where(inArray(syncJob.connectionId, connectionIds))
          .orderBy(desc(syncJob.startedAt))
      : [];

    const latestJobMap = new Map<string, SyncJob>();
    for (const job of jobsByConnection) {
      if (!latestJobMap.has(job.connectionId)) {
        latestJobMap.set(job.connectionId, job);
      }
    }

    return connections.map((connection) => ({
      connection,
      accounts: accountsByConnection.filter(
        (accountRecord) => accountRecord.connectionId === connection.id,
      ),
      latestJob: latestJobMap.get(connection.id) ?? null,
    }));
  } catch (error) {
    console.error('Failed to build connection dashboard summary');
    throw error;
  }
}

export async function upsertAccountsForConnection({
  connectionId,
  userId,
  accounts: providerAccounts,
}: {
  connectionId: string;
  userId: string;
  accounts: Array<NormalizedAccount>;
}) {
  if (!providerAccounts?.length) return [];

  try {
    const existingAccounts = await db
      .select()
      .from(account)
      .where(eq(account.connectionId, connectionId));

    const existingByProviderId = new Map(
      existingAccounts.map((record) => [record.providerAccountId, record]),
    );

    const now = new Date();
    const inserts: Array<typeof account.$inferInsert> = [];
    const updates: Array<{
      id: string;
      payload: Partial<typeof account.$inferInsert>;
    }> = [];

    for (const providerAccount of providerAccounts) {
      const payload: Partial<typeof account.$inferInsert> & {
        providerAccountId: string;
        userId: string;
        connectionId: string;
      } = {
        providerAccountId: providerAccount.id,
        userId,
        connectionId,
        name: providerAccount.name,
        officialName: providerAccount.officialName ?? providerAccount.name,
        mask: providerAccount.mask ?? null,
        type: providerAccount.type ?? null,
        subtype: providerAccount.subtype ?? null,
        currency: providerAccount.currency ?? 'USD',
        availableBalance: providerAccount.availableBalance ?? null,
        currentBalance: providerAccount.currentBalance ?? null,
        institutionValue: providerAccount.institutionValue ?? null,
        lastSyncedAt: providerAccount.lastSyncedAt ?? now,
        updatedAt: now,
      };

      const existing = existingByProviderId.get(providerAccount.id);
      if (existing) {
        updates.push({ id: existing.id, payload });
      } else {
        inserts.push({ ...payload, createdAt: now });
      }
    }

    if (inserts.length) {
      await db.insert(account).values(inserts);
    }

    for (const update of updates) {
      await db.update(account).set(update.payload).where(eq(account.id, update.id));
    }

    return await db
      .select()
      .from(account)
      .where(eq(account.connectionId, connectionId));
  } catch (error) {
    console.error('Failed to upsert accounts for connection');
    throw error;
  }
}

export async function getAccountById({
  accountId,
  userId,
}: {
  accountId: string;
  userId: string;
}) {
  try {
    const [record] = await db
      .select()
      .from(account)
      .where(and(eq(account.id, accountId), eq(account.userId, userId)));

    return record;
  } catch (error) {
    console.error('Failed to get account by id');
    throw error;
  }
}

export async function getAccountsByConnectionId({
  connectionId,
  userId,
}: {
  connectionId: string;
  userId: string;
}) {
  try {
    return await db
      .select()
      .from(account)
      .where(
        and(
          eq(account.connectionId, connectionId),
          eq(account.userId, userId),
        ),
      );
  } catch (error) {
    console.error('Failed to get accounts by connection id');
    throw error;
  }
}

export async function saveHoldingSnapshotsForConnection({
  connectionId,
  holdings,
}: {
  connectionId: string;
  holdings: Array<NormalizedHolding>;
}) {
  if (!holdings?.length) return [];

  try {
    const accountsForConnection = await db
      .select()
      .from(account)
      .where(eq(account.connectionId, connectionId));

    if (accountsForConnection.length === 0) {
      return [];
    }

    const accountMap = new Map(
      accountsForConnection.map((accRecord) => [accRecord.providerAccountId, accRecord.id]),
    );

    const rows = holdings
      .map((holdingRecord) => {
        const mappedAccountId = accountMap.get(holdingRecord.providerAccountId);
        if (!mappedAccountId) return null;

        return {
          accountId: mappedAccountId,
          capturedAt: holdingRecord.asOf ?? new Date(),
          securityId: holdingRecord.securityId ?? holdingRecord.symbol ?? null,
          symbol: holdingRecord.symbol ?? null,
          name: holdingRecord.name ?? null,
          quantity: holdingRecord.quantity ?? null,
          price: holdingRecord.price ?? null,
          value: holdingRecord.value ?? null,
          costBasis: holdingRecord.costBasis ?? null,
          metadata: holdingRecord.metadata ?? {},
        };
      })
      .filter(Boolean) as Array<{
      accountId: string;
      capturedAt: Date;
      securityId: string | null;
      symbol: string | null;
      name: string | null;
      quantity: number | null;
      price: number | null;
      value: number | null;
      costBasis: number | null;
      metadata: Record<string, unknown>;
    }>;

    if (rows.length) {
      await db.insert(holdingSnapshot).values(rows);
    }

    return rows;
  } catch (error) {
    console.error('Failed to save holding snapshots');
    throw error;
  }
}

export async function saveTransactionsForConnection({
  connectionId,
  transactions: providerTransactions,
}: {
  connectionId: string;
  transactions: Array<NormalizedTransaction>;
}) {
  if (!providerTransactions?.length) return [];

  try {
    const accountsForConnection = await db
      .select()
      .from(account)
      .where(eq(account.connectionId, connectionId));

    if (accountsForConnection.length === 0) {
      return [];
    }

    const accountMap = new Map(
      accountsForConnection.map((accRecord) => [accRecord.providerAccountId, accRecord.id]),
    );

    const providerTransactionIds = providerTransactions.map((tx) => tx.id);

    const existingTransactions = providerTransactionIds.length
      ? await db
          .select({ providerTransactionId: transaction.providerTransactionId })
          .from(transaction)
          .where(inArray(transaction.providerTransactionId, providerTransactionIds))
      : [];

    const existingIds = new Set(
      existingTransactions.map((tx) => tx.providerTransactionId),
    );

    const rows = providerTransactions
      .map((tx) => {
        const mappedAccountId = accountMap.get(tx.providerAccountId);
        if (!mappedAccountId) return null;
        if (existingIds.has(tx.id)) return null;

        const postedAt = tx.date instanceof Date ? tx.date : new Date(tx.date);

        return {
          accountId: mappedAccountId,
          providerTransactionId: tx.id,
          description: tx.description,
          amount: tx.amount,
          category: tx.category ?? null,
          status: tx.status ?? 'posted',
          postedAt,
          pending: tx.pending ?? false,
          metadata: tx.metadata ?? {},
          createdAt: new Date(),
        };
      })
      .filter(Boolean) as Array<{
      accountId: string;
      providerTransactionId: string;
      description: string;
      amount: number;
      category: string | null;
      status: string;
      postedAt: Date;
      pending: boolean;
      metadata: Record<string, unknown>;
      createdAt: Date;
    }>;

    if (rows.length) {
      await db.insert(transaction).values(rows);
    }

    return rows;
  } catch (error) {
    console.error('Failed to save transactions for connection');
    throw error;
  }
}

export async function getManualAssetsByUserId({
  userId,
}: {
  userId: string;
}) {
  try {
    return await db
      .select()
      .from(manualAsset)
      .where(eq(manualAsset.userId, userId))
      .orderBy(desc(manualAsset.createdAt));
  } catch (error) {
    console.error('Failed to get manual assets');
    throw error;
  }
}

export async function createManualAsset({
  userId,
  name,
  category,
  value,
  notes,
}: {
  userId: string;
  name: string;
  category: string;
  value: number;
  notes?: string | null;
}) {
  try {
    const [asset] = await db
      .insert(manualAsset)
      .values({
        userId,
        name,
        category,
        value,
        notes: notes ?? null,
        lastValuationAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return asset;
  } catch (error) {
    console.error('Failed to create manual asset');
    throw error;
  }
}

export async function updateManualAsset({
  id,
  userId,
  name,
  category,
  value,
  notes,
}: {
  id: string;
  userId: string;
  name?: string;
  category?: string;
  value?: number;
  notes?: string | null;
}) {
  try {
    const payload: Partial<typeof manualAsset.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) payload.name = name;
    if (category !== undefined) payload.category = category;
    if (notes !== undefined) payload.notes = notes ?? null;
    if (value !== undefined) {
      payload.value = value;
      payload.lastValuationAt = new Date();
    }

    const [asset] = await db
      .update(manualAsset)
      .set(payload)
      .where(and(eq(manualAsset.id, id), eq(manualAsset.userId, userId)))
      .returning();

    return asset;
  } catch (error) {
    console.error('Failed to update manual asset');
    throw error;
  }
}

export async function deleteManualAsset({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    await db
      .delete(manualAsset)
      .where(and(eq(manualAsset.id, id), eq(manualAsset.userId, userId)));
  } catch (error) {
    console.error('Failed to delete manual asset');
    throw error;
  }
}

export async function createSyncJobRecord({
  userId,
  connectionId,
  metadata,
}: {
  userId: string;
  connectionId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const [job] = await db
      .insert(syncJob)
      .values({
        userId,
        connectionId,
        status: 'running',
        startedAt: new Date(),
        metadata: metadata ?? {},
        createdAt: new Date(),
      })
      .returning();

    return job;
  } catch (error) {
    console.error('Failed to create sync job');
    throw error;
  }
}

export async function completeSyncJobRecord({
  jobId,
  status,
  errorMessage,
  metadata,
}: {
  jobId: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const [job] = await db
      .update(syncJob)
      .set({
        status,
        completedAt: new Date(),
        errorMessage: errorMessage ?? null,
        metadata: metadata ?? {},
      })
      .where(eq(syncJob.id, jobId))
      .returning();

    return job;
  } catch (error) {
    console.error('Failed to complete sync job');
    throw error;
  }
}

export async function getSyncJobsByUserId({
  userId,
  limit = 20,
}: {
  userId: string;
  limit?: number;
}) {
  try {
    return await db
      .select()
      .from(syncJob)
      .where(eq(syncJob.userId, userId))
      .orderBy(desc(syncJob.startedAt))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get sync jobs by user id');
    throw error;
  }
}

export async function createNotificationRecord({
  userId,
  type,
  title,
  body,
  metadata,
}: {
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const [record] = await db
      .insert(notification)
      .values({
        userId,
        type,
        title,
        body,
        metadata: metadata ?? {},
        createdAt: new Date(),
      })
      .returning();

    return record;
  } catch (error) {
    console.error('Failed to create notification');
    throw error;
  }
}

export async function getNotificationsByUserId({
  userId,
  limit = 50,
}: {
  userId: string;
  limit?: number;
}) {
  try {
    return await db
      .select()
      .from(notification)
      .where(eq(notification.userId, userId))
      .orderBy(desc(notification.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get notifications for user');
    throw error;
  }
}

export async function markNotificationsRead({
  userId,
  notificationIds,
}: {
  userId: string;
  notificationIds: Array<string>;
}) {
  if (!notificationIds.length) return [];

  try {
    return await db
      .update(notification)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notification.userId, userId),
          inArray(notification.id, notificationIds),
        ),
      )
      .returning();
  } catch (error) {
    console.error('Failed to mark notifications as read');
    throw error;
  }
}

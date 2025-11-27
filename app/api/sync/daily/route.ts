import { NextResponse } from 'next/server';

import {
  completeSyncJobRecord,
  createSyncJobRecord,
  listConnectionsEligibleForSync,
  markConnectionErrored,
  markConnectionSynced,
  saveHoldingSnapshotsForConnection,
  saveTransactionsForConnection,
  upsertAccountsForConnection,
} from '@/lib/db/queries';
import type { ProviderIdentifier } from '@/lib/integrations/base';
import { getIntegrationProvider } from '@/lib/integrations/providers';
import { NotificationDispatcher } from '@/lib/notifications/dispatcher';

export async function POST(request: Request) {
  const cronSecret = process.env.INTERNAL_CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const dispatcher = new NotificationDispatcher();
  const connections = await listConnectionsEligibleForSync({ limit: 100 });
  const results: Array<{ connectionId: string; status: string; error?: string }> = [];

  for (const row of connections) {
    const connection = row.connection;
    const provider = getIntegrationProvider(
      connection.provider as ProviderIdentifier,
    );

    const job = await createSyncJobRecord({
      userId: connection.userId,
      connectionId: connection.id,
      metadata: {
        trigger: 'daily',
      },
    });

    try {
      const providerAccounts = await provider.fetchAccounts(connection);
      await upsertAccountsForConnection({
        connectionId: connection.id,
        userId: connection.userId,
        accounts: providerAccounts,
      });

      const holdings = await provider.fetchHoldings(connection);
      const insertedHoldings = await saveHoldingSnapshotsForConnection({
        connectionId: connection.id,
        holdings,
      });

      const transactionResult = await provider.fetchTransactions(connection, {
        cursor: connection.cursor ?? null,
      });

      const insertedTransactions = await saveTransactionsForConnection({
        connectionId: connection.id,
        transactions: transactionResult.transactions,
      });

      await markConnectionSynced({
        connectionId: connection.id,
        cursor: transactionResult.nextCursor ?? null,
      });

      await completeSyncJobRecord({
        jobId: job.id,
        status: 'success',
        metadata: job.metadata,
      });

      await dispatcher.notifySyncSuccess({
        userId: connection.userId,
        email: row.userEmail,
        connection,
        stats: {
          accounts: providerAccounts.length,
          holdings: insertedHoldings.length,
          transactions: insertedTransactions.length,
        },
      });

      results.push({ connectionId: connection.id, status: 'success' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to complete sync';

      await markConnectionErrored({ connectionId: connection.id, error: message });
      await completeSyncJobRecord({
        jobId: job.id,
        status: 'failed',
        errorMessage: message,
      });

      await dispatcher.notifySyncFailure({
        userId: connection.userId,
        email: row.userEmail,
        connection,
        error: message,
      });

      console.error('Failed to sync connection', error);
      results.push({ connectionId: connection.id, status: 'failed', error: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

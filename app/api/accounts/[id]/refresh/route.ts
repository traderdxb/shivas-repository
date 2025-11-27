import { NextResponse } from 'next/server';

import { auth } from '@/app/(auth)/auth';
import {
  completeSyncJobRecord,
  createSyncJobRecord,
  getAccountById,
  getInstitutionConnectionById,
  markConnectionErrored,
  markConnectionSynced,
  saveHoldingSnapshotsForConnection,
  saveTransactionsForConnection,
  upsertAccountsForConnection,
} from '@/lib/db/queries';
import type { ProviderIdentifier } from '@/lib/integrations/base';
import { getIntegrationProvider } from '@/lib/integrations/providers';

export async function POST(
  request: Request,
  context: { params: { id: string } },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountRecord = await getAccountById({
    accountId: context.params.id,
    userId: session.user.id,
  });

  if (!accountRecord) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const connection = await getInstitutionConnectionById({
    id: accountRecord.connectionId,
    userId: session.user.id,
  });

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  const provider = getIntegrationProvider(
    connection.provider as ProviderIdentifier,
  );

  const job = await createSyncJobRecord({
    userId: session.user.id,
    connectionId: connection.id,
    metadata: {
      trigger: 'manual',
      accountId: accountRecord.id,
    },
  });

  try {
    const providerAccounts = await provider.fetchAccounts(connection);
    await upsertAccountsForConnection({
      connectionId: connection.id,
      userId: session.user.id,
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

    return NextResponse.json({
      success: true,
      stats: {
        accounts: providerAccounts.length,
        holdings: insertedHoldings.length,
        transactions: insertedTransactions.length,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unable to refresh account';

    await markConnectionErrored({
      connectionId: connection.id,
      error: errorMessage,
    });

    await completeSyncJobRecord({
      jobId: job.id,
      status: 'failed',
      errorMessage,
    });

    console.error('Failed to refresh account', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

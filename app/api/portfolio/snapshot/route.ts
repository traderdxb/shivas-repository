import { auth } from '@/app/(auth)/auth';
import {
  getHoldingSnapshots,
  getPortfolioTransactions,
} from '@/lib/db/queries';
import {
  getSnapshotValue,
  getSignedTransactionNotional,
} from '@/lib/portfolio/analytics';

interface LatestSnapshotEntry {
  value: number;
  accountId: string;
  timestamp: number;
}

export const runtime = 'edge';
export const revalidate = 15;

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const assetTypes = parseList(searchParams.get('assetTypes'));
  const accountIds = parseList(searchParams.get('accountIds'));

  const [snapshots, transactions] = await Promise.all([
    getHoldingSnapshots({
      userId: session.user.id,
      assetTypes,
      accountIds,
    }),
    getPortfolioTransactions({
      userId: session.user.id,
      assetTypes,
      accountIds,
    }),
  ]);

  const latestByAsset = new Map<string, LatestSnapshotEntry>();

  snapshots.forEach((snapshot) => {
    const date = snapshot.snapshotDate;
    if (!date) return;
    const key = `${snapshot.accountId}:${snapshot.assetId}`;
    const existing = latestByAsset.get(key);
    const value = getSnapshotValue(snapshot);
    const timestamp = date.getTime();

    if (!existing || timestamp > existing.timestamp) {
      latestByAsset.set(key, {
        value,
        accountId: snapshot.accountId,
        timestamp,
      });
    }
  });

  let totalValue = 0;
  const accounts = new Map<string, number>();

  latestByAsset.forEach((entry) => {
    totalValue += entry.value;
    accounts.set(entry.accountId, (accounts.get(entry.accountId) ?? 0) + entry.value);
  });

  const contributions = transactions.reduce(
    (sum, transaction) => sum + getSignedTransactionNotional(transaction),
    0,
  );

  const absoluteReturn = totalValue - contributions;
  const relativeReturn = contributions === 0 ? 0 : absoluteReturn / contributions;

  const accountBreakdown = Array.from(accounts.entries()).map(([accountId, value]) => ({
    accountId,
    value,
    weight: totalValue === 0 ? 0 : value / totalValue,
  }));

  return Response.json({
    asOf: new Date().toISOString(),
    totals: {
      value: totalValue,
      contributions,
      absoluteReturn,
      relativeReturn,
    },
    accounts: accountBreakdown,
  });
}

function parseList(value: string | null): Array<string> | undefined {
  if (!value) return undefined;
  const list = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
}

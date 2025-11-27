import { auth } from '@/app/(auth)/auth';
import {
  getHoldingSnapshots,
  getPortfolioTransactions,
} from '@/lib/db/queries';
import type {
  HoldingSnapshot,
  PortfolioTransaction,
} from '@/lib/db/schema';
import {
  computePortfolioAnalytics,
  getDateRangeForWindow,
  getLatestValueFromSnapshots,
  type DateRange,
} from '@/lib/portfolio/analytics';

export const runtime = 'edge';
export const revalidate = 60;

const DEFAULT_WINDOW_DAYS = 180;
const DEFAULT_RISK_FREE_RATE = 0.02;
const DAY_IN_MS = 86_400_000;

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const assetTypes = parseList(searchParams.get('assetTypes'));
  const accountIds = parseList(searchParams.get('accountIds'));
  const riskFreeRateParam = searchParams.get('riskFreeRate');
  const riskFreeRate =
    riskFreeRateParam !== null && Number.isFinite(Number(riskFreeRateParam))
      ? Number(riskFreeRateParam)
      : DEFAULT_RISK_FREE_RATE;

  const resolvedRange = resolveRange(searchParams);

  if (!resolvedRange) {
    return Response.json({ error: 'Invalid date range' }, { status: 400 });
  }

  const { range, windowDays } = resolvedRange;

  const [snapshots, transactions] = await Promise.all([
    getHoldingSnapshots({
      userId: session.user.id,
      startDate: range.start,
      endDate: range.end,
      assetTypes,
      accountIds,
    }),
    getPortfolioTransactions({
      userId: session.user.id,
      startDate: range.start,
      endDate: range.end,
      assetTypes,
      accountIds,
    }),
  ]);

  const groupedSnapshots = groupByAsset(snapshots);
  const groupedTransactions = groupTransactionsByAsset(transactions);

  const rankings = Array.from(groupedSnapshots.entries()).map(([key, assetSnapshots]) => {
    const assetTransactions = groupedTransactions.get(key) ?? [];
    const analytics = computePortfolioAnalytics({
      snapshots: assetSnapshots,
      transactions: assetTransactions,
      range,
      riskFreeRate,
    });

    const { assetType, assetId } = decodeAssetKey(key);

    return {
      assetType,
      assetId,
      latestValue: getLatestValueFromSnapshots(assetSnapshots),
      metrics: analytics,
    };
  });

  rankings.sort(
    (a, b) => b.metrics.relativeReturn - a.metrics.relativeReturn,
  );

  const totalLatestValue = rankings.reduce((sum, entry) => sum + entry.latestValue, 0);
  const heatmap = buildHeatmap(rankings, totalLatestValue);

  return Response.json({
    range: {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      windowDays,
    },
    filters: {
      assetTypes: assetTypes ?? [],
      accountIds: accountIds ?? [],
    },
    rankings,
    heatmap,
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

function resolveRange(
  searchParams: URLSearchParams,
): { range: DateRange; windowDays: number } | null {
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  if (startDateParam && endDateParam) {
    const start = new Date(startDateParam);
    const end = new Date(endDateParam);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }

    const normalized = start.getTime() > end.getTime()
      ? { start: end, end: start }
      : { start, end };

    const windowDays = Math.max(
      1,
      Math.round(
        Math.abs(normalized.end.getTime() - normalized.start.getTime()) / DAY_IN_MS,
      ),
    );

    return { range: normalized, windowDays };
  }

  const windowParam = searchParams.get('window');
  const parsedWindow = windowParam ? Number(windowParam) : undefined;
  const windowDays = Number.isFinite(parsedWindow) && parsedWindow
    ? parsedWindow
    : DEFAULT_WINDOW_DAYS;

  return { range: getDateRangeForWindow(windowDays), windowDays };
}

function groupByAsset(
  snapshots: Array<HoldingSnapshot>,
): Map<string, Array<HoldingSnapshot>> {
  const map = new Map<string, Array<HoldingSnapshot>>();
  snapshots.forEach((snapshot) => {
    const key = buildAssetKey(snapshot.assetType, snapshot.assetId);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push(snapshot);
  });
  return map;
}

function groupTransactionsByAsset(
  transactions: Array<PortfolioTransaction>,
): Map<string, Array<PortfolioTransaction>> {
  const map = new Map<string, Array<PortfolioTransaction>>();
  transactions.forEach((transaction) => {
    const key = buildAssetKey(transaction.assetType, transaction.assetId);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push(transaction);
  });
  return map;
}

function buildAssetKey(assetType?: string | null, assetId?: string | null) {
  return `${assetType ?? 'other'}::${assetId ?? 'unassigned'}`;
}

function decodeAssetKey(key: string) {
  const [assetType, assetId] = key.split('::');
  return {
    assetType: assetType === 'other' ? null : assetType,
    assetId: assetId === 'unassigned' ? null : assetId,
  };
}

interface HeatmapBucket {
  assetType: string | null;
  allocation: number;
  averageReturn: number;
}

function buildHeatmap(
  rankings: Array<{
    assetType: string | null;
    latestValue: number;
    metrics: { relativeReturn: number };
  }>,
  totalValue: number,
): Array<HeatmapBucket> {
  const map = new Map<string, { allocation: number; totalReturn: number; count: number }>();

  rankings.forEach((entry) => {
    const key = entry.assetType ?? 'other';
    const bucket = map.get(key) ?? { allocation: 0, totalReturn: 0, count: 0 };
    bucket.allocation += totalValue === 0 ? 0 : entry.latestValue / totalValue;
    bucket.totalReturn += entry.metrics.relativeReturn;
    bucket.count += 1;
    map.set(key, bucket);
  });

  return Array.from(map.entries()).map(([assetType, bucket]) => ({
    assetType: assetType === 'other' ? null : assetType,
    allocation: bucket.allocation,
    averageReturn: bucket.count ? bucket.totalReturn / bucket.count : 0,
  }));
}

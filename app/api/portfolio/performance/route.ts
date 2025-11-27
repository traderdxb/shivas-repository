import { auth } from '@/app/(auth)/auth';
import {
  getHoldingSnapshots,
  getPerformanceMetrics,
  getPortfolioTransactions,
} from '@/lib/db/queries';
import type { PerformanceMetric } from '@/lib/db/schema';
import {
  computePortfolioAnalytics,
  getDateRangeForWindow,
  type DateRange,
} from '@/lib/portfolio/analytics';

export const runtime = 'edge';
export const revalidate = 60;

const DEFAULT_WINDOW_DAYS = 90;
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
  const metricsFilter = parseList(searchParams.get('metrics'));
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

  const [snapshots, performanceMetrics, transactions] = await Promise.all([
    getHoldingSnapshots({
      userId: session.user.id,
      startDate: range.start,
      endDate: range.end,
      assetTypes,
      accountIds,
    }),
    getPerformanceMetrics({
      userId: session.user.id,
      startDate: range.start,
      endDate: range.end,
      assetTypes,
      accountIds,
      metrics: metricsFilter,
    }),
    getPortfolioTransactions({
      userId: session.user.id,
      startDate: range.start,
      endDate: range.end,
      assetTypes,
      accountIds,
    }),
  ]);

  const analytics = computePortfolioAnalytics({
    snapshots,
    transactions,
    range,
    riskFreeRate,
  });

  const metricSeries = buildMetricSeries(performanceMetrics);

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
    metrics: {
      absoluteReturn: analytics.absoluteReturn,
      relativeReturn: analytics.relativeReturn,
      volatility: analytics.volatility,
      sharpeRatio: analytics.sharpeRatio,
    },
    timeSeries: analytics.timeSeries,
    metricSeries,
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
      Math.round(Math.abs(normalized.end.getTime() - normalized.start.getTime()) / DAY_IN_MS),
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

interface MetricPoint {
  date: string;
  value: number;
  windowDays: number | null;
  accountId?: string | null;
  assetType?: string | null;
}

type MetricSeries = Record<string, Array<MetricPoint>>;

function buildMetricSeries(metrics: Array<PerformanceMetric>): MetricSeries {
  if (!metrics.length) {
    return {};
  }

  const grouped: MetricSeries = {};

  metrics.forEach((metric) => {
    const metricName = metric.metric;
    if (!grouped[metricName]) {
      grouped[metricName] = [];
    }

    grouped[metricName]?.push({
      date: metric.recordedAt.toISOString(),
      value: typeof metric.value === 'number' ? metric.value : 0,
      windowDays: metric.windowDays ?? null,
      accountId: metric.accountId,
      assetType: metric.assetType,
    });
  });

  Object.values(grouped).forEach((series) => {
    series.sort((a, b) => a.date.localeCompare(b.date));
  });

  return grouped;
}

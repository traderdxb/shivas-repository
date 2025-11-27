import type {
  HoldingSnapshot,
  PortfolioTransaction,
} from '@/lib/db/schema';

export interface DateRange {
  start: Date;
  end: Date;
}

export type WindowPreset = 90 | 180 | 365;

export interface TimeSeriesPoint {
  date: string;
  value: number;
  normalizedValue: number;
}

export interface PortfolioAnalyticsInput {
  snapshots: Array<HoldingSnapshot>;
  transactions: Array<PortfolioTransaction>;
  range?: DateRange;
  riskFreeRate?: number;
}

export interface PortfolioAnalyticsResult {
  absoluteReturn: number;
  relativeReturn: number;
  volatility: number;
  sharpeRatio: number;
  timeSeries: Array<TimeSeriesPoint>;
}

const DAY_IN_MS = 86_400_000;
const TRADING_DAYS_PER_YEAR = 252;
const DEFAULT_RISK_FREE_RATE = 0.02;
const analyticsCache = new Map<string, PortfolioAnalyticsResult>();

export const WINDOW_PRESETS: Array<WindowPreset> = [90, 180, 365];

export function getDateRangeForWindow(
  windowDays: number,
  anchor: Date = new Date(),
): DateRange {
  const safeWindow = Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 90;
  const safeAnchor = toDate(anchor) ?? new Date();
  const end = safeAnchor;
  const start = new Date(end.getTime() - safeWindow * DAY_IN_MS);
  return normalizeRange({ start, end });
}

export function normalizeRange(range: DateRange): DateRange {
  const start = toDate(range.start) ?? new Date();
  const end = toDate(range.end) ?? new Date();
  if (start.getTime() > end.getTime()) {
    return { start: end, end: start };
  }
  return { start, end };
}

export function bucketSnapshotsByWindow(
  snapshots: Array<HoldingSnapshot>,
  windowDays: WindowPreset | number,
  anchor: Date = new Date(),
): Array<HoldingSnapshot> {
  const range = getDateRangeForWindow(windowDays, anchor);
  return bucketSnapshotsByRange(snapshots, range);
}

export function bucketSnapshotsByRange(
  snapshots: Array<HoldingSnapshot>,
  range: DateRange,
): Array<HoldingSnapshot> {
  const { start, end } = normalizeRange(range);
  return snapshots.filter((snapshot) => {
    const date = toDate(snapshot.snapshotDate);
    if (!date) return false;
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
  });
}

export function computePortfolioAnalytics(
  input: PortfolioAnalyticsInput,
): PortfolioAnalyticsResult {
  const {
    snapshots,
    transactions,
    range,
    riskFreeRate = DEFAULT_RISK_FREE_RATE,
  } = input;

  const derivedRange = range ?? deriveRangeFromSnapshots(snapshots);
  const sanitizedRange = derivedRange ? normalizeRange(derivedRange) : undefined;

  const cacheKey = createCacheKey(snapshots, transactions, sanitizedRange, riskFreeRate);
  const cached = analyticsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const series = buildValueSeries(snapshots, sanitizedRange);

  if (!series.length) {
    const empty: PortfolioAnalyticsResult = {
      absoluteReturn: 0,
      relativeReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      timeSeries: [],
    };
    analyticsCache.set(cacheKey, empty);
    return empty;
  }

  const filteredTransactions = filterTransactionsByRange(
    transactions,
    sanitizedRange,
  );

  const startValue = series[0]?.value ?? 0;
  const endValue = series.at(-1)?.value ?? 0;
  const netFlows = filteredTransactions.reduce(
    (sum, transaction) => sum + getSignedTransactionNotional(transaction),
    0,
  );
  const absoluteReturn = endValue - (startValue + netFlows);
  const relativeReturn = startValue === 0 ? 0 : absoluteReturn / startValue;

  const dailyReturns = computeDailyReturns(series);
  const volatility = dailyReturns.length ? standardDeviation(dailyReturns) : 0;
  const averageReturn = dailyReturns.length
    ? dailyReturns.reduce((sum, value) => sum + value, 0) / dailyReturns.length
    : 0;
  const dailyRiskFree = riskFreeRate / TRADING_DAYS_PER_YEAR;
  const sharpeRatio = volatility === 0 ? 0 : (averageReturn - dailyRiskFree) / volatility;

  const timeSeries = normalizeSeries(series);

  const result: PortfolioAnalyticsResult = {
    absoluteReturn,
    relativeReturn,
    volatility,
    sharpeRatio,
    timeSeries,
  };

  analyticsCache.set(cacheKey, result);
  return result;
}

export function getSnapshotValue(snapshot: HoldingSnapshot): number {
  if (typeof snapshot.value === 'number') return snapshot.value;
  const quantity = typeof snapshot.quantity === 'number' ? snapshot.quantity : 0;
  const price = typeof snapshot.price === 'number' ? snapshot.price : 0;
  return quantity * price;
}

export function getTransactionNotional(transaction: PortfolioTransaction): number {
  if (typeof transaction.notional === 'number') return transaction.notional;
  const quantity = typeof transaction.quantity === 'number' ? transaction.quantity : 0;
  const price = typeof transaction.price === 'number' ? transaction.price : 0;
  return quantity * price;
}

export function getLatestValueFromSnapshots(
  snapshots: Array<HoldingSnapshot>,
): number {
  if (!snapshots.length) return 0;

  let latestSnapshot: HoldingSnapshot | undefined;
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  snapshots.forEach((snapshot) => {
    const date = toDate(snapshot.snapshotDate);
    if (!date) return;
    const timestamp = date.getTime();
    if (timestamp >= latestTimestamp) {
      latestSnapshot = snapshot;
      latestTimestamp = timestamp;
    }
  });

  return latestSnapshot ? getSnapshotValue(latestSnapshot) : 0;
}

function deriveRangeFromSnapshots(
  snapshots: Array<HoldingSnapshot>,
): DateRange | undefined {
  if (!snapshots.length) {
    return undefined;
  }

  const ordered = [...snapshots].sort((a, b) => {
    const first = toDate(a.snapshotDate)?.getTime() ?? 0;
    const second = toDate(b.snapshotDate)?.getTime() ?? 0;
    return first - second;
  });

  const start = toDate(ordered[0]?.snapshotDate);
  const end = toDate(ordered.at(-1)?.snapshotDate);

  if (!start || !end) {
    return undefined;
  }

  return { start, end };
}

function filterTransactionsByRange(
  transactions: Array<PortfolioTransaction>,
  range?: DateRange,
): Array<PortfolioTransaction> {
  if (!range) return transactions;
  return transactions.filter((transaction) => {
    const date = toDate(transaction.transactedAt);
    if (!date) return false;
    return date.getTime() >= range.start.getTime() && date.getTime() <= range.end.getTime();
  });
}

function buildValueSeries(
  snapshots: Array<HoldingSnapshot>,
  range?: DateRange,
): Array<{ date: string; value: number }> {
  if (!snapshots.length) return [];

  const byDate = new Map<string, number>();

  const filtered = range ? bucketSnapshotsByRange(snapshots, range) : snapshots;

  filtered.forEach((snapshot) => {
    const date = toDate(snapshot.snapshotDate);
    if (!date) return;
    const iso = startOfDay(date).toISOString();
    const currentValue = byDate.get(iso) ?? 0;
    byDate.set(iso, currentValue + getSnapshotValue(snapshot));
  });

  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));
}

function normalizeSeries(
  series: Array<{ date: string; value: number }>,
): Array<TimeSeriesPoint> {
  if (!series.length) return [];
  const baseline = series[0]?.value ?? 0;
  return series.map(({ date, value }) => ({
    date,
    value,
    normalizedValue: baseline === 0 ? 0 : value / baseline - 1,
  }));
}

function computeDailyReturns(series: Array<{ value: number }>): Array<number> {
  const returns: Array<number> = [];
  for (let index = 1; index < series.length; index += 1) {
    const previous = series[index - 1]?.value ?? 0;
    const current = series[index]?.value ?? 0;
    if (previous === 0) continue;
    returns.push((current - previous) / previous);
  }
  return returns;
}

function standardDeviation(values: Array<number>): number {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function getSignedTransactionNotional(
  transaction: PortfolioTransaction,
): number {
  const notional = getTransactionNotional(transaction);
  const side = transaction.side?.toLowerCase();
  if (!side) return notional;

  if (['sell', 'withdraw', 'withdrawal'].includes(side)) {
    return -notional;
  }

  return notional;
}

function createCacheKey(
  snapshots: Array<HoldingSnapshot>,
  transactions: Array<PortfolioTransaction>,
  range: DateRange | undefined,
  riskFreeRate: number,
): string {
  const snapshotKey = snapshots
    .map((snapshot) => {
      const date = toDate(snapshot.snapshotDate)?.toISOString() ?? '';
      return [snapshot.accountId, snapshot.assetId, date, getSnapshotValue(snapshot)].join('|');
    })
    .join(';');

  const transactionKey = transactions
    .map((transaction) => {
      const date = toDate(transaction.transactedAt)?.toISOString() ?? '';
      return [transaction.accountId, transaction.assetId, date, getSignedTransactionNotional(transaction)].join('|');
    })
    .join(';');

  const rangeKey = range
    ? `${range.start.toISOString()}::${range.end.toISOString()}`
    : 'all';

  return `${snapshotKey}__${transactionKey}__${rangeKey}__${riskFreeRate}`;
}

function toDate(value: Date | string | number | undefined | null): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

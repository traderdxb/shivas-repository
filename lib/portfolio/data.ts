import { addDays, differenceInCalendarDays, formatISO, parseISO } from 'date-fns';

import { DEFAULT_FILTERS } from './config';
import { normalizeFilters } from './filters';
import type {
  AssetType,
  PerformancePoint,
  PortfolioFilters,
  PortfolioHolding,
  PortfolioOverviewResponse,
  SummaryMetric,
} from './types';

const HOLDINGS_SEED: Array<{
  symbol: string;
  name: string;
  assetType: AssetType;
  account: string;
  value: number;
  dayChangePct: number;
  ytdReturnPct: number;
}> = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'equities',
    account: 'Global Growth SMA',
    value: 1325000,
    dayChangePct: 1.12,
    ytdReturnPct: 24.3,
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    assetType: 'equities',
    account: 'Global Growth SMA',
    value: 1180000,
    dayChangePct: 1.42,
    ytdReturnPct: 37.5,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    assetType: 'equities',
    account: 'Retirement 401k',
    value: 945000,
    dayChangePct: 0.85,
    ytdReturnPct: 17.8,
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    assetType: 'equities',
    account: 'Income Shield Trust',
    value: 812000,
    dayChangePct: 1.04,
    ytdReturnPct: 19.2,
  },
  {
    symbol: 'SPYG',
    name: 'SPDR Growth ETF',
    assetType: 'etf',
    account: 'Income Shield Trust',
    value: 687000,
    dayChangePct: 0.68,
    ytdReturnPct: 12.1,
  },
  {
    symbol: 'SCHD',
    name: 'Schwab Dividend ETF',
    assetType: 'etf',
    account: 'Retirement 401k',
    value: 534000,
    dayChangePct: 0.44,
    ytdReturnPct: 8.4,
  },
  {
    symbol: 'VXUS',
    name: 'Vanguard Intl ETF',
    assetType: 'etf',
    account: 'Global Growth SMA',
    value: 402000,
    dayChangePct: 0.39,
    ytdReturnPct: 6.9,
  },
  {
    symbol: 'CASH',
    name: 'USD Cash Sweep',
    assetType: 'cash',
    account: 'Cash Reserve',
    value: 385000,
    dayChangePct: 0.02,
    ytdReturnPct: 1.2,
  },
  {
    symbol: 'HYSA',
    name: 'High-Yield Savings',
    assetType: 'savings',
    account: 'Cash Reserve',
    value: 342000,
    dayChangePct: 0.01,
    ytdReturnPct: 3.4,
  },
  {
    symbol: '529G',
    name: 'College 529 Growth',
    assetType: 'etf',
    account: 'College 529',
    value: 295000,
    dayChangePct: 0.76,
    ytdReturnPct: 10.6,
  },
  {
    symbol: 'UST2Y',
    name: 'US Treasuries 2Y',
    assetType: 'savings',
    account: 'Income Shield Trust',
    value: 221000,
    dayChangePct: 0.03,
    ytdReturnPct: 4.1,
  },
  {
    symbol: 'SGOV',
    name: 'Short Treasury ETF',
    assetType: 'cash',
    account: 'Global Growth SMA',
    value: 176000,
    dayChangePct: 0.05,
    ytdReturnPct: 2.6,
  },
];

const RANGE_TO_DAYS: Record<Exclude<PortfolioFilters['range'], 'custom'>, number> = {
  '90': 90,
  '180': 180,
  '365': 365,
};

function resolveDateWindow(filters: PortfolioFilters) {
  if (filters.range === 'custom' && filters.startDate && filters.endDate) {
    let start = parseISO(filters.startDate);
    let end = parseISO(filters.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return resolveDateWindow({ ...filters, range: DEFAULT_FILTERS.range, startDate: undefined, endDate: undefined });
    }

    if (start > end) {
      [start, end] = [end, start];
    }

    const days = Math.max(1, differenceInCalendarDays(end, start) + 1);

    return {
      start,
      end,
      days,
    };
  }

  const end = new Date();
  const preset = RANGE_TO_DAYS[filters.range as Exclude<PortfolioFilters['range'], 'custom'>] ?? 90;
  const days = Math.max(1, preset);
  const start = addDays(end, -(days - 1));

  return { start, end, days };
}

function buildHoldings(seeds: Array<(typeof HOLDINGS_SEED)[number]>): Array<PortfolioHolding> {
  const total = seeds.reduce((sum, seed) => sum + seed.value, 0);
  if (!total) return [];

  return seeds.map((seed) => ({
    ...seed,
    allocation: Number(((seed.value / total) * 100).toFixed(2)),
  }));
}

function buildSummaryMetrics(
  holdings: Array<PortfolioHolding>,
  days: number,
): Array<SummaryMetric> {
  const totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0);
  const dayMoveValue = holdings.reduce(
    (sum, holding) => sum + holding.value * (holding.dayChangePct / 100),
    0,
  );

  const riskAnchoring = holdings.reduce((sum, holding) => {
    if (holding.assetType === 'equities') return sum + holding.value * 1.1;
    if (holding.assetType === 'etf') return sum + holding.value * 0.8;
    if (holding.assetType === 'cash') return sum + holding.value * 0.2;
    return sum + holding.value * 0.4;
  }, 0);

  const flows = totalValue * 0.0025 * (days / 30);
  const liquidityBase = holdings
    .filter((holding) => holding.assetType === 'cash' || holding.assetType === 'savings')
    .reduce((sum, holding) => sum + holding.value, 0);

  const safeTotal = Math.max(totalValue, 1);
  const liquidityPct = (liquidityBase / safeTotal) * 100;

  return [
    {
      id: 'aum',
      label: 'Total managed assets',
      value: totalValue,
      unit: 'currency',
      delta: (dayMoveValue / safeTotal) * 100,
      deltaLabel: 'vs. prior close',
    },
    {
      id: 'move',
      label: 'Daily move',
      value: dayMoveValue,
      unit: 'currency',
      delta: (dayMoveValue / safeTotal) * 100,
      deltaLabel: '1-day change',
    },
    {
      id: 'flows',
      label: `${days} day net flows`,
      value: flows,
      unit: 'currency',
      delta: (flows / safeTotal) * 100,
      deltaLabel: 'vs. allocation target',
    },
    {
      id: 'liquidity',
      label: 'Liquidity coverage',
      value: liquidityPct,
      unit: 'percent',
      delta: liquidityPct - 8,
      deltaLabel: 'cash + savings',
    },
    {
      id: 'risk',
      label: 'Risk-weighted value',
      value: riskAnchoring,
      unit: 'currency',
      delta: (riskAnchoring / safeTotal - 1) * 100,
      deltaLabel: 'weighted exposure',
    },
  ];
}

function buildPerformanceSeries(
  holdings: Array<PortfolioHolding>,
  start: Date,
  days: number,
): Array<PerformancePoint> {
  const equityTilt = holdings.reduce((sum, holding) => {
    if (holding.assetType === 'equities') return sum + holding.allocation;
    if (holding.assetType === 'etf') return sum + holding.allocation * 0.7;
    return sum + holding.allocation * 0.2;
  }, 0);

  const volatility = 0.35 + equityTilt / 200;
  const samplePoints = Math.min(days, 160);
  const step = Math.max(1, Math.floor(days / samplePoints));
  const data: Array<PerformancePoint> = [];

  let portfolio = 100;
  let benchmark = 98;

  for (let i = 0; i < samplePoints; i += 1) {
    const seasonal = Math.sin((i / samplePoints) * Math.PI * 2) * volatility;
    const drift = (Math.random() - 0.5) * volatility * 0.4;

    portfolio = Math.max(92, portfolio + seasonal * 0.6 + drift);
    benchmark = Math.max(92, benchmark + seasonal * 0.45 + (Math.random() - 0.5) * 0.2);

    data.push({
      date: formatISO(addDays(start, i * step), { representation: 'date' }),
      portfolio: Number(portfolio.toFixed(2)),
      benchmark: Number(benchmark.toFixed(2)),
    });
  }

  if (!data.length) {
    data.push({
      date: formatISO(start, { representation: 'date' }),
      portfolio: 100,
      benchmark: 98,
    });
  }

  return data;
}

export function getPortfolioOverview(
  input: Partial<PortfolioFilters> = {},
): PortfolioOverviewResponse {
  const filters = normalizeFilters(input);
  const { start, end, days } = resolveDateWindow(filters);

  const filteredSeeds = HOLDINGS_SEED.filter(
    (seed) =>
      filters.assetTypes.includes(seed.assetType) &&
      filters.accounts.includes(seed.account),
  );

  const holdings = buildHoldings(filteredSeeds);

  const summary = holdings.length
    ? buildSummaryMetrics(holdings, days)
    : buildSummaryMetrics(
        [
          {
            symbol: '—',
            name: 'No holdings',
            assetType: 'cash',
            account: filters.accounts[0] ?? DEFAULT_FILTERS.accounts[0],
            value: 0,
            dayChangePct: 0,
            ytdReturnPct: 0,
            allocation: 0,
          },
        ],
        days,
      );

  const rankingsSource = holdings.length ? holdings : [];
  const leaders = [...rankingsSource]
    .sort((a, b) => b.ytdReturnPct - a.ytdReturnPct)
    .slice(0, 4);
  const laggards = [...rankingsSource]
    .sort((a, b) => a.ytdReturnPct - b.ytdReturnPct)
    .slice(0, 4);

  const performance = buildPerformanceSeries(
    holdings.length ? holdings : buildHoldings(HOLDINGS_SEED),
    start,
    days,
  );

  return {
    updatedAt: new Date().toISOString(),
    filters: {
      ...filters,
      rangeStart: formatISO(start, { representation: 'date' }),
      rangeEnd: formatISO(end, { representation: 'date' }),
    },
    summary,
    performance,
    holdings,
    rankings: {
      leaders,
      laggards,
    },
  };
}

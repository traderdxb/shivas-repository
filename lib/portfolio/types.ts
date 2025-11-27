export type AssetType = 'equities' | 'etf' | 'cash' | 'savings';

export interface PortfolioFilters {
  assetTypes: Array<AssetType>;
  accounts: Array<string>;
  range: '90' | '180' | '365' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface SummaryMetric {
  id: string;
  label: string;
  value: number;
  unit: 'currency' | 'percent' | 'number';
  delta: number;
  deltaLabel: string;
}

export interface PerformancePoint {
  date: string;
  portfolio: number;
  benchmark: number;
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  assetType: AssetType;
  account: string;
  value: number;
  allocation: number;
  dayChangePct: number;
  ytdReturnPct: number;
}

export interface Rankings {
  leaders: Array<PortfolioHolding>;
  laggards: Array<PortfolioHolding>;
}

export interface PortfolioOverviewResponse {
  updatedAt: string;
  filters: PortfolioFilters & {
    rangeStart: string;
    rangeEnd: string;
  };
  summary: Array<SummaryMetric>;
  performance: Array<PerformancePoint>;
  holdings: Array<PortfolioHolding>;
  rankings: Rankings;
}

export type ExportFormat = 'pdf' | 'csv';

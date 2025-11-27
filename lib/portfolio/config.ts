import type { AssetType, PortfolioFilters } from './types';

export const ASSET_TYPES: Array<{
  value: AssetType;
  label: string;
  accent: string;
}> = [
  { value: 'equities', label: 'Equities', accent: 'from-amber-500 to-orange-500' },
  { value: 'etf', label: 'ETFs', accent: 'from-blue-500 to-sky-500' },
  { value: 'cash', label: 'Cash', accent: 'from-emerald-400 to-green-500' },
  { value: 'savings', label: 'Savings', accent: 'from-purple-500 to-indigo-500' },
];

export const ACCOUNT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Global Growth SMA', label: 'Global Growth SMA' },
  { value: 'Income Shield Trust', label: 'Income Shield Trust' },
  { value: 'Retirement 401k', label: 'Retirement 401k' },
  { value: 'College 529', label: 'College 529' },
  { value: 'Cash Reserve', label: 'Cash Reserve' },
];

export const RANGE_OPTIONS: Array<{ value: PortfolioFilters['range']; label: string }> = [
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '365 days' },
  { value: 'custom', label: 'Custom range' },
];

export const DEFAULT_FILTERS: PortfolioFilters = {
  assetTypes: ASSET_TYPES.map((type) => type.value),
  accounts: ACCOUNT_OPTIONS.map((account) => account.value),
  range: '90',
};

export const ASSET_TYPE_VALUES = new Set<AssetType>(
  ASSET_TYPES.map((type) => type.value),
);

export const ACCOUNT_VALUE_SET = new Set<string>(
  ACCOUNT_OPTIONS.map((account) => account.value),
);

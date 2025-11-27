import type { ReadonlyURLSearchParams } from 'next/navigation';

import {
  ACCOUNT_OPTIONS,
  ACCOUNT_VALUE_SET,
  ASSET_TYPE_VALUES,
  DEFAULT_FILTERS,
} from './config';
import type { AssetType, PortfolioFilters } from './types';

const RANGE_VALUES = new Set<PortfolioFilters['range']>(['90', '180', '365', 'custom']);

type ParamLike = URLSearchParams | ReadonlyURLSearchParams;

function parseListParam(value: string | null) {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function sanitizeAssetTypes(values?: Array<string>): Array<AssetType> {
  const usableEntries = values?.length ? values : DEFAULT_FILTERS.assetTypes;
  const sanitized = Array.from(
    new Set(
      usableEntries.filter((entry): entry is AssetType =>
        ASSET_TYPE_VALUES.has(entry as AssetType),
      ),
    ),
  );

  return sanitized.length ? sanitized : [...DEFAULT_FILTERS.assetTypes];
}

function sanitizeAccounts(values?: Array<string>): Array<string> {
  const usableEntries = values?.length ? values : DEFAULT_FILTERS.accounts;
  const sanitized = Array.from(
    new Set(usableEntries.filter((entry) => ACCOUNT_VALUE_SET.has(entry))),
  );

  if (sanitized.length) {
    return sanitized;
  }

  return ACCOUNT_OPTIONS.map((option) => option.value);
}

export function normalizeFilters(
  partial: Partial<PortfolioFilters> = {},
): PortfolioFilters {
  const assetTypes = sanitizeAssetTypes(partial.assetTypes);
  const accounts = sanitizeAccounts(partial.accounts);

  let range: PortfolioFilters['range'] = partial.range ?? DEFAULT_FILTERS.range;
  if (!RANGE_VALUES.has(range)) {
    range = DEFAULT_FILTERS.range;
  }

  let startDate = partial.startDate;
  let endDate = partial.endDate;

  if (range !== 'custom') {
    startDate = undefined;
    endDate = undefined;
  } else if (!startDate || !endDate) {
    range = DEFAULT_FILTERS.range;
    startDate = undefined;
    endDate = undefined;
  }

  return {
    assetTypes,
    accounts,
    range,
    startDate,
    endDate,
  };
}

export function parseFiltersFromSearchParams(
  params: ParamLike,
): PortfolioFilters {
  const assetTypes = parseListParam(params.get('assetTypes')) as Array<AssetType>;
  const accounts = parseListParam(params.get('accounts'));
  const rangeParam = params.get('range');
  const startDate = params.get('startDate') || undefined;
  const endDate = params.get('endDate') || undefined;

  const rangeCandidate = RANGE_VALUES.has(rangeParam as PortfolioFilters['range'])
    ? (rangeParam as PortfolioFilters['range'])
    : undefined;

  return normalizeFilters({
    assetTypes,
    accounts,
    range: rangeCandidate,
    startDate,
    endDate,
  });
}

export function serializeFilters(filters: PortfolioFilters): URLSearchParams {
  const normalized = normalizeFilters(filters);
  const params = new URLSearchParams();

  if (normalized.assetTypes.length) {
    params.set('assetTypes', normalized.assetTypes.join(','));
  }

  if (normalized.accounts.length) {
    params.set('accounts', normalized.accounts.join(','));
  }

  params.set('range', normalized.range);

  if (normalized.range === 'custom' && normalized.startDate && normalized.endDate) {
    params.set('startDate', normalized.startDate);
    params.set('endDate', normalized.endDate);
  }

  return params;
}

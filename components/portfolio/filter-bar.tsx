'use client';

import { useMemo } from 'react';
import { formatDistanceToNow, subDays, formatISO } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ASSET_TYPES, ACCOUNT_OPTIONS, RANGE_OPTIONS, DEFAULT_FILTERS } from '@/lib/portfolio/config';
import type { ExportFormat, PortfolioFilters } from '@/lib/portfolio/types';
import { cn } from '@/lib/utils';

import { ExportMenu } from './export-menu';

interface FilterBarProps {
  filters: PortfolioFilters;
  onFiltersChange: (filters: PortfolioFilters) => void;
  lastUpdated?: string;
  isRefreshing?: boolean;
  isExporting?: boolean;
  onExport: (format: ExportFormat) => void | Promise<void>;
}

export function FilterBar({
  filters,
  onFiltersChange,
  lastUpdated,
  isRefreshing,
  isExporting,
  onExport,
}: FilterBarProps) {
  const selectedAccountLabels = useMemo(() => {
    const active = new Set(filters.accounts);
    return ACCOUNT_OPTIONS.filter((option) => active.has(option.value)).map(
      (option) => option.label,
    );
  }, [filters.accounts]);

  const handleAssetToggle = (value: (typeof ASSET_TYPES)[number]['value']) => {
    const exists = filters.assetTypes.includes(value);
    if (exists && filters.assetTypes.length === 1) return;

    const assetTypes = exists
      ? filters.assetTypes.filter((item) => item !== value)
      : [...filters.assetTypes, value];

    onFiltersChange({ ...filters, assetTypes });
  };

  const handleAccountToggle = (value: string, checked: boolean) => {
    const accounts = checked
      ? Array.from(new Set([...filters.accounts, value]))
      : filters.accounts.filter((item) => item !== value);

    onFiltersChange({
      ...filters,
      accounts: accounts.length ? accounts : filters.accounts,
    });
  };

  const handleRangeChange = (value: PortfolioFilters['range']) => {
    if (value === 'custom') {
      const fallbackEnd = filters.endDate ?? formatISO(new Date(), { representation: 'date' });
      const fallbackStart =
        filters.startDate ?? formatISO(subDays(new Date(fallbackEnd), 29), { representation: 'date' });
      onFiltersChange({ ...filters, range: 'custom', startDate: fallbackStart, endDate: fallbackEnd });
      return;
    }

    onFiltersChange({ ...filters, range: value, startDate: undefined, endDate: undefined });
  };

  const handleDateChange = (key: 'startDate' | 'endDate', value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onFiltersChange({
      assetTypes: [...DEFAULT_FILTERS.assetTypes],
      accounts: [...DEFAULT_FILTERS.accounts],
      range: DEFAULT_FILTERS.range,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const updatedLabel = lastUpdated
    ? `${formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}`
    : 'Awaiting data';

  return (
    <div className="rounded-3xl border bg-background/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-sm font-semibold">Portfolio filters</p>
          <p className="text-xs text-muted-foreground">Synced to WealthMatters workspace</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {isRefreshing ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Refreshing
            </span>
          ) : (
            <span>Updated {updatedLabel}</span>
          )}
          <Button variant="ghost" size="sm" className="text-xs" onClick={handleReset}>
            Reset
          </Button>
          <ExportMenu
            disabled={!lastUpdated}
            isExporting={isExporting}
            onExport={onExport}
          />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {ASSET_TYPES.map((asset) => (
            <Button
              key={asset.value}
              variant={filters.assetTypes.includes(asset.value) ? 'default' : 'outline'}
              size="sm"
              className={cn('rounded-full', filters.assetTypes.includes(asset.value) && 'bg-foreground text-background')}
              onClick={() => handleAssetToggle(asset.value)}
            >
              {asset.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                Accounts ({filters.accounts.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>Select accounts</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ACCOUNT_OPTIONS.map((account) => (
                <DropdownMenuCheckboxItem
                  key={account.value}
                  checked={filters.accounts.includes(account.value)}
                  onCheckedChange={(checked) =>
                    handleAccountToggle(account.value, Boolean(checked))
                  }
                >
                  {account.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1">
            <Select value={filters.range} onValueChange={(value) => handleRangeChange(value as PortfolioFilters['range'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filters.range === 'custom' && (
            <div className="flex flex-1 flex-wrap gap-2 md:flex-row">
              <Input
                type="date"
                value={filters.startDate ?? ''}
                onChange={(event) => handleDateChange('startDate', event.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                value={filters.endDate ?? ''}
                onChange={(event) => handleDateChange('endDate', event.target.value)}
                className="flex-1"
              />
            </div>
          )}
        </div>

        {selectedAccountLabels.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Showing {selectedAccountLabels.length} accounts: {selectedAccountLabels.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

export default FilterBar;

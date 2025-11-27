'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetcher } from '@/lib/utils';
import {
  parseFiltersFromSearchParams,
  serializeFilters,
} from '@/lib/portfolio/filters';
import type {
  ExportFormat,
  PortfolioFilters,
  PortfolioOverviewResponse,
} from '@/lib/portfolio/types';

import { FilterBar } from './filter-bar';
import { HeatmapGrid } from './heatmap-grid';
import { PerformanceChart } from './performance-chart';
import { RankingsTable } from './rankings-table';
import { SummaryCards } from './summary-cards';

export function PortfolioDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<PortfolioFilters>(() =>
    parseFiltersFromSearchParams(searchParams),
  );
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  useEffect(() => {
    setFilters(parseFiltersFromSearchParams(searchParams));
  }, [searchParams]);

  const swrKey = useMemo(() => {
    const params = serializeFilters(filters).toString();
    return `/api/portfolio/overview${params ? `?${params}` : ''}`;
  }, [filters]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<PortfolioOverviewResponse>(
    swrKey,
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
    },
  );

  const handleFiltersChange = useCallback(
    (next: PortfolioFilters) => {
      setFilters(next);
      const params = serializeFilters(next).toString();
      router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      try {
        setExportingFormat(format);
        const response = await fetch('/api/portfolio/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ format, filters }),
        });

        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const extension = format === 'pdf' ? 'pdf' : 'csv';
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `wealthmatters-${filters.range}-${Date.now()}.${extension}`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
        toast.success(`Export ready`, {
          description: `Downloaded ${extension.toUpperCase()} file for the current filters.`,
        });
      } catch (exportError) {
        toast.error('Export failed', {
          description: 'Please try again or adjust your filters.',
        });
      } finally {
        setExportingFormat(null);
      }
    },
    [filters],
  );

  const isBusy = isLoading || isValidating;
  const rangeLabel = data
    ? `${data.filters.rangeStart} → ${data.filters.rangeEnd}`
    : 'Awaiting range';

  return (
    <div className="space-y-6">
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        lastUpdated={data?.updatedAt}
        isRefreshing={isValidating}
        isExporting={!!exportingFormat}
        onExport={handleExport}
      />

      {error ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Unable to load dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              We couldn&apos;t reach the analytics service. Refresh the page or try again in a moment.
            </p>
            <Button onClick={() => mutate()} size="sm">
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <SummaryCards metrics={data?.summary} isLoading={isBusy} />

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <PerformanceChart data={data?.performance} rangeLabel={rangeLabel} isLoading={isBusy} />
            </div>
            <div>
              <HeatmapGrid holdings={data?.holdings} isLoading={isBusy} />
            </div>
          </div>

          <RankingsTable rankings={data?.rankings} isLoading={isBusy} />
        </>
      )}
    </div>
  );
}

export default PortfolioDashboard;

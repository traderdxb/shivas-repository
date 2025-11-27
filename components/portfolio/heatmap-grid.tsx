'use client';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ASSET_TYPES } from '@/lib/portfolio/config';
import type { PortfolioHolding } from '@/lib/portfolio/types';
import { cn } from '@/lib/utils';

interface HeatmapGridProps {
  holdings?: Array<PortfolioHolding>;
  isLoading?: boolean;
}

export function HeatmapGrid({ holdings, isLoading }: HeatmapGridProps) {
  const groups = useMemo(() => {
    if (!holdings?.length) return [];

    const map = new Map<string, Array<PortfolioHolding>>();
    holdings.forEach((holding) => {
      const current = map.get(holding.assetType) ?? [];
      current.push(holding);
      map.set(holding.assetType, current);
    });

    return ASSET_TYPES.map((asset) => ({
      ...asset,
      items: (map.get(asset.value) ?? []).sort((a, b) => b.allocation - a.allocation),
    })).filter((group) => group.items.length);
  }, [holdings]);

  if (!groups.length) {
    if (isLoading) {
      return (
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Holdings heatmap</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No holdings match the current filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Holdings heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">
          Allocation by asset type and 1-day move
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map((group) => (
          <section key={group.value} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{group.label}</p>
                <p className="text-xs text-muted-foreground">
                  {group.items.length} positions
                </p>
              </div>
              <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-medium text-white', 'bg-gradient-to-br', group.accent)}>
                Active
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((holding) => (
                <div
                  key={`${holding.symbol}-${holding.account}`}
                  className={cn(
                    'rounded-2xl border p-4 text-white shadow-sm transition hover:shadow-md',
                    holding.dayChangePct >= 0
                      ? 'bg-gradient-to-br from-emerald-500/80 to-emerald-600/80'
                      : 'bg-gradient-to-br from-rose-500/80 to-rose-600/80',
                  )}
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                    <span>{holding.symbol}</span>
                    <span>{holding.dayChangePct.toFixed(1)}%</span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold">
                    {holding.allocation.toFixed(1)}%
                  </p>
                  <p className="text-xs opacity-80">{holding.account}</p>
                  <p className="mt-1 text-xs opacity-70">
                    {holding.name} · {holding.ytdReturnPct.toFixed(1)}% YTD
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

export default HeatmapGrid;

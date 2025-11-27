'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PortfolioHolding, Rankings } from '@/lib/portfolio/types';
import { cn } from '@/lib/utils';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

interface RankingsTableProps {
  rankings?: Rankings;
  isLoading?: boolean;
}

function RankingsColumn({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: 'positive' | 'negative';
  rows: Array<PortfolioHolding>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{title}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              tone === 'positive' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
            )}
          >
            {rows.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={`${row.symbol}-${row.account}`}
              className="rounded-lg border p-3 text-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{row.symbol}</p>
                  <p className="text-xs text-muted-foreground">{row.name}</p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'font-semibold',
                      row.ytdReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-600',
                    )}
                  >
                    {row.ytdReturnPct >= 0 ? '+' : ''}
                    {row.ytdReturnPct.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currencyFormatter.format(row.value)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{row.account}</span>
                <span>{row.allocation.toFixed(1)}% of book</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No data available.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function RankingsTable({ rankings, isLoading }: RankingsTableProps) {
  if (!rankings && isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-60 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <RankingsColumn title="Leaders" tone="positive" rows={rankings?.leaders ?? []} />
      <RankingsColumn title="Laggards" tone="negative" rows={rankings?.laggards ?? []} />
    </div>
  );
}

export default RankingsTable;

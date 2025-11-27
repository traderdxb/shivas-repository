'use client';

import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, MinusIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SummaryMetric } from '@/lib/portfolio/types';
import { cn } from '@/lib/utils';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('en-US');

const deltaIconByDirection = {
  positive: ArrowUpRight,
  negative: ArrowDownRight,
  neutral: MinusIcon,
};

type DeltaDirection = keyof typeof deltaIconByDirection;

function formatMetricValue(metric: SummaryMetric) {
  if (metric.unit === 'currency') {
    return currencyFormatter.format(metric.value);
  }

  if (metric.unit === 'percent') {
    return `${percentFormatter.format(metric.value)}%`;
  }

  return numberFormatter.format(metric.value);
}

interface SummaryCardsProps {
  metrics?: Array<SummaryMetric>;
  isLoading?: boolean;
}

const FALLBACK_ITEMS = Array.from({ length: 5 }).map((_, index) => index);

export function SummaryCards({ metrics, isLoading }: SummaryCardsProps) {
  const items = useMemo(() => metrics ?? [], [metrics]);

  if (!items.length) {
    if (isLoading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {FALLBACK_ITEMS.map((item) => (
            <Card key={item} className="border-dashed">
              <CardHeader>
                <Skeleton className="h-3 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">No summary data</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Adjust the filters to surface portfolio metrics.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {items.map((metric) => {
        const deltaDirection: DeltaDirection = metric.delta > 0
          ? 'positive'
          : metric.delta < 0
            ? 'negative'
            : 'neutral';
        const DeltaIcon = deltaIconByDirection[deltaDirection];

        return (
          <Card key={metric.id} className="bg-background/80 shadow-sm">
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
              <span className="text-xs text-muted-foreground">{metric.deltaLabel}</span>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">
                {formatMetricValue(metric)}
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 font-medium',
                    deltaDirection === 'positive' && 'text-emerald-500',
                    deltaDirection === 'negative' && 'text-rose-500',
                    deltaDirection === 'neutral' && 'text-muted-foreground',
                  )}
                >
                  <DeltaIcon className="h-4 w-4" />
                  {metric.delta >= 0 ? '+' : ''}
                  {metric.delta.toFixed(2)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {metric.deltaLabel}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default SummaryCards;

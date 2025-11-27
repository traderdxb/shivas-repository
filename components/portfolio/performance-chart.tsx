'use client';

import { memo, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMediaQuery } from 'usehooks-ts';
import { format, parseISO } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PerformancePoint } from '@/lib/portfolio/types';

interface PerformanceChartProps {
  data?: Array<PerformancePoint>;
  rangeLabel?: string;
  isLoading?: boolean;
}

const ChartTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload?.length) {
    return null;
  }

  const [portfolio, benchmark] = payload;

  return (
    <div className="rounded-lg border bg-background/90 p-3 text-xs shadow-md">
      <p className="font-medium">{format(parseISO(label), 'MMM d, yyyy')}</p>
      <p className="mt-2 text-emerald-500">
        Portfolio: <span className="font-semibold">{portfolio.value.toFixed(2)}</span>
      </p>
      <p className="text-sky-500">
        Benchmark: <span className="font-semibold">{benchmark.value.toFixed(2)}</span>
      </p>
    </div>
  );
});
ChartTooltip.displayName = 'ChartTooltip';

export function PerformanceChart({ data, rangeLabel, isLoading }: PerformanceChartProps) {
  const hasData = !!data?.length;
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const chartHeight = isDesktop ? 320 : 220;

  const ticks = useMemo(() => {
    if (!data?.length) return [];
    const points = [data[0]?.date];
    if (data.length > 2) {
      const mid = data[Math.round(data.length / 2)]?.date;
      if (mid) points.push(mid);
    }
    points.push(data.at(-1)?.date ?? data[0]?.date);
    return points.filter(Boolean);
  }, [data]);

  if (!hasData && isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center">
        <div>
          <CardTitle>Performance</CardTitle>
          <p className="text-sm text-muted-foreground">
            {rangeLabel ?? 'Net asset shift'}
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {hasData ? (
          <div className="h-[220px] w-full md:h-[320px]">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <AreaChart data={data} margin={{ left: -8, right: 0, top: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  ticks={ticks as Array<string>}
                  tickFormatter={(tick) => format(parseISO(tick), 'MMM d')}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  orientation="right"
                  stroke="var(--muted-foreground)"
                  tickFormatter={(tick) => `${tick.toFixed(0)}`}
                  width={40}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="portfolio"
                  stroke="#22c55e"
                  fill="url(#portfolioGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="benchmark"
                  stroke="#38bdf8"
                  fill="url(#benchmarkGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No performance data for the selected filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PerformanceChart;

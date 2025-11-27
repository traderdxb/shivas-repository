/// <reference types="node" />
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { HoldingSnapshot, PortfolioTransaction } from '@/lib/db/schema';
import {
  bucketSnapshotsByRange,
  bucketSnapshotsByWindow,
  computePortfolioAnalytics,
  getDateRangeForWindow,
} from '@/lib/portfolio/analytics';

describe('portfolio analytics', () => {
  it('computes absolute and relative returns adjusted for contributions', () => {
    const snapshots = [
      createSnapshot('2024-01-01', 1_000),
      createSnapshot('2024-06-01', 1_500),
    ];

    const transactions = [createTransaction('2024-03-01', 200, 'buy')];

    const result = computePortfolioAnalytics({
      snapshots,
      transactions,
      riskFreeRate: 0.01,
    });

    assert.equal(result.absoluteReturn, 300);
    assert.equal(result.relativeReturn, 0.3);
    assert.equal(result.volatility, 0);
    assert.equal(result.sharpeRatio, 0);
    assert.equal(result.timeSeries.length, 2);
    assert.equal(result.timeSeries.at(-1)?.normalizedValue, 0.5);
  });

  it('calculates volatility and sharpe ratio from daily returns', () => {
    const snapshots = [
      createSnapshot('2024-01-01', 100),
      createSnapshot('2024-01-02', 110),
      createSnapshot('2024-01-03', 105),
      createSnapshot('2024-01-04', 120),
    ];

    const result = computePortfolioAnalytics({
      snapshots,
      transactions: [],
      riskFreeRate: 0.05,
    });

    const expectedReturns = [
      0.1,
      -0.045454545454545456,
      0.14285714285714285,
    ];
    const meanReturn =
      expectedReturns.reduce((sum, value) => sum + value, 0) /
      expectedReturns.length;
    const variance =
      expectedReturns.reduce((sum, value) => sum + (value - meanReturn) ** 2, 0) /
      expectedReturns.length;
    const expectedVolatility = Math.sqrt(variance);
    const expectedSharpe =
      expectedVolatility === 0
        ? 0
        : (meanReturn - 0.05 / 252) / expectedVolatility;

    assert.ok(Math.abs(result.volatility - expectedVolatility) < 1e-9);
    assert.ok(Math.abs(result.sharpeRatio - expectedSharpe) < 1e-9);
  });

  it('handles negative returns across mixed asset types', () => {
    const snapshots: Array<HoldingSnapshot> = [
      createSnapshot('2024-01-01', 500, { assetId: 'EQ', assetType: 'equity' }),
      createSnapshot('2024-01-01', 500, { assetId: 'ETF', assetType: 'etf' }),
      createSnapshot('2024-01-10', 400, { assetId: 'EQ', assetType: 'equity' }),
      createSnapshot('2024-01-10', 450, { assetId: 'ETF', assetType: 'etf' }),
    ];

    const result = computePortfolioAnalytics({
      snapshots,
      transactions: [],
    });

    assert.equal(result.absoluteReturn, -150);
    assert.equal(result.relativeReturn, -0.15);
    assert.equal(result.timeSeries.length, 2);
    assert.equal(result.timeSeries[1]?.normalizedValue, -0.15);
  });

  it('buckets snapshots by preset window and explicit range', () => {
    const snapshots = [
      createSnapshot('2024-01-01', 100),
      createSnapshot('2024-03-01', 200),
      createSnapshot('2024-07-01', 300),
    ];

    const ninetyDayWindow = bucketSnapshotsByWindow(
      snapshots,
      90,
      new Date('2024-07-01'),
    );
    assert.equal(ninetyDayWindow.length, 1);

    const customRange = bucketSnapshotsByRange(
      snapshots,
      getDateRangeForWindow(120, new Date('2024-04-01')),
    );
    assert.equal(customRange.length, 2);
  });
});

function createSnapshot(
  date: string,
  value: number,
  overrides: Partial<HoldingSnapshot> = {},
): HoldingSnapshot {
  return {
    id: overrides.id ?? randomUUID(),
    userId: overrides.userId ?? 'user-1',
    accountId: overrides.accountId ?? 'acct-1',
    assetId: overrides.assetId ?? 'asset-1',
    assetType: overrides.assetType ?? 'equity',
    quantity: overrides.quantity ?? value,
    price: overrides.price ?? 1,
    value,
    snapshotDate: overrides.snapshotDate ?? new Date(date),
    currency: overrides.currency ?? 'USD',
  } as HoldingSnapshot;
}

function createTransaction(
  date: string,
  amount: number,
  side: 'buy' | 'sell',
  overrides: Partial<PortfolioTransaction> = {},
): PortfolioTransaction {
  return {
    id: overrides.id ?? randomUUID(),
    userId: overrides.userId ?? 'user-1',
    accountId: overrides.accountId ?? 'acct-1',
    assetId: overrides.assetId ?? 'asset-1',
    assetType: overrides.assetType ?? 'equity',
    quantity: overrides.quantity ?? amount,
    price: overrides.price ?? 1,
    notional: amount,
    side: overrides.side ?? side,
    transactedAt: overrides.transactedAt ?? new Date(date),
  } as PortfolioTransaction;
}

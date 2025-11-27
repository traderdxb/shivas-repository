'use client';

import { useState } from 'react';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConnectionDashboardRow } from '@/lib/db/queries';
import { fetcher } from '@/lib/utils';
import { PlaidLinkButton } from './plaid-link-button';

interface ConnectionListProps {
  initialConnections: Array<ConnectionDashboardRow>;
}

function formatDate(value?: Date | string | null) {
  if (!value) return 'Never';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function ConnectionList({ initialConnections }: ConnectionListProps) {
  const { data, isLoading, mutate } = useSWR<{ connections: Array<ConnectionDashboardRow> }>(
    '/api/institutions/connections',
    fetcher,
    {
      fallbackData: { connections: initialConnections },
      revalidateOnFocus: false,
    },
  );

  const [inFlightAccountId, setInFlightAccountId] = useState<string | null>(null);
  const connections = data?.connections ?? [];

  async function refreshAccount(accountId: string) {
    setInFlightAccountId(accountId);
    try {
      const response = await fetch(`/api/accounts/${accountId}/refresh`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      await mutate();
    } catch (error) {
      console.error('Failed to refresh account', error);
    } finally {
      setInFlightAccountId(null);
    }
  }

  const linkButton = (
    <div className="flex justify-end">
      <PlaidLinkButton
        onLinked={async () => {
          await mutate();
        }}
      />
    </div>
  );

  if (isLoading && connections.length === 0) {
    return (
      <div className="space-y-4">
        {linkButton}
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Loading connections...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="space-y-4">
        {linkButton}
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No linked institutions yet. Launch the Plaid Link flow to get started.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {linkButton}
      {connections.map(({ connection, accounts, latestJob }) => (
        <Card key={connection.id}>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                {connection.institutionName ?? 'Unnamed Institution'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Status: <span className="font-medium capitalize">{connection.status}</span>
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Last sync: {formatDate(connection.lastSyncedAt)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border">
              {accounts.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No accounts available yet.
                </div>
              ) : (
                <ul className="divide-y">
                  {accounts.map((account) => (
                    <li key={account.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Balance: {account.currentBalance?.toLocaleString('en-US', { style: 'currency', currency: account.currency ?? 'USD' }) ?? 'N/A'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refreshAccount(account.id)}
                        disabled={inFlightAccountId === account.id}
                      >
                        {inFlightAccountId === account.id ? 'Refreshing…' : 'Refresh'}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {latestJob ? (
                <span>
                  Last job {latestJob.status} at {formatDate(latestJob.completedAt ?? latestJob.startedAt)}
                </span>
              ) : (
                <span>No sync jobs recorded yet.</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

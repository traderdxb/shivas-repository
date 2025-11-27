'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ManualAsset } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';

interface ManualAssetFormProps {
  initialAssets: Array<ManualAsset>;
}

export function ManualAssetForm({ initialAssets }: ManualAssetFormProps) {
  const { data, mutate } = useSWR<{ assets: Array<ManualAsset> }>(
    '/api/manual-assets',
    fetcher,
    {
      fallbackData: { assets: initialAssets },
      revalidateOnFocus: false,
    },
  );

  const assets = data?.assets ?? [];
  const [formState, setFormState] = useState({
    name: '',
    category: '',
    value: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { value: string; notes: string }>>(() => {
    const map: Record<string, { value: string; notes: string }> = {};
    initialAssets.forEach((asset) => {
      map[asset.id] = {
        value: asset.value?.toString() ?? '',
        notes: asset.notes ?? '',
      };
    });
    return map;
  });

  useEffect(() => {
    const map: Record<string, { value: string; notes: string }> = {};
    assets.forEach((asset) => {
      map[asset.id] = {
        value: asset.value?.toString() ?? '',
        notes: asset.notes ?? '',
      };
    });
    setDrafts(map);
  }, [assets]);

  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + (asset.value ?? 0), 0);
  }, [assets]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/manual-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formState.name,
          category: formState.category || 'Other',
          value: Number(formState.value || 0),
          notes: formState.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create manual asset');
      }

      setFormState({ name: '', category: '', value: '', notes: '' });
      await mutate();
    } catch (error) {
      console.error('Failed to create manual asset', error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: string) {
    const draft = drafts[id];
    if (!draft) return;

    setUpdatingId(id);
    try {
      const response = await fetch('/api/manual-assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          value: Number(draft.value || 0),
          notes: draft.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update manual asset');
      }

      await mutate();
    } catch (error) {
      console.error('Failed to update manual asset', error);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/manual-assets?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete manual asset');
      }
      await mutate();
    } catch (error) {
      console.error('Failed to delete manual asset', error);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Add manual asset</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Name</Label>
              <Input
                id="asset-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g. 401k rollover"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-category">Category</Label>
              <Input
                id="asset-category"
                value={formState.category}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder="Investments"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-value">Value</Label>
              <Input
                id="asset-value"
                type="number"
                min="0"
                step="0.01"
                value={formState.value}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, value: event.target.value }))
                }
                placeholder="10000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-notes">Notes</Label>
              <Textarea
                id="asset-notes"
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Optional details"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Add asset'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Manual holdings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total manually tracked value: {totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No manual assets yet.</p>
          ) : (
            <ul className="space-y-3">
              {assets.map((asset) => (
                <li key={asset.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.category}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Last updated {asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString() : 'never'}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Value</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={drafts[asset.id]?.value ?? ''}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [asset.id]: {
                              ...(prev[asset.id] ?? { value: '', notes: '' }),
                              value: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Notes</Label>
                      <Textarea
                        value={drafts[asset.id]?.notes ?? ''}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [asset.id]: {
                              ...(prev[asset.id] ?? { value: '', notes: '' }),
                              notes: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(asset.id)}
                      disabled={updatingId === asset.id}
                    >
                      {updatingId === asset.id ? 'Saving…' : 'Save changes'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(asset.id)}
                      disabled={updatingId === asset.id}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

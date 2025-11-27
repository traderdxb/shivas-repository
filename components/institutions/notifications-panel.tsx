'use client';

import { useState } from 'react';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Notification } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';

interface NotificationsPanelProps {
  initialNotifications: Array<Notification>;
}

function formatTimestamp(value?: Date | string | null) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function NotificationsPanel({ initialNotifications }: NotificationsPanelProps) {
  const { data, mutate } = useSWR<{ notifications: Array<Notification> }>(
    '/api/notifications',
    fetcher,
    {
      fallbackData: { notifications: initialNotifications },
      revalidateOnFocus: false,
    },
  );

  const notifications = data?.notifications ?? [];
  const unread = notifications.filter((notification) => !notification.readAt);
  const [marking, setMarking] = useState(false);

  async function markAllRead() {
    if (unread.length === 0) return;
    setMarking(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unread.map((notification) => notification.id) }),
      });
      if (!response.ok) {
        throw new Error('Failed to mark notifications');
      }
      await mutate();
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
    } finally {
      setMarking(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold">Notifications</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={markAllRead}
          disabled={marking || unread.length === 0}
        >
          {marking ? 'Marking…' : 'Mark all read'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`rounded-md border border-border p-4 ${notification.readAt ? 'opacity-70' : ''}`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.body}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(notification.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

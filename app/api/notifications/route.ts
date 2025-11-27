import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import {
  getNotificationsByUserId,
  markNotificationsRead,
} from '@/lib/db/queries';

async function getUserIdOrThrow() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED');
  }
  return session.user.id;
}

export async function GET() {
  try {
    const userId = await getUserIdOrThrow();
    const notifications = await getNotificationsByUserId({ userId });
    return NextResponse.json({ notifications });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Failed to list notifications', error);
    return NextResponse.json(
      { error: 'Unable to fetch notifications' },
      { status: 500 },
    );
  }
}

const markSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function PATCH(request: Request) {
  try {
    const userId = await getUserIdOrThrow();
    const payload = markSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: payload.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await markNotificationsRead({
      userId,
      notificationIds: payload.data.ids,
    });

    return NextResponse.json({ updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Failed to mark notifications as read', error);
    return NextResponse.json(
      { error: 'Unable to update notifications' },
      { status: 500 },
    );
  }
}

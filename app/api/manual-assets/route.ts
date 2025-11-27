import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import {
  createManualAsset,
  deleteManualAsset,
  getManualAssetsByUserId,
  updateManualAsset,
} from '@/lib/db/queries';

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).default('Other'),
  value: z.coerce.number().min(0),
  notes: z.string().nullable().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  category: z.string().optional(),
  value: z.coerce.number().optional(),
  notes: z.string().nullable().optional(),
});

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED');
  }
  return session.user.id;
}

export async function GET() {
  try {
    const userId = await requireUser();
    const assets = await getManualAssetsByUserId({ userId });
    return NextResponse.json({ assets });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to list manual assets', error);
    return NextResponse.json(
      { error: 'Unable to fetch manual assets' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUser();
    const payload = createSchema.safeParse(await request.json());

    if (!payload.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: payload.error.flatten() },
        { status: 400 },
      );
    }

    const asset = await createManualAsset({ userId, ...payload.data });
    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to create manual asset', error);
    return NextResponse.json(
      { error: 'Unable to create manual asset' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUser();
    const payload = updateSchema.safeParse(await request.json());

    if (!payload.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: payload.error.flatten() },
        { status: 400 },
      );
    }

    const asset = await updateManualAsset({ userId, ...payload.data });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to update manual asset', error);
    return NextResponse.json(
      { error: 'Unable to update manual asset' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing asset id' }, { status: 400 });
    }

    await deleteManualAsset({ id, userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to delete manual asset', error);
    return NextResponse.json(
      { error: 'Unable to delete manual asset' },
      { status: 500 },
    );
  }
}

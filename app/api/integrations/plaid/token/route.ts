import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { getIntegrationProvider } from '@/lib/integrations/providers';

const requestSchema = z.object({
  products: z.array(z.enum(['transactions', 'investments'])).optional(),
  webhookUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = (await request.json().catch(() => ({}))) ?? {};
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const plaidProvider = getIntegrationProvider('plaid');

  try {
    const linkToken = await plaidProvider.createLinkToken({
      userId: session.user.id,
      products: parsed.data.products,
      webhookUrl: parsed.data.webhookUrl,
    });

    return NextResponse.json(linkToken);
  } catch (error) {
    console.error('Failed to create Plaid link token', error);
    return NextResponse.json(
      { error: 'Unable to create Plaid link token' },
      { status: 500 },
    );
  }
}

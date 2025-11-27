import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import {
  createOrUpdateInstitutionConnection,
  getConnectionDashboardSummary,
  upsertAccountsForConnection,
} from '@/lib/db/queries';
import { getIntegrationProvider } from '@/lib/integrations/providers';

const requestSchema = z.object({
  publicToken: z.string().min(4),
  institutionName: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const plaidProvider = getIntegrationProvider('plaid');

  try {
    const exchange = await plaidProvider.exchangePublicToken(parsed.data.publicToken);

    const connection = await createOrUpdateInstitutionConnection({
      userId: session.user.id,
      provider: 'plaid',
      accessToken: exchange.accessToken,
      itemId: exchange.itemId,
      institutionName: parsed.data.institutionName,
    });

    const accounts = await plaidProvider.fetchAccounts(connection);
    await upsertAccountsForConnection({
      connectionId: connection.id,
      userId: session.user.id,
      accounts,
    });

    const dashboard = await getConnectionDashboardSummary({ userId: session.user.id });

    return NextResponse.json({
      connection,
      accounts,
      dashboard,
    });
  } catch (error) {
    console.error('Failed to exchange Plaid public token', error);
    return NextResponse.json(
      { error: 'Failed to link institution' },
      { status: 500 },
    );
  }
}

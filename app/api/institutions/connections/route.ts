import { NextResponse } from 'next/server';

import { auth } from '@/app/(auth)/auth';
import { getConnectionDashboardSummary } from '@/lib/db/queries';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connections = await getConnectionDashboardSummary({ userId: session.user.id });
    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Failed to load connection dashboard', error);
    return NextResponse.json(
      { error: 'Unable to load connections' },
      { status: 500 },
    );
  }
}

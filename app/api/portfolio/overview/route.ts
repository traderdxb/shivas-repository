import { NextResponse } from 'next/server';

import { getPortfolioOverview } from '@/lib/portfolio/data';
import { parseFiltersFromSearchParams } from '@/lib/portfolio/filters';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = parseFiltersFromSearchParams(searchParams);
  const data = getPortfolioOverview(filters);

  return NextResponse.json(data);
}

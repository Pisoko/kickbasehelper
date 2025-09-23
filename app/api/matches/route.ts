import { NextResponse } from 'next/server';

import { readCache } from '../../../lib/data';
import type { Match, Odds } from '../../../lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spieltag = Number(searchParams.get('spieltag') ?? '1');
  const cache = readCache(spieltag);
  if (!cache) {
    return NextResponse.json({ error: 'Keine Daten im Cache' }, { status: 404 });
  }
  return NextResponse.json({
    matches: cache.matches as Match[],
    odds: cache.odds as Odds[] | undefined,
    updatedAt: cache.updatedAt
  });
}

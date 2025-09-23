import { NextResponse } from 'next/server';

import { cacheAgeDays, readCache, validatePlayerData } from '../../../lib/data';
import type { Player } from '../../../lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spieltag = Number(searchParams.get('spieltag') ?? '1');
  const cache = readCache(spieltag);
  if (!cache) {
    return NextResponse.json({ error: 'Keine Daten im Cache' }, { status: 404 });
  }
  try {
    validatePlayerData(cache.players);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  const age = cacheAgeDays(spieltag);
  return NextResponse.json({
    players: cache.players as Player[],
    updatedAt: cache.updatedAt,
    cacheAgeDays: age
  });
}

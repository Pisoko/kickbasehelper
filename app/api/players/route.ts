import { NextResponse } from 'next/server';

import { cacheAgeDays, readCache, validatePlayerDataWithTeamCheck } from '../../../lib/data';
import { filterExcludedPlayers } from '../../../lib/playerExclusion';
import type { Player } from '../../../lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spieltag = Number(searchParams.get('spieltag') ?? '1');
  const cache = readCache(spieltag);
  if (!cache) {
    return NextResponse.json({ error: 'Keine Daten im Cache' }, { status: 404 });
  }
  try {
    // Validate and filter players to ensure only Bundesliga teams are included
    const validatedPlayers = validatePlayerDataWithTeamCheck(cache.players);
    
    // Filter out excluded players
    const filteredPlayers = filterExcludedPlayers(validatedPlayers);
    
    const age = cacheAgeDays(spieltag);
    return NextResponse.json({
      players: filteredPlayers as Player[],
      updatedAt: cache.updatedAt,
      cacheAgeDays: age
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

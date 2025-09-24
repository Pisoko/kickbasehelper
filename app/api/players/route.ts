import { NextResponse } from 'next/server';

import { cacheAgeDays, readCache, validatePlayerDataWithTeamCheck } from '../../../lib/data';
import { filterExcludedPlayers } from '../../../lib/playerExclusion';
import type { Player } from '../../../lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spieltag = Number(searchParams.get('spieltag') ?? '1');
  
  try {
    const cache = readCache(spieltag);
    if (!cache) {
      return NextResponse.json({ error: 'Keine Daten verfügbar' }, { status: 404 });
    }

    // Debug: Check Kane's data directly from cache
    const kaneFromCache = cache.players.find(p => p.name === 'Kane');
    console.log('Kane from cache:', kaneFromCache ? {
      name: kaneFromCache.name,
      totalMinutesPlayed: kaneFromCache.totalMinutesPlayed,
      minutesPlayed: kaneFromCache.minutesPlayed,
      minutes_hist: kaneFromCache.minutes_hist
    } : 'not found');

    // Debug: Check Kane's data before validation
    const kaneBefore = cache.players.find(p => p.name === 'Kane');
    console.log('Kane before validation:', kaneBefore ? {
      name: kaneBefore.name,
      totalMinutesPlayed: kaneBefore.totalMinutesPlayed,
      minutesPlayed: kaneBefore.minutesPlayed,
      minutes_hist: kaneBefore.minutes_hist
    } : 'not found');
    
    // Validate and filter players to ensure only Bundesliga teams are included
    const validatedPlayers = validatePlayerDataWithTeamCheck(cache.players);
    
    // Debug: Check Kane's data after validation
    const kaneAfterValidation = validatedPlayers.find(p => p.name === 'Kane');
    console.log('Kane after validation:', kaneAfterValidation ? {
      name: kaneAfterValidation.name,
      totalMinutesPlayed: kaneAfterValidation.totalMinutesPlayed,
      minutesPlayed: kaneAfterValidation.minutesPlayed,
      minutes_hist: kaneAfterValidation.minutes_hist
    } : 'not found');
    
    // Filter out excluded players
    const filteredPlayers = filterExcludedPlayers(validatedPlayers);
    
    // Debug: Check Kane's data after filtering (totalMinutesPlayed should already be correct)
    const kaneAfterCalculation = filteredPlayers.find(p => p.name === 'Kane');
    console.log('Kane after calculation:', kaneAfterCalculation ? {
      name: kaneAfterCalculation.name,
      totalMinutesPlayed: kaneAfterCalculation.totalMinutesPlayed,
      minutesPlayed: kaneAfterCalculation.minutesPlayed,
      minutes_hist: kaneAfterCalculation.minutes_hist
    } : 'not found');
    
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

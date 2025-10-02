import { NextResponse } from 'next/server';
import { kickbaseDataCache } from '../../../lib/services/KickbaseDataCacheService';
import { readCache } from '../../../lib/data';
import type { Match, Odds } from '../../../lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spieltag = parseInt(searchParams.get('spieltag') || '1');
    
    console.log(`[Matches API] Fetching matches for Spieltag ${spieltag}`);
    
    // First try to get cached matches from KickbaseDataCacheService
    const cachedMatches = await kickbaseDataCache.getCachedMatches(spieltag);
    if (cachedMatches) {
      console.log(`[Matches API] Returning cached matches for Spieltag ${spieltag} (${cachedMatches.matches.length} matches)`);
      return NextResponse.json({
        matches: cachedMatches.matches,
        spieltag: cachedMatches.spieltag,
        updatedAt: cachedMatches.updatedAt,
        fromCache: true,
        source: 'kickbase_cache'
      });
    }
    
    // Fallback to old cache system
    const cache = readCache(spieltag);
    if (!cache) {
      return NextResponse.json({ error: 'Keine Daten im Cache' }, { status: 404 });
    }
    
    console.log(`[Matches API] Returning fallback cache data for Spieltag ${spieltag}`);
    return NextResponse.json({
      matches: cache.matches as Match[],
      odds: cache.odds as Odds[] | undefined,
      updatedAt: cache.updatedAt,
      fromCache: true,
      source: 'legacy_cache'
    });
  } catch (error) {
    console.error('[Matches API] Error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Matches' }, { status: 500 });
  }
}

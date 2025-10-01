import { NextResponse } from 'next/server';
import { readCache, cacheAgeDays, validatePlayerDataWithTeamCheck } from '../../../lib/data';
import { kickbaseDataCache } from '../../../lib/services/KickbaseDataCacheService';
import type { Player } from '../../../lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spieltag = Number(searchParams.get('spieltag') ?? '1');
  
  try {
    // Versuche zuerst Cache zu nutzen
    let cachedPlayers = await kickbaseDataCache.getCachedPlayers(spieltag);
    
    if (cachedPlayers) {
      const age = cacheAgeDays(spieltag);
      return NextResponse.json({
        players: cachedPlayers,
        updatedAt: new Date().toISOString(),
        cacheAgeDays: age,
        source: 'cache'
      });
    }
    
    // Fallback auf lokalen Cache
    const cache = readCache(spieltag);
    if (!cache) {
      return NextResponse.json({ error: 'Keine Daten verfügbar' }, { status: 404 });
    }

    const validatedPlayers = validatePlayerDataWithTeamCheck(cache.players);
  
  // Fix punkte_avg calculation - ensure it's calculated from punkte_hist
  const correctedPlayers = validatedPlayers.map((player: Player) => {
    if (player.punkte_hist && Array.isArray(player.punkte_hist) && player.punkte_hist.length > 0) {
      // Calculate correct average from punkte_hist
      const validPoints = player.punkte_hist.filter((p: number) => typeof p === 'number' && !isNaN(p));
      if (validPoints.length > 0) {
        const correctAvg = Math.round(validPoints.reduce((sum: number, points: number) => sum + points, 0) / validPoints.length);
        
        // Only update if the current punkte_avg is wrong
        if (player.punkte_avg !== correctAvg) {
          console.log(`Correcting punkte_avg for ${player.name}: ${player.punkte_avg} -> ${correctAvg}`);
          return {
            ...player,
            punkte_avg: correctAvg
          };
        }
      }
    }
    return player;
  });

  // Use cached market values for better performance
  // CV enhancement is disabled for performance reasons
  const enhancedPlayers = correctedPlayers;
  
  // Cache die verarbeiteten Spielerdaten
  await kickbaseDataCache.cachePlayers(spieltag, enhancedPlayers as Player[]);
    
    const age = cacheAgeDays(spieltag);
    return NextResponse.json({
      players: enhancedPlayers as Player[],
      updatedAt: cache.updatedAt,
      cacheAgeDays: age,
      source: 'processed'
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

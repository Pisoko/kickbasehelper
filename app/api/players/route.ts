import { NextResponse } from 'next/server';
import { readCache, cacheAgeDays, validatePlayerDataWithTeamCheck } from '../../../lib/data';
import { kickbaseDataCache } from '../../../lib/services/KickbaseDataCacheService';
import { correctPlayersPositions } from '../../../lib/positionCorrections';
import type { Player } from '../../../lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spieltag = parseInt(searchParams.get('spieltag') || '0');
    const refresh = searchParams.get('refresh') === 'true';
    
    console.log(`[Players API] Fetching players for Spieltag ${spieltag}, refresh: ${refresh}`);
    
    // If refresh is requested, skip cache and force reload
    if (!refresh) {
      // First try to get cached data from cache warmup (all players)
      const allPlayersData = await kickbaseDataCache.getCachedAllPlayers('bundesliga');
      if (allPlayersData && allPlayersData.players && allPlayersData.players.length > 0) {
        console.log(`[Players API] Returning cache warmup data (${allPlayersData.players.length} players)`);
        // Apply position corrections to cached data
        const correctedPlayers = correctPlayersPositions(allPlayersData.players);
        return NextResponse.json({
          players: correctedPlayers,
          spieltag,
          updatedAt: allPlayersData.lastUpdated,
          cacheAgeDays: 0,
          fromCache: true,
          source: 'cache_warmup'
        });
      }
    }
    
    // Fallback: Try to get cached data for specific spieltag (only if not refreshing)
    if (!refresh) {
      const cachedData = await kickbaseDataCache.getCachedPlayers(spieltag);
      if (cachedData) {
        console.log(`[Players API] Returning cached data for Spieltag ${spieltag} (${cachedData.players.length} players)`);
        // Apply position corrections to cached data
        const correctedPlayers = correctPlayersPositions(cachedData.players);
        return NextResponse.json({
          ...cachedData,
          players: correctedPlayers,
          fromCache: true,
          cacheAge: cachedData.cacheAgeDays,
          source: 'spieltag_cache'
        });
      }
    }
    
    // If refresh is requested, trigger cache warmup to reload data
    if (refresh) {
      console.log(`[Players API] Refresh requested, triggering cache warmup for Spieltag ${spieltag}`);
      try {
        // Import the startup cache service
        const { startupCacheService } = await import('../../../lib/services/StartupCacheService');
        
        // Trigger cache warmup
        await startupCacheService.startWarmup({
          includeAllPlayers: true,
          includePlayerDetails: false,
          includeTeamLogos: false,
          includeComprehensivePlayerData: false,
          currentSpieltag: spieltag
        });
        
        // After warmup, try to get the fresh data
        const freshData = await kickbaseDataCache.getCachedAllPlayers('bundesliga');
        if (freshData && freshData.players && freshData.players.length > 0) {
          console.log(`[Players API] Returning fresh data after warmup (${freshData.players.length} players)`);
          const correctedPlayers = correctPlayersPositions(freshData.players);
          return NextResponse.json({
            players: correctedPlayers,
            spieltag,
            updatedAt: freshData.lastUpdated,
            cacheAgeDays: 0,
            fromCache: false,
            source: 'fresh_warmup'
          });
        }
      } catch (error) {
        console.error(`[Players API] Cache warmup failed:`, error);
        // Continue to fallback logic
      }
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
  
  // Apply position corrections to processed players
  const finalPlayers = correctPlayersPositions(enhancedPlayers as Player[]);
  
  // Cache die verarbeiteten Spielerdaten
  await kickbaseDataCache.cachePlayers(spieltag, finalPlayers);
    
    const age = cacheAgeDays(spieltag);
    return NextResponse.json({
      players: finalPlayers,
      updatedAt: cache.updatedAt,
      cacheAgeDays: age,
      source: 'processed'
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

import { cacheAgeDays, readCache, validatePlayerDataWithTeamCheck } from '../../../lib/data';
import { enhancedKickbaseClient } from '../../../lib/adapters/EnhancedKickbaseClient';
import { kickbaseAuth } from '../../../lib/adapters/KickbaseAuthService';
import type { Player } from '../../../lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spieltag = Number(searchParams.get('spieltag') ?? '1');
  
  try {
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

  // Enhance players with current CV values for accurate market values
  let enhancedPlayers = correctedPlayers;
  try {
    // Check authentication
    if (!kickbaseAuth.isTokenValid()) {
      await kickbaseAuth.refreshToken();
    }

    // Enhance players with current CV values
    enhancedPlayers = await Promise.all(correctedPlayers.map(async (player: Player) => {
      try {
        const cvData = await enhancedKickbaseClient.getPlayerCV(player.id);
        if (cvData && cvData.cvValue) {
          return {
            ...player,
            marketValue: cvData.cvValue,
            kosten: cvData.cvValue
          };
        }
      } catch (error) {
        console.warn(`Failed to get CV for player ${player.id}:`, error);
      }
      return player;
    }));
  } catch (error) {
    console.warn('Failed to enhance players with CV values:', error);
    // Continue with corrected players if CV enhancement fails
  }
  

    
    const age = cacheAgeDays(spieltag);
    return NextResponse.json({
      players: enhancedPlayers as Player[],
      updatedAt: cache.updatedAt,
      cacheAgeDays: age
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

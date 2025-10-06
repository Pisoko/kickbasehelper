import { NextRequest, NextResponse } from 'next/server';
import { kickbaseDataCache } from '@/lib/services/KickbaseDataCacheService';
import { matchdayService } from '@/lib/services/MatchdayService';
import pino from 'pino';

const logger = pino({ name: 'CacheInvalidateMatchdayAPI' });

/**
 * POST /api/cache/invalidate-matchday
 * Invalidiert den Cache für einen spezifischen Spieltag oder alle abgeschlossenen Spieltage
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spieltag, invalidateAll = false } = body;

    if (invalidateAll) {
      // Invalidiere Cache für alle abgeschlossenen Spieltage
      const matchdayState = await matchdayService.getCurrentMatchdayState();
      const currentMatchday = matchdayState.currentMatchday;
      
      logger.info(`Invalidating cache for all completed matchdays (1-${currentMatchday})`);
      
      const invalidatedMatchdays = [];
      for (let md = 1; md <= currentMatchday; md++) {
        try {
          await kickbaseDataCache.invalidateSpieltagCache(md);
          invalidatedMatchdays.push(md);
        } catch (error) {
          logger.warn({ error, matchday: md }, `Failed to invalidate cache for matchday ${md}`);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Cache invalidated for ${invalidatedMatchdays.length} matchdays`,
        invalidatedMatchdays,
        currentMatchday,
        timestamp: new Date().toISOString()
      });
    }

    if (!spieltag || typeof spieltag !== 'number') {
      return NextResponse.json(
        { error: 'Invalid spieltag parameter. Must be a number.' },
        { status: 400 }
      );
    }

    if (spieltag < 1 || spieltag > 34) {
      return NextResponse.json(
        { error: 'Spieltag must be between 1 and 34' },
        { status: 400 }
      );
    }

    // Invalidiere Cache für spezifischen Spieltag
    logger.info(`Invalidating cache for Spieltag ${spieltag}`);
    await kickbaseDataCache.invalidateSpieltagCache(spieltag);

    return NextResponse.json({
      success: true,
      message: `Cache invalidated for Spieltag ${spieltag}`,
      spieltag,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error({ error }, 'Failed to invalidate matchday cache');
    return NextResponse.json(
      { 
        error: 'Failed to invalidate cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cache/invalidate-matchday
 * Zeigt Informationen über den aktuellen Cache-Status
 */
export async function GET() {
  try {
    const matchdayState = await matchdayService.getCurrentMatchdayState();
    const cacheHealth = await kickbaseDataCache.getCacheHealth();

    return NextResponse.json({
      success: true,
      data: {
        currentMatchday: matchdayState.currentMatchday,
        lastUpdate: matchdayState.lastUpdate,
        lastChecked: matchdayState.lastChecked,
        cacheHealth,
        availableActions: [
          'POST with { "spieltag": number } to invalidate specific matchday',
          'POST with { "invalidateAll": true } to invalidate all completed matchdays'
        ]
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to get cache status');
    return NextResponse.json(
      { 
        error: 'Failed to get cache status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
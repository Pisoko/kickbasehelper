import { NextRequest, NextResponse } from 'next/server';
import { kickbaseDataCache } from '../../../lib/services/KickbaseDataCacheService';
import { createOddsProvider } from '../../../lib/adapters/OddsProvider';
import type { Match, Odds } from '../../../lib/types';

/**
 * GET /api/odds - Retrieve odds with caching
 * Query parameters:
 * - matchday: number (optional) - Get odds for specific matchday
 * - matches: string (optional) - Comma-separated match IDs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchday = searchParams.get('matchday');
    const matchesParam = searchParams.get('matches');

    // If matchday is specified, get odds for that matchday
    if (matchday) {
      const spieltag = parseInt(matchday);
      
      // Try to get from cache first
      console.log(`DEBUG GET: Looking for odds for matchday ${spieltag}`);
      const cachedOdds = await kickbaseDataCache.getCachedOdds(spieltag);
      console.log(`DEBUG GET: Cache result:`, cachedOdds ? `Found ${cachedOdds.odds.length} odds` : 'Not found');
      if (cachedOdds) {
        return NextResponse.json({
          success: true,
          data: cachedOdds.odds,
          source: 'cache',
          updatedAt: cachedOdds.updatedAt,
          spieltag: cachedOdds.spieltag
        });
      }

      // If not in cache, fetch from external API
      // Note: We need matches data to get odds, so this would require
      // fetching matches first or having a separate odds endpoint
      return NextResponse.json({
        success: false,
        error: 'Odds for matchday not found in cache. Use POST /api/odds to warm up cache.'
      }, { status: 404 });
    }

    // If specific matches are requested
    if (matchesParam) {
      const matchIds = matchesParam.split(',').map(id => id.trim());
      const cachedOdds = await kickbaseDataCache.getCachedMatchOdds(matchIds);
      
      return NextResponse.json({
        success: true,
        data: cachedOdds,
        source: 'cache',
        matchIds
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Please specify either matchday or matches parameter'
    }, { status: 400 });

  } catch (error) {
    console.error('Error fetching odds:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch odds'
    }, { status: 500 });
  }
}

/**
 * POST /api/odds - Warm up odds cache for specific matchday
 * Body: { matchday: number, matches: Match[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchday, matches } = body;

    if (!matchday || !matches || !Array.isArray(matches)) {
      return NextResponse.json({
        success: false,
        error: 'matchday and matches array are required'
      }, { status: 400 });
    }

    const spieltag = parseInt(matchday);
    
    // Filter upcoming matches (those without results)
    const upcomingMatches = matches.filter((match: Match) => 
      !match.matchStatus || match.matchStatus === 0
    );

    if (upcomingMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No upcoming matches found for odds fetching',
        cachedOdds: 0
      });
    }

    // Fetch odds for upcoming matches
    const oddsProvider = await createOddsProvider();
    const allOdds = await oddsProvider.fetchOdds(upcomingMatches);

    // Cache the odds
    console.log(`DEBUG: Fetched ${allOdds.length} odds for spieltag ${spieltag}`);
    if (allOdds.length > 0) {
      console.log(`DEBUG: Caching odds for spieltag ${spieltag}...`);
      await kickbaseDataCache.cacheOdds(spieltag, allOdds);
      console.log(`DEBUG: Odds cached for spieltag ${spieltag}`);
      
      // Also cache individual match odds
      const matchIds = allOdds.map(odd => odd.matchId);
      await kickbaseDataCache.cacheMatchOdds(matchIds, allOdds);
      console.log(`DEBUG: Individual match odds cached for ${matchIds.length} matches`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cached odds for ${allOdds.length} matches`,
      cachedOdds: allOdds.length,
      spieltag
    });

  } catch (error) {
    console.error('Error warming up odds cache:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to warm up odds cache'
    }, { status: 500 });
  }
}
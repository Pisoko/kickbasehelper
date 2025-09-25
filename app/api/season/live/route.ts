import { NextRequest, NextResponse } from 'next/server';
import { enhancedKickbaseClient } from '../../../../lib/adapters/EnhancedKickbaseClient';
import { kickbaseAuth } from '../../../../lib/adapters/KickbaseAuthService';
import pino from 'pino';

const logger = pino({ name: 'LiveSeasonAPI' });

/**
 * GET /api/season/live
 * Fetches live season data including players, matches, and configuration
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Fetching live season data...');

    // Check if we have valid authentication
    const isAuthenticated = await kickbaseAuth.isTokenValid();
    
    if (!isAuthenticated) {
      logger.warn('No valid authentication token available');
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'Please authenticate with Kickbase API first'
        },
        { status: 401 }
      );
    }

    // Get current season data
    const seasonData = await enhancedKickbaseClient.getCurrentSeasonData();

    logger.info({
      playersCount: seasonData.players.length,
      matchesCount: seasonData.matches.length,
    }, 'Successfully fetched live season data');

    return NextResponse.json({
      success: true,
      data: {
        players: seasonData.players,
        matches: seasonData.matches,
        config: seasonData.config,
        timestamp: new Date().toISOString(),
        source: 'live_api'
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to fetch live season data');

    return NextResponse.json(
      {
        error: 'Failed to fetch live season data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/season/live/refresh
 * Forces a refresh of live season data
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Forcing refresh of live season data...');

    // Force token refresh
    await kickbaseAuth.refreshToken();

    // Get fresh season data
    const seasonData = await enhancedKickbaseClient.getCurrentSeasonData();

    logger.info({
      playersCount: seasonData.players.length,
      matchesCount: seasonData.matches.length,
    }, 'Successfully refreshed live season data');

    return NextResponse.json({
      success: true,
      data: {
        players: seasonData.players,
        matches: seasonData.matches,
        config: seasonData.config,
        timestamp: new Date().toISOString(),
        source: 'live_api_refreshed'
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to refresh live season data');

    return NextResponse.json(
      {
        error: 'Failed to refresh live season data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
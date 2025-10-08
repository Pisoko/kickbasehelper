import { NextRequest, NextResponse } from 'next/server';
import pino from 'pino';
import { kickbaseAuth } from '@/lib/adapters/KickbaseAuthService';

const logger = pino({ name: 'PlayerCVAPI' });

/**
 * API Route to fetch the CV (Contract Value) for a specific player
 * 
 * The CV field represents the contract value of a player from the Kickbase API.
 * This is different from market value (mv) and represents the player's current contract worth.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const leagueId = searchParams.get('leagueId') || '7389547'; // Default league ID

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId parameter is required' },
        { status: 400 }
      );
    }

    logger.info({ playerId, leagueId }, 'Fetching CV value for player');

    // Get valid token from KickbaseAuthService
    const token = await kickbaseAuth.getValidToken();
    if (!token) {
      logger.error('No valid Kickbase token available');
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 500 }
      );
    }

    // Fetch player data from Kickbase API
    const apiUrl = `https://api.kickbase.com/v4/leagues/${leagueId}/players/${playerId}`;
    logger.info({ apiUrl }, 'Making request to Kickbase API');

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      logger.error({ 
        status: response.status, 
        statusText: response.statusText,
        playerId,
        leagueId 
      }, 'Kickbase API request failed');
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch player data from Kickbase API',
          status: response.status,
          statusText: response.statusText
        },
        { status: response.status }
      );
    }

    const playerData = await response.json();
    logger.info({ playerId, hasData: !!playerData }, 'Player data received from Kickbase API');

    // Extract CV value and other relevant information
    const cvValue = playerData.cv;
    const playerName = playerData.n || `${playerData.fn || ''} ${playerData.ln || ''}`.trim();
    const marketValue = playerData.mv;
    const teamName = playerData.tn;

    if (cvValue === undefined || cvValue === null) {
      logger.warn({ playerId, playerData: Object.keys(playerData) }, 'CV value not found in player data');
      return NextResponse.json(
        { 
          error: 'CV value not available for this player',
          playerId,
          playerName,
          availableFields: Object.keys(playerData)
        },
        { status: 404 }
      );
    }

    logger.info({ 
      playerId, 
      playerName, 
      cvValue, 
      marketValue, 
      teamName 
    }, 'Successfully retrieved CV value');

    return NextResponse.json({
      success: true,
      playerId,
      playerName,
      teamName,
      cvValue,
      marketValue, // Include market value for comparison
      timestamp: new Date().toISOString(),
      leagueId
    });

  } catch (error) {
    logger.error({ error }, 'Error in player CV API');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for batch CV value retrieval
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerIds, leagueId = '7389547' } = body;

    if (!playerIds || !Array.isArray(playerIds)) {
      return NextResponse.json(
        { error: 'playerIds array is required' },
        { status: 400 }
      );
    }

    logger.info({ playerIds, leagueId }, 'Fetching CV values for multiple players');

    const token = await kickbaseAuth.getValidToken();
    if (!token) {
      logger.error('No valid Kickbase token available');
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 500 }
      );
    }

    const results = [];

    for (const playerId of playerIds) {
      try {
        const apiUrl = `https://api.kickbase.com/v4/leagues/${leagueId}/players/${playerId}`;
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const playerData = await response.json();
          const cvValue = playerData.cv;
          const playerName = playerData.n || `${playerData.fn || ''} ${playerData.ln || ''}`.trim();
          
          results.push({
            playerId,
            playerName,
            teamName: playerData.tn,
            cvValue,
            marketValue: playerData.mv,
            success: true
          });
          
          logger.info({ playerId, cvValue }, `CV value retrieved for player ${playerId}`);
        } else {
          logger.warn({ playerId, status: response.status }, `Failed to fetch data for player ${playerId}`);
          results.push({
            playerId,
            success: false,
            error: `API request failed with status ${response.status}`
          });
        }
      } catch (playerError) {
        logger.error({ playerId, error: playerError }, `Error processing player ${playerId}`);
        results.push({
          playerId,
          success: false,
          error: 'Processing error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalPlayers: playerIds.length,
      successfulPlayers: results.filter(r => r.success).length,
      timestamp: new Date().toISOString(),
      leagueId
    });

  } catch (error) {
    logger.error({ error }, 'Error in batch player CV API');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
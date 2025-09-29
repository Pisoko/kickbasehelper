import { NextRequest, NextResponse } from 'next/server';
import { enhancedKickbaseClient } from '../../../../lib/adapters/EnhancedKickbaseClient';
import { kickbaseAuth } from '../../../../lib/adapters/KickbaseAuthService';
import pino from 'pino';

const logger = pino({ name: 'MatchdayMonitorCron' });

/**
 * POST /api/cron/matchday-monitor
 * Hourly cron job to monitor for new matchdays
 * This endpoint should be called by an external cron service (e.g., Vercel Cron, GitHub Actions, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Starting hourly matchday monitoring...');

    // Verify cron authorization (optional security measure)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if we have valid Kickbase authentication
    const isAuthenticated = await kickbaseAuth.isTokenValid();
    
    if (!isAuthenticated) {
      logger.warn('No valid Kickbase authentication token available');
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'Kickbase API authentication required'
        },
        { status: 401 }
      );
    }

    // Call our matchday check endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const checkResponse = await fetch(`${baseUrl}/api/matchday/check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!checkResponse.ok) {
      throw new Error(`Matchday check failed: ${checkResponse.status}`);
    }

    const checkResult = await checkResponse.json();
    
    if (checkResult.data.hasNewMatchday) {
      logger.info({
        previousMatchday: checkResult.data.currentMatchday - 1,
        newMatchday: checkResult.data.currentMatchday
      }, 'New matchday detected by cron job');

      // Trigger player data update
      const updateResponse = await fetch(`${baseUrl}/api/cron/update-player-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader || '',
        },
        body: JSON.stringify({
          matchday: checkResult.data.currentMatchday,
          reason: 'new_matchday_detected'
        }),
      });

      if (!updateResponse.ok) {
        logger.error({ status: updateResponse.status }, 'Failed to trigger player data update');
      } else {
        logger.info('Successfully triggered player data update');
      }

      return NextResponse.json({
        success: true,
        message: 'New matchday detected and player data update triggered',
        data: {
          newMatchday: checkResult.data.currentMatchday,
          playerDataUpdateTriggered: updateResponse.ok,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      logger.info({
        currentMatchday: checkResult.data.currentMatchday
      }, 'No new matchday detected');

      return NextResponse.json({
        success: true,
        message: 'No new matchday detected',
        data: {
          currentMatchday: checkResult.data.currentMatchday,
          lastChecked: checkResult.data.lastChecked,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    logger.error({ error }, 'Matchday monitoring cron job failed');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Matchday monitoring failed'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/matchday-monitor
 * Health check for the cron job endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Matchday monitor cron endpoint is healthy',
    timestamp: new Date().toISOString(),
    nextRun: 'Every hour (configure in your cron service)'
  });
}
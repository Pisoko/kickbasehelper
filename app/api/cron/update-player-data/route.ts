import { NextRequest, NextResponse } from 'next/server';
import { enhancedKickbaseClient } from '../../../../lib/adapters/EnhancedKickbaseClient';
import { kickbaseAuth } from '../../../../lib/adapters/KickbaseAuthService';
import pino from 'pino';
import fs from 'fs/promises';
import path from 'path';

const logger = pino({ name: 'UpdatePlayerDataCron' });

interface PlayerDataSnapshot {
  matchday: number;
  timestamp: string;
  playersCount: number;
  dataPath: string;
}

const SNAPSHOTS_DIR = path.join(process.cwd(), 'data', 'player-snapshots');
const SNAPSHOTS_INDEX_FILE = path.join(process.cwd(), 'data', 'snapshots-index.json');

/**
 * POST /api/cron/update-player-data
 * Updates player data when a new matchday is detected
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Starting player data update...');

    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized player data update request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { matchday, reason = 'manual_trigger' } = body;

    if (!matchday || typeof matchday !== 'number') {
      return NextResponse.json(
        { error: 'Invalid matchday parameter' },
        { status: 400 }
      );
    }

    // Check Kickbase authentication
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

    // Fetch current season data
    logger.info({ matchday }, 'Fetching current season data...');
    const seasonData = await enhancedKickbaseClient.getCurrentSeasonData();

    // Create snapshot for this matchday
    const snapshot = await createPlayerDataSnapshot(matchday, seasonData);
    
    // Update snapshots index
    await updateSnapshotsIndex(snapshot);

    // Trigger frontend cache invalidation (if needed)
    await invalidateFrontendCache();

    logger.info({
      matchday,
      playersCount: seasonData.players.length,
      reason
    }, 'Player data update completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Player data updated successfully',
      data: {
        matchday,
        playersCount: seasonData.players.length,
        matchesCount: seasonData.matches.length,
        snapshotPath: snapshot.dataPath,
        reason,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error({ error }, 'Player data update failed');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Player data update failed'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/update-player-data
 * Get information about player data snapshots
 */
export async function GET(request: NextRequest) {
  try {
    const snapshots = await loadSnapshotsIndex();
    
    return NextResponse.json({
      success: true,
      data: {
        snapshotsCount: snapshots.length,
        latestSnapshot: snapshots[snapshots.length - 1] || null,
        snapshots: snapshots.slice(-10), // Return last 10 snapshots
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to get player data snapshots info');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to get snapshots info'
      },
      { status: 500 }
    );
  }
}

/**
 * Create a snapshot of player data for a specific matchday
 */
async function createPlayerDataSnapshot(matchday: number, seasonData: any): Promise<PlayerDataSnapshot> {
  try {
    // Ensure snapshots directory exists
    await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });

    const timestamp = new Date().toISOString();
    const filename = `matchday-${matchday}-${timestamp.split('T')[0]}.json`;
    const filePath = path.join(SNAPSHOTS_DIR, filename);

    // Prepare snapshot data
    const snapshotData = {
      matchday,
      timestamp,
      metadata: {
        playersCount: seasonData.players.length,
        matchesCount: seasonData.matches.length,
        source: 'kickbase_api'
      },
      players: seasonData.players,
      matches: seasonData.matches,
      config: seasonData.config
    };

    // Write snapshot to file
    await fs.writeFile(filePath, JSON.stringify(snapshotData, null, 2));

    const snapshot: PlayerDataSnapshot = {
      matchday,
      timestamp,
      playersCount: seasonData.players.length,
      dataPath: filePath
    };

    logger.info({
      matchday,
      filename,
      playersCount: seasonData.players.length
    }, 'Player data snapshot created');

    return snapshot;

  } catch (error) {
    logger.error({ error, matchday }, 'Failed to create player data snapshot');
    throw error;
  }
}

/**
 * Update the snapshots index file
 */
async function updateSnapshotsIndex(newSnapshot: PlayerDataSnapshot): Promise<void> {
  try {
    const snapshots = await loadSnapshotsIndex();
    
    // Add new snapshot
    snapshots.push(newSnapshot);
    
    // Keep only last 50 snapshots to prevent unlimited growth
    const trimmedSnapshots = snapshots.slice(-50);
    
    // Save updated index
    await fs.writeFile(SNAPSHOTS_INDEX_FILE, JSON.stringify(trimmedSnapshots, null, 2));
    
    logger.info({ snapshotsCount: trimmedSnapshots.length }, 'Snapshots index updated');

  } catch (error) {
    logger.error({ error }, 'Failed to update snapshots index');
    throw error;
  }
}

/**
 * Load snapshots index from file
 */
async function loadSnapshotsIndex(): Promise<PlayerDataSnapshot[]> {
  try {
    const data = await fs.readFile(SNAPSHOTS_INDEX_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return empty array if file doesn't exist
    return [];
  }
}

/**
 * Invalidate frontend cache to ensure fresh data is loaded
 */
async function invalidateFrontendCache(): Promise<void> {
  try {
    // This could trigger a revalidation of cached data
    // For now, we'll just log that cache invalidation should happen
    logger.info('Frontend cache invalidation triggered');
    
    // In a production environment, you might:
    // - Clear Redis cache
    // - Trigger ISR revalidation
    // - Send webhook to frontend
    // - Update database timestamps
    
  } catch (error) {
    logger.error({ error }, 'Failed to invalidate frontend cache');
    // Don't throw error as this is not critical
  }
}
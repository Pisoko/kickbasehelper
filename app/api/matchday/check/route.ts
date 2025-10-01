import { NextRequest, NextResponse } from 'next/server';
import { enhancedKickbaseClient } from '../../../../lib/adapters/EnhancedKickbaseClient';
import { kickbaseAuth } from '../../../../lib/adapters/KickbaseAuthService';
import pino from 'pino';
import fs from 'fs/promises';
import path from 'path';

const logger = pino({ name: 'MatchdayCheckAPI' });

interface MatchdayState {
  currentMatchday: number;
  lastChecked: string;
  lastUpdate: string;
  totalMatchdays: number;
}

const MATCHDAY_STATE_FILE = path.join(process.cwd(), 'data', 'matchday-state.json');

/**
 * GET /api/matchday/check
 * Checks for new matchdays and returns current status
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Checking for new matchday...');

    // Check if we have valid authentication
    const isAuthenticated = await kickbaseAuth.isTokenValid();
    
    if (!isAuthenticated) {
      logger.warn('No valid authentication token available - returning cached state only');
      
      // Return cached state without checking for updates
      const currentState = await loadMatchdayState();
      const now = new Date().toISOString();
      
      return NextResponse.json({
        success: true,
        data: {
          hasNewMatchday: false,
          currentMatchday: currentState.currentMatchday,
          detectedMatchday: currentState.currentMatchday,
          totalMatchdays: currentState.totalMatchdays,
          lastChecked: now,
          lastUpdate: currentState.lastUpdate,
          timestamp: now,
          authenticationRequired: true,
          message: 'Showing cached data - authentication required for live updates'
        }
      });
    }

    // Get current configuration to determine total matchdays
    const config = await enhancedKickbaseClient.getConfig();
    const bundesligaConfig = config.cps.find(cp => cp.cpi === '1');
    const totalMatchdays = bundesligaConfig?.mds || 34;

    // Load current matchday state
    const currentState = await loadMatchdayState();
    
    // Get live matches to determine current matchday
    const liveMatches = await enhancedKickbaseClient.getLiveMatches('1');
    const detectedMatchday = await detectCurrentMatchday(liveMatches);

    const now = new Date().toISOString();
    let hasNewMatchday = false;
    let updatedState = currentState;

    // Check if we detected a new matchday
    if (detectedMatchday > currentState.currentMatchday) {
      hasNewMatchday = true;
      updatedState = {
        currentMatchday: detectedMatchday,
        lastChecked: now,
        lastUpdate: now,
        totalMatchdays
      };
      
      // Save updated state
      await saveMatchdayState(updatedState);
      
      logger.info({
        previousMatchday: currentState.currentMatchday,
        newMatchday: detectedMatchday
      }, 'New matchday detected');
    } else {
      // Update last checked time
      updatedState = {
        ...currentState,
        lastChecked: now,
        totalMatchdays
      };
      await saveMatchdayState(updatedState);
    }

    return NextResponse.json({
      success: true,
      data: {
        hasNewMatchday,
        currentMatchday: updatedState.currentMatchday,
        detectedMatchday,
        totalMatchdays: updatedState.totalMatchdays,
        lastChecked: updatedState.lastChecked,
        lastUpdate: updatedState.lastUpdate,
        timestamp: now
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to check for new matchday');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to check for new matchday'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/matchday/check
 * Manually trigger matchday check and update
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Manual matchday check triggered...');

    let forceUpdate = false;
    try {
      const body = await request.json();
      forceUpdate = body.forceUpdate || false;
    } catch (error) {
      // No JSON body provided, use default values
      logger.info('No JSON body provided, using default values');
    }

    // Check authentication
    const isAuthenticated = await kickbaseAuth.isTokenValid();
    
    if (!isAuthenticated) {
      logger.warn('No valid authentication token available for POST - returning cached state only');
      
      // Return cached state without checking for updates
      const currentState = await loadMatchdayState();
      const now = new Date().toISOString();
      
      return NextResponse.json({
        success: true,
        data: {
          hasNewMatchday: false,
          currentMatchday: currentState.currentMatchday,
          detectedMatchday: currentState.currentMatchday,
          totalMatchdays: currentState.totalMatchdays,
          lastChecked: now,
          lastUpdate: currentState.lastUpdate,
          forced: forceUpdate,
          timestamp: now,
          authenticationRequired: true,
          message: 'Manual check requires authentication - showing cached data'
        }
      });
    }

    // Get current configuration
    const config = await enhancedKickbaseClient.getConfig();
    const bundesligaConfig = config.cps.find(cp => cp.cpi === '1');
    const totalMatchdays = bundesligaConfig?.mds || 34;

    // Load current state
    const currentState = await loadMatchdayState();
    
    // Get live matches and detect matchday
    const liveMatches = await enhancedKickbaseClient.getLiveMatches('1');
    const detectedMatchday = await detectCurrentMatchday(liveMatches);

    const now = new Date().toISOString();
    let hasNewMatchday = false;
    let updatedState = currentState;

    // Force update or check for new matchday
    if (forceUpdate || detectedMatchday > currentState.currentMatchday) {
      hasNewMatchday = true;
      updatedState = {
        currentMatchday: detectedMatchday,
        lastChecked: now,
        lastUpdate: now,
        totalMatchdays
      };
      
      await saveMatchdayState(updatedState);
      
      logger.info({
        previousMatchday: currentState.currentMatchday,
        newMatchday: detectedMatchday,
        forced: forceUpdate
      }, 'Matchday updated');
    }

    return NextResponse.json({
      success: true,
      data: {
        hasNewMatchday,
        currentMatchday: updatedState.currentMatchday,
        detectedMatchday,
        totalMatchdays: updatedState.totalMatchdays,
        lastChecked: updatedState.lastChecked,
        lastUpdate: updatedState.lastUpdate,
        forced: forceUpdate,
        timestamp: now
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to manually check matchday');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to manually check matchday'
      },
      { status: 500 }
    );
  }
}

/**
 * Load matchday state from file
 */
async function loadMatchdayState(): Promise<MatchdayState> {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(MATCHDAY_STATE_FILE);
    await fs.mkdir(dataDir, { recursive: true });

    const data = await fs.readFile(MATCHDAY_STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return default state if file doesn't exist
    const defaultState: MatchdayState = {
      currentMatchday: 1,
      lastChecked: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      totalMatchdays: 34
    };
    
    await saveMatchdayState(defaultState);
    return defaultState;
  }
}

/**
 * Save matchday state to file
 */
async function saveMatchdayState(state: MatchdayState): Promise<void> {
  try {
    const dataDir = path.dirname(MATCHDAY_STATE_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    
    await fs.writeFile(MATCHDAY_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    logger.error({ error }, 'Failed to save matchday state');
    throw error;
  }
}

/**
 * Detect current matchday based on completed matches
 * Current matchday = highest matchday where ALL matches are finished
 */
async function detectCurrentMatchday(liveMatches: any[]): Promise<number> {
  try {
    // Get competition matches to analyze matchday completion status
    const competitionMatches = await enhancedKickbaseClient.getCompetitionMatches('1');
    
    let currentMatchday = 0; // Start with 0, will be incremented for each completed matchday
    
    if (competitionMatches && competitionMatches.ms) {
      // Group matches by matchday
      const matchdayGroups: { [key: number]: any[] } = {};
      
      for (const match of competitionMatches.ms) {
        if (match.md) {
          if (!matchdayGroups[match.md]) {
            matchdayGroups[match.md] = [];
          }
          matchdayGroups[match.md].push(match);
        }
      }
      
      // Check each matchday in order to find the highest completed one
      const sortedMatchdays = Object.keys(matchdayGroups).map(Number).sort((a, b) => a - b);
      
      for (const matchday of sortedMatchdays) {
        const matches = matchdayGroups[matchday];
        
        // Check if ALL matches in this matchday are finished (st = 2 means finished)
        const allMatchesFinished = matches.every(match => match.st === 2);
        
        if (allMatchesFinished) {
          currentMatchday = matchday;
          logger.info({ matchday, totalMatches: matches.length }, 'Matchday completed');
        } else {
          // If this matchday is not completed, stop checking higher matchdays
          const finishedMatches = matches.filter(match => match.st === 2).length;
          const liveMatches = matches.filter(match => match.st === 1).length;
          const upcomingMatches = matches.filter(match => match.st === 0).length;
          
          logger.info({ 
            matchday, 
            finishedMatches, 
            liveMatches, 
            upcomingMatches, 
            totalMatches: matches.length 
          }, 'Matchday in progress or upcoming');
          break;
        }
      }
    }
    
    // If no completed matchdays found, use fallback logic
    if (currentMatchday === 0) {
      const now = new Date();
      const seasonStart = new Date('2025-08-22'); // Bundesliga 2025/26 season start
      const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      currentMatchday = Math.min(Math.max(0, weeksSinceStart), 34);
      
      logger.info({ 
        weeksSinceStart, 
        estimatedMatchday: currentMatchday 
      }, 'Using date-based fallback for current matchday');
    }
    
    logger.info({ detectedCurrentMatchday: currentMatchday }, 'Current matchday detection completed');
    return currentMatchday;
    
  } catch (error) {
    logger.error({ error }, 'Failed to detect current matchday');
    // Fallback to matchday 5 as mentioned by user
    logger.info('Using fallback: currentMatchday = 5');
    return 5;
  }
}
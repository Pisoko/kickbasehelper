import pino from 'pino';
import fs from 'fs/promises';
import path from 'path';
import { enhancedKickbaseClient } from '../adapters/EnhancedKickbaseClient';
import { kickbaseDataCache } from './KickbaseDataCacheService';
import type { Player, Match } from '../types';

const logger = pino({ name: 'MatchdayService' });

export interface MatchdayData {
  matchday: number;
  timestamp: string;
  players: Player[];
  matches: Match[];
  config: any;
  metadata: {
    playersCount: number;
    matchesCount: number;
    source: string;
  };
}

export interface MatchdayState {
  currentMatchday: number;
  lastChecked: string;
  lastUpdate: string;
  totalMatchdays: number;
}

export interface PlayerPerformanceEntry {
  matchday: number;
  points: number;
  marketValue: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  timestamp: string;
}

export class MatchdayService {
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly snapshotsDir = path.join(this.dataDir, 'player-snapshots');
  private readonly stateFile = path.join(this.dataDir, 'matchday-state.json');
  private readonly indexFile = path.join(this.dataDir, 'snapshots-index.json');
  private readonly performanceDir = path.join(this.dataDir, 'player-performance');

  constructor() {
    this.ensureDirectories();
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.snapshotsDir, { recursive: true });
      await fs.mkdir(this.performanceDir, { recursive: true });
    } catch (error) {
      logger.error({ error }, 'Failed to create directories');
    }
  }

  /**
   * Get current matchday state
   */
  async getCurrentMatchdayState(): Promise<MatchdayState> {
    try {
      const data = await fs.readFile(this.stateFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Return default state if file doesn't exist
      const defaultState: MatchdayState = {
        currentMatchday: 1,
        lastChecked: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        totalMatchdays: 34
      };
      
      await this.saveMatchdayState(defaultState);
      return defaultState;
    }
  }

  /**
   * Save matchday state
   */
  async saveMatchdayState(state: MatchdayState): Promise<void> {
    try {
      await this.ensureDirectories();
      await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      logger.error({ error }, 'Failed to save matchday state');
      throw error;
    }
  }

  /**
   * Check for new matchday and update if necessary
   */
  async checkAndUpdateMatchday(): Promise<{
    hasNewMatchday: boolean;
    currentMatchday: number;
    previousMatchday?: number;
  }> {
    try {
      const currentState = await this.getCurrentMatchdayState();
      const detectedMatchday = await this.detectCurrentMatchday();
      
      if (detectedMatchday > currentState.currentMatchday) {
        const previousMatchday = currentState.currentMatchday;
        
        // Invalidate cache for previous matchday to force fresh data
        logger.info({
          previousMatchday,
          newMatchday: detectedMatchday
        }, 'New matchday detected - invalidating cache for previous matchday');
        
        try {
          await kickbaseDataCache.invalidateSpieltagCache(previousMatchday);
          logger.info(`Cache invalidated for completed Spieltag ${previousMatchday}`);
        } catch (error) {
          logger.warn({ error, previousMatchday }, 'Failed to invalidate cache for previous matchday');
        }
        
        // Update state
        const newState: MatchdayState = {
          ...currentState,
          currentMatchday: detectedMatchday,
          lastUpdate: new Date().toISOString(),
          lastChecked: new Date().toISOString()
        };
        
        await this.saveMatchdayState(newState);
        
        // Create snapshot for new matchday
        await this.createMatchdaySnapshot(detectedMatchday);
        
        logger.info({
          previousMatchday,
          newMatchday: detectedMatchday
        }, 'New matchday detected and updated');
        
        return {
          hasNewMatchday: true,
          currentMatchday: detectedMatchday,
          previousMatchday
        };
      }
      
      // Update last checked time
      const updatedState: MatchdayState = {
        ...currentState,
        lastChecked: new Date().toISOString()
      };
      
      await this.saveMatchdayState(updatedState);
      
      return {
        hasNewMatchday: false,
        currentMatchday: currentState.currentMatchday
      };
      
    } catch (error) {
      logger.error({ error }, 'Failed to check and update matchday');
      throw error;
    }
  }

  /**
   * Detect current matchday based on completed matches
   * Current matchday = highest matchday where ALL matches are finished
   */
  private async detectCurrentMatchday(): Promise<number> {
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

  /**
   * Create a snapshot of current season data for a specific matchday
   */
  async createMatchdaySnapshot(matchday: number): Promise<MatchdayData> {
    try {
      await this.ensureDirectories();
      
      // Fetch current season data
      const seasonData = await enhancedKickbaseClient.getCurrentSeasonData();
      
      const timestamp = new Date().toISOString();
      const matchdayData: MatchdayData = {
        matchday,
        timestamp,
        players: seasonData.players,
        matches: seasonData.matches,
        config: seasonData.config,
        metadata: {
          playersCount: seasonData.players.length,
          matchesCount: seasonData.matches.length,
          source: 'kickbase_api'
        }
      };
      
      // Save snapshot to file
      const filename = `matchday-${matchday}-${timestamp.split('T')[0]}.json`;
      const filePath = path.join(this.snapshotsDir, filename);
      await fs.writeFile(filePath, JSON.stringify(matchdayData, null, 2));
      
      // Update snapshots index
      await this.updateSnapshotsIndex({
        matchday,
        timestamp,
        playersCount: seasonData.players.length,
        dataPath: filePath
      });
      
      // Update player performance history
      await this.updatePlayerPerformanceHistory(matchday, seasonData.players);
      
      logger.info({
        matchday,
        playersCount: seasonData.players.length,
        filename
      }, 'Matchday snapshot created');
      
      return matchdayData;
      
    } catch (error) {
      logger.error({ error, matchday }, 'Failed to create matchday snapshot');
      throw error;
    }
  }

  /**
   * Update player performance history with new matchday data
   */
  private async updatePlayerPerformanceHistory(matchday: number, players: Player[]): Promise<void> {
    try {
      await this.ensureDirectories();
      
      for (const player of players) {
        const performanceEntry: PlayerPerformanceEntry = {
          matchday,
          points: player.punkte_sum || 0,
          marketValue: player.marketValue || 0,
          goals: player.goals || 0,
          assists: player.assists || 0,
          minutesPlayed: player.minutesPlayed || 0,
          timestamp: new Date().toISOString()
        };
        
        // Load existing performance data for this player
        const playerPerformanceFile = path.join(this.performanceDir, `${player.id}.json`);
        let performanceHistory: PlayerPerformanceEntry[] = [];
        
        try {
          const existingData = await fs.readFile(playerPerformanceFile, 'utf-8');
          performanceHistory = JSON.parse(existingData);
        } catch (error) {
          // File doesn't exist, start with empty array
        }
        
        // Add new entry (avoid duplicates)
        const existingEntry = performanceHistory.find(entry => entry.matchday === matchday);
        if (!existingEntry) {
          performanceHistory.push(performanceEntry);
          
          // Keep only last 50 matchdays to prevent unlimited growth
          performanceHistory = performanceHistory.slice(-50);
          
          // Save updated performance history
          await fs.writeFile(playerPerformanceFile, JSON.stringify(performanceHistory, null, 2));
        }
      }
      
      logger.info({
        matchday,
        playersUpdated: players.length
      }, 'Player performance history updated');
      
    } catch (error) {
      logger.error({ error, matchday }, 'Failed to update player performance history');
      throw error;
    }
  }

  /**
   * Get player performance history
   */
  async getPlayerPerformanceHistory(playerId: string): Promise<PlayerPerformanceEntry[]> {
    try {
      const playerPerformanceFile = path.join(this.performanceDir, `${playerId}.json`);
      const data = await fs.readFile(playerPerformanceFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Return empty array if file doesn't exist
      return [];
    }
  }

  /**
   * Update snapshots index
   */
  private async updateSnapshotsIndex(snapshot: {
    matchday: number;
    timestamp: string;
    playersCount: number;
    dataPath: string;
  }): Promise<void> {
    try {
      let snapshots: any[] = [];
      
      try {
        const data = await fs.readFile(this.indexFile, 'utf-8');
        snapshots = JSON.parse(data);
      } catch (error) {
        // File doesn't exist, start with empty array
      }
      
      // Add new snapshot
      snapshots.push(snapshot);
      
      // Keep only last 50 snapshots
      snapshots = snapshots.slice(-50);
      
      // Save updated index
      await fs.writeFile(this.indexFile, JSON.stringify(snapshots, null, 2));
      
    } catch (error) {
      logger.error({ error }, 'Failed to update snapshots index');
      throw error;
    }
  }

  /**
   * Get all snapshots
   */
  async getSnapshots(): Promise<any[]> {
    try {
      const data = await fs.readFile(this.indexFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get matchday data by matchday number
   */
  async getMatchdayData(matchday: number): Promise<MatchdayData | null> {
    try {
      const snapshots = await this.getSnapshots();
      const snapshot = snapshots.find(s => s.matchday === matchday);
      
      if (!snapshot) {
        return null;
      }
      
      const data = await fs.readFile(snapshot.dataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.error({ error, matchday }, 'Failed to get matchday data');
      return null;
    }
  }
}

// Export singleton instance
export const matchdayService = new MatchdayService();
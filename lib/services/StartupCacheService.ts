import { kickbaseDataCache } from './KickbaseDataCacheService';
import { ImageCacheService } from './ImageCacheService';
import { TeamLogoCacheService } from './TeamLogoCacheService';
import { KickbaseAdapter } from '../adapters/KickbaseAdapter';
import pino from 'pino';

// Minimized log level for better performance
const logger = pino({ 
  name: 'StartupCacheService',
  level: 'warn' // Only show warnings and errors
});

/**
 * Service for warming up caches on server startup
 * Preloads essential data to ensure optimal performance
 */
export class StartupCacheService {
  private imageCache: ImageCacheService;
  private teamLogoCache: TeamLogoCacheService;
  private kickbaseAdapter: KickbaseAdapter;
  
  private isWarming = false;
  private warmupProgress = {
    total: 0,
    completed: 0,
    currentTask: '',
    errors: [] as string[]
  };

  constructor() {
    this.imageCache = new ImageCacheService();
    this.teamLogoCache = new TeamLogoCacheService();
    this.kickbaseAdapter = new KickbaseAdapter(
      process.env.KICKBASE_API_URL || 'https://api.kickbase.com',
      process.env.KICKBASE_API_KEY || ''
    );
  }

  /**
   * Get current warmup progress
   */
  getWarmupProgress() {
    return {
      ...this.warmupProgress,
      isWarming: this.isWarming,
      percentage: this.warmupProgress.total > 0 
        ? Math.round((this.warmupProgress.completed / this.warmupProgress.total) * 100)
        : 0
    };
  }

  /**
   * Start comprehensive cache warmup
   */
  async startWarmup(config: {
    includeAllPlayers?: boolean;
    includePlayerDetails?: boolean;
    includeTeamLogos?: boolean;
    includeComprehensivePlayerData?: boolean;
    currentSpieltag?: number;
  } = {}): Promise<{
    success: boolean;
    duration: number;
    results: {
      allPlayers: number;
      playerDetails: number;
      teamLogos: number;
      matches: number;
      comprehensivePlayerData?: number;
    };
    errors: string[];
  }> {
    if (this.isWarming) {
      throw new Error('Cache warmup is already in progress');
    }

    this.isWarming = true;
    const startTime = Date.now();
    const results = {
      allPlayers: 0,
      playerDetails: 0,
      teamLogos: 0,
      matches: 0,
      comprehensivePlayerData: 0
    };

    // Calculate total tasks
    let totalTasks = 0;
    if (config.includeAllPlayers !== false) totalTasks += 1;
    if (config.includeTeamLogos !== false) totalTasks += 18; // 18 Bundesliga teams
    if (config.currentSpieltag) totalTasks += 1;
    if (config.includePlayerDetails) totalTasks += 50; // Top 50 players
    if (config.includeComprehensivePlayerData) totalTasks += 469; // All 469 players

    this.warmupProgress = {
      total: totalTasks,
      completed: 0,
      currentTask: 'Starting warmup...',
      errors: []
    };

    try {
      // 1. Warm up all players data (SpielerSelectionOverview)
      if (config.includeAllPlayers !== false) {
        await this.warmupAllPlayers(results);
      }

      // 2. Warm up team logos
      if (config.includeTeamLogos !== false) {
        await this.warmupTeamLogos(results);
      }

      // 3. Warm up current spieltag matches
      if (config.currentSpieltag) {
        await this.warmupMatches(config.currentSpieltag, results);
      }

      // 4. Warm up popular player details
      if (config.includePlayerDetails) {
        await this.warmupPlayerDetails(results);
      }

      // 5. Warm up comprehensive player data
      if (config.includeComprehensivePlayerData) {
        await this.warmupComprehensivePlayerData(results);
      }

      logger.info('Cache warmup completed successfully', { 
        duration: Date.now() - startTime,
        results 
      });

      return {
        success: true,
        duration: Date.now() - startTime,
        results,
        errors: this.warmupProgress.errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.warmupProgress.errors.push(errorMessage);
      logger.error('Cache warmup failed', { error: errorMessage });

      return {
        success: false,
        duration: Date.now() - startTime,
        results,
        errors: this.warmupProgress.errors
      };
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm up all players data
   */
  private async warmupAllPlayers(results: any): Promise<void> {
    this.warmupProgress.currentTask = 'Loading all players...';
    
    try {
      // Check if already cached
      const cached = await kickbaseDataCache.getCachedAllPlayers('bundesliga');
      if (cached) {
        // Report the count of cached players
        results.allPlayers = cached.players?.length || 0;
        logger.debug(`All players already cached (${results.allPlayers} players), skipping fetch`);
        this.warmupProgress.completed++;
        return;
      }

      // Fetch all players from API (using getAllPlayersFromTeamsOptimized method to get all 469 players)
      const players = await this.kickbaseAdapter.getAllPlayersFromTeamsOptimized(); // Get ALL players from ALL teams using optimized method
      
      const allPlayersData = {
        players,
        lastUpdated: new Date().toISOString(),
        competitionId: 'bundesliga'
      };

      await kickbaseDataCache.cacheAllPlayers('bundesliga', allPlayersData);
      results.allPlayers = players.length;
      
      logger.debug(`Cached ${players.length} players`);
    } catch (error) {
      const errorMsg = `Failed to warm up all players: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.warmupProgress.errors.push(errorMsg);
      logger.warn(errorMsg);
    }
    
    this.warmupProgress.completed++;
  }

  /**
   * Warm up team logos
   */
  private async warmupTeamLogos(results: any): Promise<void> {
    this.warmupProgress.currentTask = 'Loading team logos...';
    
    const teamIds = [
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 
      '11', '12', '13', '14', '15', '16', '17', '18'
    ]; // Bundesliga team IDs as strings

    for (const teamId of teamIds) {
      try {
        await this.teamLogoCache.cacheTeamLogo(teamId.toString(), `Team ${teamId}`, `https://api.kickbase.com/teams/${teamId}/logo`);
        results.teamLogos++;
      } catch (error) {
        const errorMsg = `Failed to cache logo for team ${teamId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        this.warmupProgress.errors.push(errorMsg);
        logger.warn(errorMsg);
      }
      this.warmupProgress.completed++;
    }
  }

  /**
   * Warm up matches for current spieltag
   */
  private async warmupMatches(spieltag: number, results: any): Promise<void> {
    this.warmupProgress.currentTask = `Loading matches for Spieltag ${spieltag}...`;
    
    try {
      // Check if already cached
      const cached = await kickbaseDataCache.getCachedMatches(spieltag);
      if (cached) {
        // Report the count of cached matches
        results.matches = Array.isArray(cached) ? cached.length : 0;
        logger.debug(`Matches for Spieltag ${spieltag} already cached (${results.matches} matches), skipping fetch`);
        this.warmupProgress.completed++;
        return;
      }

      // Fetch matches from API
      const matches = await this.kickbaseAdapter.getMatches(spieltag);
      await kickbaseDataCache.cacheMatches(spieltag, matches);
      results.matches = matches.length;
      
      logger.debug(`Cached ${matches.length} matches for Spieltag ${spieltag}`);
    } catch (error) {
      const errorMsg = `Failed to warm up matches: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.warmupProgress.errors.push(errorMsg);
      logger.warn(errorMsg);
    }
    
    this.warmupProgress.completed++;
  }

  /**
   * Warm up popular player details
   */
  private async warmupPlayerDetails(results: any): Promise<void> {
    this.warmupProgress.currentTask = 'Loading popular player details...';
    
    try {
      // Get top players (this would need to be implemented in KickbaseAdapter)
      // For now, we'll simulate with some popular player IDs
      const popularPlayerIds = [
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
        '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
        '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
        '31', '32', '33', '34', '35', '36', '37', '38', '39', '40',
        '41', '42', '43', '44', '45', '46', '47', '48', '49', '50'
      ];

      for (const playerId of popularPlayerIds) {
        try {
          // Check if already cached
          const cached = await kickbaseDataCache.getCachedPlayerDetails(playerId);
          if (cached) {
            // Count cached player details
            results.playerDetails++;
            this.warmupProgress.completed++;
            continue;
          }

          // Fetch player details
          const playerDetails = await this.kickbaseAdapter.getPlayerDetails(playerId);
          await kickbaseDataCache.cachePlayerDetails(playerId, playerDetails);
          results.playerDetails++;
          
        } catch (error) {
          const errorMsg = `Failed to cache details for player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.warmupProgress.errors.push(errorMsg);
          logger.warn(errorMsg);
        }
        
        this.warmupProgress.completed++;
      }
    } catch (error) {
      const errorMsg = `Failed to warm up player details: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.warmupProgress.errors.push(errorMsg);
      logger.warn(errorMsg);
    }
  }

  /**
   * Warm up comprehensive player data for all 469 players
   * This includes player details, performance data, and performance history
   */
  private async warmupComprehensivePlayerData(results: any): Promise<void> {
    this.warmupProgress.currentTask = 'Loading comprehensive player data for all 469 players...';
    
    try {
      // First, get all players to get their IDs
      const allPlayersData = await kickbaseDataCache.getCachedAllPlayers('bundesliga');
      let allPlayers: any[] = [];
      
      if (allPlayersData && allPlayersData.players) {
        allPlayers = allPlayersData.players;
      } else {
        // If not cached, fetch ALL players from ALL teams (not just current matchday)
        allPlayers = await this.kickbaseAdapter.getAllPlayersFromTeamsOptimized();
        // Cache the all players data
        await kickbaseDataCache.cacheAllPlayers('bundesliga', {
          players: allPlayers,
          lastUpdated: new Date().toISOString(),
          competitionId: 'bundesliga'
        });
      }

      logger.info(`Starting comprehensive caching for ${allPlayers.length} players`);

      // Process players in batches to avoid overwhelming the API
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < allPlayers.length; i += batchSize) {
        batches.push(allPlayers.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        await Promise.all(batch.map(async (player: any) => {
          const playerId = player.id?.toString();
          if (!playerId) {
            this.warmupProgress.completed++;
            return;
          }

          try {
            // Update progress message
            this.warmupProgress.currentTask = `Caching player ${player.firstName} ${player.lastName} (${playerId})...`;

            // 1. Cache player details if not already cached
            const cachedDetails = await kickbaseDataCache.getCachedPlayerDetails(playerId);
            if (!cachedDetails) {
              try {
                const playerDetails = await this.kickbaseAdapter.getPlayerDetails(playerId);
                if (playerDetails) {
                  await kickbaseDataCache.cachePlayerDetails(playerId, playerDetails);
                }
              } catch (detailsError) {
                logger.debug(`Could not fetch details for player ${playerId}: ${detailsError instanceof Error ? detailsError.message : 'Unknown error'}`);
              }
            }

            // 2. Cache player performance data if not already cached
            const cachedPerformance = await kickbaseDataCache.getCachedPlayerPerformance(playerId);
            if (!cachedPerformance) {
              try {
                const performanceData = await this.kickbaseAdapter.getPlayerPerformance(playerId);
                if (performanceData) {
                  // Transform the data to match our interface
                  const transformedData = {
                    playerId,
                    matches: performanceData.it || [],
                    totalPoints: performanceData.totalPoints || 0,
                    totalMinutes: performanceData.totalMinutes || 0,
                    averagePoints: performanceData.averagePoints || 0,
                    actualAppearances: performanceData.actualAppearances || 0,
                    start11Count: performanceData.start11Count || 0,
                    currentMatchday: 5
                  };
                  await kickbaseDataCache.cachePlayerPerformance(playerId, transformedData);
                }
              } catch (performanceError) {
                logger.debug(`Could not fetch performance for player ${playerId}: ${performanceError instanceof Error ? performanceError.message : 'Unknown error'}`);
              }
            }

            // 3. Cache player performance history if not already cached
            const cachedHistory = await kickbaseDataCache.getCachedPlayerPerformanceHistory(playerId);
            if (!cachedHistory) {
              try {
                // Use the same performance data for history (they're similar)
                const historyData = await this.kickbaseAdapter.getPlayerPerformance(playerId);
                if (historyData) {
                  await kickbaseDataCache.cachePlayerPerformanceHistory(playerId, historyData);
                }
              } catch (historyError) {
                logger.debug(`Could not fetch history for player ${playerId}: ${historyError instanceof Error ? historyError.message : 'Unknown error'}`);
              }
            }

            results.comprehensivePlayerData++;
            
          } catch (error) {
            const errorMsg = `Failed to cache comprehensive data for player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            this.warmupProgress.errors.push(errorMsg);
            logger.warn(errorMsg);
          }
          
          this.warmupProgress.completed++;
        }));

        // Small delay between batches to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info(`Comprehensive player data caching completed for ${results.comprehensivePlayerData} players`);
      
    } catch (error) {
      const errorMsg = `Failed to warm up comprehensive player data: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.warmupProgress.errors.push(errorMsg);
      logger.warn(errorMsg);
    }
  }

  /**
   * Check if warmup is recommended
   */
  async isWarmupRecommended(): Promise<{
    recommended: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    // Check if all players are cached
    const allPlayers = await kickbaseDataCache.getCachedAllPlayers('bundesliga');
    if (!allPlayers) {
      reasons.push('All players data not cached');
    }

    // Check team logos
    const logoStats = this.teamLogoCache.getStats();
    if (logoStats.totalEntries < 18) {
      reasons.push('Team logos incomplete');
    }

    // Check if any data exists
    const dataStats = kickbaseDataCache.getStats();
    if (dataStats.totalEntries === 0) {
      reasons.push('No cached data found');
    }

    return {
      recommended: reasons.length > 0,
      reasons
    };
  }
}

// Export singleton instance
export const startupCacheService = new StartupCacheService();
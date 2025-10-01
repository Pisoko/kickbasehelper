import { CacheService } from './CacheService';
import type { Player, Match, Odds } from '../types';
import pino from 'pino';
import path from 'path';

const logger = pino({ 
  name: 'KickbaseDataCacheService',
  level: 'debug' // Temporarily enable debug logs
});

/**
 * Player performance data interface for detailed caching
 */
interface PlayerPerformanceData {
  playerId: string;
  matches: any[];
  totalPoints: number;
  totalMinutes: number;
  averagePoints: number;
  actualAppearances: number;
  start11Count: number;
  currentMatchday: number;
  statistics?: {
    actualAppearances: number;
    start11Count: number;
    totalMinutes: number;
    totalPoints: number;
  };
}

/**
 * All players data interface for complete player list caching
 */
interface AllPlayersData {
  players: Player[];
  lastUpdated: string;
  competitionId: string;
}

export interface KickbaseDataEntry {
  data: any;
  endpoint: string;
  timestamp: number;
  ttl: number;
  etag?: string;
  lastModified?: string;
}

/**
 * Specialized cache service for Kickbase API data
 * Handles caching of players, matches, player details, and performance data
 */
class KickbaseDataCacheService extends CacheService {
  // Cache TTL settings (in seconds)
  private readonly PLAYER_TTL = 86400; // 24 hours
  private readonly MATCH_TTL = 1800;   // 30 minutes
  private readonly PLAYER_DETAILS_TTL = 86400; // 24 hours
  private readonly ALL_PLAYERS_TTL = 86400;    // 24 hours
  private readonly PERFORMANCE_TTL = 86400;    // 24 hours
  private readonly ODDS_TTL = 3600 * 1000;    // 1 hour in milliseconds
  
  constructor() {
    super({
      baseDir: path.join(process.cwd(), 'cache', 'kickbase-data'),
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours default
      maxSize: 2000,
      cleanupInterval: 60 * 60 * 1000 // 1 hour cleanup
    });
  }

  /**
   * Cache players data with specific TTL
   */
  async cachePlayers(spieltag: number, players: Player[], ttl?: number): Promise<void> {
    const key = `players_spieltag_${spieltag}`;
    const playerTTL = ttl || 2 * 60 * 60 * 1000; // 2 hours for player data
    
    await this.set(key, {
      players,
      spieltag,
      updatedAt: new Date().toISOString(),
      cacheAgeDays: 0
    }, playerTTL);
    
    logger.info(`Cached ${players.length} players for Spieltag ${spieltag}`);
  }

  /**
   * Get cached players data
   */
  async getCachedPlayers(spieltag: number): Promise<{
    players: Player[];
    spieltag: number;
    updatedAt: string;
    cacheAgeDays: number;
  } | null> {
    const key = `players_spieltag_${spieltag}`;
    const cached = await this.get<{
      players: Player[];
      spieltag: number;
      updatedAt: string;
      cacheAgeDays: number;
    }>(key);
    
    if (cached) {
      logger.debug(`Retrieved cached players for Spieltag ${spieltag}`);
      return cached;
    }
    
    return null;
  }

  /**
   * Cache matches data
   */
  async cacheMatches(spieltag: number, matches: Match[], ttl?: number): Promise<void> {
    const key = `matches_spieltag_${spieltag}`;
    const matchTTL = ttl || 30 * 60 * 1000; // 30 minutes for match data (more dynamic)
    
    await this.set(key, {
      matches,
      spieltag,
      updatedAt: new Date().toISOString()
    }, matchTTL);
    
    logger.info(`Cached ${matches.length} matches for Spieltag ${spieltag}`);
  }

  /**
   * Get cached matches data
   */
  async getCachedMatches(spieltag: number): Promise<{
    matches: Match[];
    spieltag: number;
    updatedAt: string;
  } | null> {
    const key = `matches_spieltag_${spieltag}`;
    const cached = await this.get<{
      matches: Match[];
      spieltag: number;
      updatedAt: string;
    }>(key);
    
    if (cached) {
      logger.debug(`Retrieved cached matches for Spieltag ${spieltag}`);
      return cached;
    }
    
    return null;
  }

  /**
   * Cache team data
   */
  async cacheTeamData(teamId: string, teamData: any, ttl?: number): Promise<void> {
    const key = `team_${teamId}`;
    const teamTTL = ttl || 24 * 60 * 60 * 1000; // 24 hours for team data
    
    await this.set(key, teamData, teamTTL);
    logger.debug(`Cached team data for team ${teamId}`);
  }

  /**
   * Get cached team data
   */
  async getCachedTeamData(teamId: string): Promise<any | null> {
    const key = `team_${teamId}`;
    return await this.get(key);
  }

  /**
   * Cache league data
   */
  async cacheLeagueData(leagueId: string, leagueData: any, ttl?: number): Promise<void> {
    const key = `league_${leagueId}`;
    const leagueTTL = ttl || 6 * 60 * 60 * 1000; // 6 hours for league data
    
    await this.set(key, leagueData, leagueTTL);
    logger.debug(`Cached league data for league ${leagueId}`);
  }

  /**
   * Get cached league data
   */
  async getCachedLeagueData(leagueId: string): Promise<any | null> {
    const key = `league_${leagueId}`;
    return await this.get(key);
  }

  /**
   * Cache API response with HTTP headers
   */
  async cacheApiResponse(
    endpoint: string, 
    data: any, 
    headers?: { etag?: string; lastModified?: string },
    ttl?: number
  ): Promise<void> {
    const key = `api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    const cacheEntry: KickbaseDataEntry = {
      data,
      endpoint,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      etag: headers?.etag,
      lastModified: headers?.lastModified
    };
    
    await this.set(key, cacheEntry, ttl);
    logger.debug(`Cached API response for endpoint: ${endpoint}`);
  }

  /**
   * Get cached API response
   */
  async getCachedApiResponse(endpoint: string): Promise<KickbaseDataEntry | null> {
    const key = `api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
    return await this.get(key);
  }

  /**
   * Cache player details (for SpielerDetailPage)
   */
  async cachePlayerDetails(playerId: string, playerData: any): Promise<void> {
    const key = `player_details_${playerId}`;
    await this.set(key, playerData, this.PLAYER_DETAILS_TTL * 1000);
    logger.debug(`Cached player details for player ${playerId}`);
  }

  /**
   * Get cached player details
   */
  async getCachedPlayerDetails(playerId: string): Promise<any | null> {
    const key = `player_details_${playerId}`;
    return await this.get(key);
  }

  /**
   * Cache player performance data
   */
  async cachePlayerPerformance(playerId: string, performanceData: PlayerPerformanceData): Promise<void> {
    const key = `player_performance_${playerId}`;
    await this.set(key, performanceData, this.PERFORMANCE_TTL * 1000);
    logger.debug(`Cached performance data for player ${playerId}`);
  }

  /**
   * Get cached player performance data
   */
  async getCachedPlayerPerformance(playerId: string): Promise<PlayerPerformanceData | null> {
    const key = `player_performance_${playerId}`;
    return await this.get<PlayerPerformanceData>(key);
  }

  /**
   * Cache all players data (for SpielerSelectionOverview)
   */
  async cacheAllPlayers(competitionId: string, playersData: AllPlayersData): Promise<void> {
    const key = `all_players_${competitionId}`;
    await this.set(key, playersData, this.ALL_PLAYERS_TTL * 1000);
    logger.debug(`Cached all players data for competition ${competitionId}`);
  }

  /**
   * Get cached all players data
   */
  async getCachedAllPlayers(competitionId: string): Promise<AllPlayersData | null> {
    const key = `all_players_${competitionId}`;
    return await this.get<AllPlayersData>(key);
  }

  /**
   * Cache player performance history
   */
  async cachePlayerPerformanceHistory(playerId: string, historyData: any): Promise<void> {
    const key = `player_history_${playerId}`;
    await this.set(key, historyData, this.PERFORMANCE_TTL * 1000);
    logger.debug(`Cached performance history for player ${playerId}`);
  }

  /**
   * Get cached player performance history
   */
  async getCachedPlayerPerformanceHistory(playerId: string): Promise<any | null> {
    const key = `player_history_${playerId}`;
    return await this.get(key);
  }

  /**
   * Cache odds for a specific matchday
   */
  async cacheOdds(spieltag: number, odds: Odds[], ttl?: number): Promise<void> {
    const key = `odds:${spieltag}`;
    const cacheData = {
      odds,
      spieltag,
      updatedAt: new Date().toISOString()
    };
    await this.set(key, cacheData, ttl || this.ODDS_TTL);
    logger.info(`Cached odds for Spieltag ${spieltag}: ${odds.length} odds entries`);
  }

  /**
   * Get cached odds for a specific matchday
   */
  async getCachedOdds(spieltag: number): Promise<{
    odds: Odds[];
    spieltag: number;
    updatedAt: string;
  } | null> {
    const key = `odds:${spieltag}`;
    const cached = await this.get(key) as {
      odds: Odds[];
      spieltag: number;
      updatedAt: string;
    } | null;
    if (cached) {
      logger.info(`Retrieved cached odds for Spieltag ${spieltag}: ${cached.odds.length} odds entries`);
      return cached;
    }
    return null;
  }

  /**
   * Cache odds for specific matches
   */
  async cacheMatchOdds(matchIds: string[], odds: Odds[], ttl?: number): Promise<void> {
    const cacheData = {
      odds,
      matchIds,
      updatedAt: new Date().toISOString()
    };
    
    // Cache by individual match IDs for granular access
    for (const odd of odds) {
      const key = `match_odds:${odd.matchId}`;
      await this.set(key, odd, ttl || this.ODDS_TTL);
    }
    
    // Also cache as a batch for the specific match set
    const batchKey = `batch_odds:${matchIds.sort().join(',')}`;
    await this.set(batchKey, cacheData, ttl || this.ODDS_TTL);
    
    logger.info(`Cached odds for ${matchIds.length} matches`);
  }

  /**
   * Get cached odds for specific matches
   */
  async getCachedMatchOdds(matchIds: string[]): Promise<Odds[]> {
    const odds: Odds[] = [];
    
    for (const matchId of matchIds) {
      const key = `match_odds:${matchId}`;
      const cached = await this.get(key) as Odds | null;
      if (cached) {
        odds.push(cached);
      }
    }
    
    if (odds.length > 0) {
      logger.info(`Retrieved cached odds for ${odds.length}/${matchIds.length} matches`);
    }
    
    return odds;
  }

  /**
   * Warm up cache with essential data
   */
  async warmupCache(spieltag: number): Promise<void> {
    logger.info(`Starting cache warmup for Spieltag ${spieltag}`);
    
    try {
      // This would typically fetch data from the Kickbase API
      // For now, we'll just log the warmup process
      logger.info('Cache warmup would fetch:');
      logger.info(`- Players for Spieltag ${spieltag}`);
      logger.info(`- Matches for Spieltag ${spieltag}`);
      logger.info('- Team data for all Bundesliga teams');
      logger.info('- League configurations');
      
      // TODO: Implement actual data fetching and caching
      // const players = await kickbaseClient.getPlayers(spieltag);
      // await this.cachePlayers(spieltag, players);
      
      logger.info('Cache warmup completed');
    } catch (error) {
      logger.error('Cache warmup failed:', error);
    }
  }

  /**
   * Invalidate cache for specific spieltag
   */
  async invalidateSpieltagCache(spieltag: number): Promise<void> {
    const keys = [
      `players_spieltag_${spieltag}`,
      `matches_spieltag_${spieltag}`
    ];
    
    for (const key of keys) {
      await this.delete(key);
    }
    
    logger.info(`Invalidated cache for Spieltag ${spieltag}`);
  }

  /**
   * Get cache health status
   */
  async getCacheHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    stats: any;
    issues: string[];
  }> {
    const stats = this.getStats();
    const issues: string[] = [];
    
    // Check for potential issues
    if (stats.totalEntries === 0) {
      issues.push('Cache is empty');
    }
    
    if (stats.memorySize > (this.config.maxSize || 1000) * 0.9) {
      issues.push('Memory cache near capacity');
    }
    
    // Determine overall health
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 0) {
      status = issues.length > 2 ? 'unhealthy' : 'degraded';
    }
    
    return {
      status,
      stats,
      issues
    };
  }
}

// Singleton instance
export const kickbaseDataCache = new KickbaseDataCacheService();
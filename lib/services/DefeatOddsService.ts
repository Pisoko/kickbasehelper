import { KickbaseAdapter } from '../adapters/KickbaseAdapter';
import { kickbaseDataCache } from './KickbaseDataCacheService';
import { createOddsAdapter } from '../adapters/OddsProvider';
import { kickbaseAuth } from '../adapters/KickbaseAuthService';
import type { Match, Odds } from '../types';
import pino from 'pino';

const logger = pino({ name: 'DefeatOddsService' });

export interface DefeatOdds {
  teamName: string;
  defeatOdd: number;
  matchId: string;
  isHome: boolean; // true if team is playing at home
}

/**
 * Service to handle automatic loading of defeat odds for the upcoming matchday
 */
export class DefeatOddsService {
  private kickbaseAdapter: KickbaseAdapter;

  constructor() {
    const baseUrl = process.env.KICKBASE_BASE || '';
    // KickbaseAdapter will use KickbaseAuthService internally for authentication
    this.kickbaseAdapter = new KickbaseAdapter(baseUrl, '');
  }

  /**
   * Get the current matchday from the season state
   */
  private async getCurrentMatchday(): Promise<number> {
    try {
      // Read from the matchday state file
      const fs = await import('fs/promises');
      const path = await import('path');
      const stateFile = path.join(process.cwd(), 'data', 'matchday-state.json');
      const stateData = await fs.readFile(stateFile, 'utf-8');
      const state = JSON.parse(stateData);
      return state.currentMatchday || 5; // Fallback to 5 if not found
    } catch (error) {
      logger.warn('Could not read matchday state, using fallback', { error });
      return 5; // Fallback to current matchday 5
    }
  }

  /**
   * Get the upcoming matchday (current + 1)
   */
  private async getUpcomingMatchday(): Promise<number> {
    const currentMatchday = await this.getCurrentMatchday();
    return currentMatchday + 1;
  }

  /**
   * Get matches for the upcoming matchday with caching
   */
  private async getUpcomingMatches(): Promise<Match[]> {
    const upcomingMatchday = await this.getUpcomingMatchday();
    
    // Try to get from cache first
    const cachedData = await kickbaseDataCache.getCachedMatches(upcomingMatchday);
    if (cachedData && cachedData.matches) {
      logger.info(`Using cached matches for matchday ${upcomingMatchday}`);
      return cachedData.matches;
    }

    // Fetch from API if not cached
    try {
      const matches = await this.kickbaseAdapter.getMatches(upcomingMatchday);
      
      // Cache the matches
      await kickbaseDataCache.cacheMatches(upcomingMatchday, matches);
      
      logger.info(`Fetched and cached ${matches.length} matches for matchday ${upcomingMatchday}`);
      return matches;
    } catch (error) {
      logger.error('Failed to fetch upcoming matches', { error, matchday: upcomingMatchday });
      return [];
    }
  }

  /**
   * Get odds for the upcoming matchday
   */
  private async getUpcomingOdds(): Promise<Odds[]> {
    try {
      const upcomingMatchday = await this.getUpcomingMatchday();
      
      // Try to get from cache first
      const cachedOdds = await kickbaseDataCache.getCachedOdds(upcomingMatchday);
      if (cachedOdds) {
        logger.info({ matchday: upcomingMatchday, oddsCount: cachedOdds.odds.length }, 'Using cached odds for upcoming matchday');
        return cachedOdds.odds;
      }

      // If not in cache, fetch from external provider
      const matches = await this.getUpcomingMatches();
      if (matches.length === 0) {
        logger.warn({ matchday: upcomingMatchday }, 'No matches found for upcoming matchday');
        return [];
      }

      const provider = (process.env.ODDS_PROVIDER as any) || 'none';
      const apiKey = process.env.ODDS_API_KEY;
      const oddsAdapter = await createOddsAdapter(provider, apiKey);
      const odds = await oddsAdapter.fetchOdds(matches);
      
      // Cache the odds
      if (odds.length > 0) {
        await kickbaseDataCache.cacheOdds(upcomingMatchday, odds);
        logger.info({ matchday: upcomingMatchday, oddsCount: odds.length }, 'Cached odds for upcoming matchday');
      }

      return odds;

    } catch (error) {
      logger.error({ error }, 'Failed to get upcoming odds');
      return [];
    }
  }

  /**
   * Extract defeat odds for all teams in the upcoming matchday
   * Defeat odds = auswaerts for home team, heim for away team
   */
  async getDefeatOddsForUpcomingMatchday(): Promise<DefeatOdds[]> {
    try {
      const matches = await this.getUpcomingMatches();
      const odds = await this.getUpcomingOdds();

      if (matches.length === 0 || odds.length === 0) {
        logger.warn('No matches or odds available for defeat odds calculation');
        return [];
      }

      const defeatOdds: DefeatOdds[] = [];

      // Create a map of matchId to odds for quick lookup
      const oddsMap = new Map<string, Odds>();
      odds.forEach(odd => oddsMap.set(odd.matchId, odd));

      // Extract defeat odds for each team
      matches.forEach(match => {
        const matchOdds = oddsMap.get(match.id);
        if (!matchOdds) {
          logger.warn({ matchId: match.id }, 'No odds found for match');
          return;
        }

        // Home team defeat odds = away team win odds (auswaerts)
        defeatOdds.push({
          teamName: match.heim,
          defeatOdd: matchOdds.auswaerts,
          matchId: match.id,
          isHome: true
        });

        // Away team defeat odds = home team win odds (heim)
        defeatOdds.push({
          teamName: match.auswaerts,
          defeatOdd: matchOdds.heim,
          matchId: match.id,
          isHome: false
        });
      });

      logger.info({ 
        matchday: await this.getUpcomingMatchday(),
        teamsCount: defeatOdds.length,
        matchesCount: matches.length 
      }, 'Successfully extracted defeat odds for upcoming matchday');

      return defeatOdds;

    } catch (error) {
      logger.error({ error }, 'Failed to get defeat odds for upcoming matchday');
      return [];
    }
  }

  /**
   * Convert defeat odds to team odds mapping format
   * Returns a mapping of team name to defeat odd
   */
  async getDefeatOddsMapping(): Promise<Record<string, number>> {
    const defeatOdds = await this.getDefeatOddsForUpcomingMatchday();
    
    const mapping: Record<string, number> = {};
    defeatOdds.forEach(({ teamName, defeatOdd }) => {
      mapping[teamName] = defeatOdd;
    });

    logger.info({ 
      teamsCount: Object.keys(mapping).length,
      teams: Object.keys(mapping)
    }, 'Created defeat odds mapping');

    return mapping;
  }

  /**
   * Get information about the upcoming matchday and available defeat odds
   */
  async getUpcomingMatchdayInfo(): Promise<{
    matchday: number;
    matchesCount: number;
    teamsWithOdds: string[];
    hasOdds: boolean;
  }> {
    const upcomingMatchday = await this.getUpcomingMatchday();
    const matches = await this.getUpcomingMatches();
    const defeatOdds = await this.getDefeatOddsForUpcomingMatchday();
    
    const teamsWithOdds = [...new Set(defeatOdds.map(odd => odd.teamName))];

    return {
      matchday: upcomingMatchday,
      matchesCount: matches.length,
      teamsWithOdds,
      hasOdds: defeatOdds.length > 0
    };
  }
}

// Export singleton instance
export const defeatOddsService = new DefeatOddsService();
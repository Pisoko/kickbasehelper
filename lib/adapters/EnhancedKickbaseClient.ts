import pino from 'pino';
import type { Player, Match } from '../types';

const logger = pino({ name: 'EnhancedKickbaseClient' });

interface KickbaseConfig {
  lis: string; // League start time
  lie: string; // League end time
  cps: CompetitionConfig[];
}

interface CompetitionConfig {
  cpi: string; // Competition ID
  lis: string; // Competition start
  lie: string; // Competition end
  rcn: string; // Region code name
  b: number;   // Base budget
  ntb: number; // New team budget
  tv: number;  // Transfer value
  mds: number; // Match days count
  lpc: number; // Lineup player count
  lts: string[]; // Lineup tactics
}

interface LiveMatch {
  i: string;    // Match ID
  h: string;    // Home team
  a: string;    // Away team
  ko: string;   // Kickoff time
  st: number;   // Status
}

interface KickbasePlayer {
  pi: string;   // Player ID
  n: string;    // Name
  fn?: string;  // First name
  pos: number;  // Position (1=GK, 2=DEF, 3=MID, 4=FWD)
  tid: string;  // Team ID
  p: number;    // Points
  g: number;    // Goals
  a: number;    // Assists
  mt: number;   // Minutes played
  il: boolean;  // Is injured
  st: number;   // Status
  pim?: string; // Player image
  shn?: number; // Jersey number
  y?: number;   // Yellow cards
  r?: number;   // Red cards
}

/**
 * Enhanced Kickbase API Client
 * Implements the official Kickbase API v4 endpoints with proper authentication
 */
export class EnhancedKickbaseClient {
  private readonly baseUrl = 'https://api.kickbase.com';

  /**
   * Make authenticated request to Kickbase API
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    try {
      const apiKey = process.env.KICKBASE_KEY;
      if (!apiKey) {
        throw new Error('KICKBASE_KEY environment variable is not set');
      }
      
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        logger.error({ 
          status: response.status, 
          path,
          statusText: response.statusText 
        }, 'Kickbase API request failed');
        
        throw new Error(`Kickbase API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error({ error, path }, 'Error making Kickbase API request');
      throw error;
    }
  }

  /**
   * Get API configuration (public endpoint)
   */
  async getConfig(): Promise<KickbaseConfig> {
    const response = await fetch(`${this.baseUrl}/v4/config`);
    
    if (!response.ok) {
      throw new Error(`Failed to get config: ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Get available leagues for the authenticated user
   */
  async getLeagues(): Promise<any> {
    return this.request('/v4/leagues/selection');
  }

  /**
   * Get league overview with current standings
   */
  async getLeagueOverview(leagueId: string): Promise<any> {
    return this.request(`/v4/leagues/${leagueId}/overview`);
  }

  /**
   * Get all players from a specific competition
   */
  async getCompetitionPlayers(competitionId: string = '1'): Promise<KickbasePlayer[]> {
    try {
      const data = await this.request<any>(`/v4/competitions/${competitionId}/players`);
      
      if (data && data.it && Array.isArray(data.it)) {
        return data.it;
      }
      
      logger.warn({ competitionId }, 'No players found in competition response');
      return [];
    } catch (error) {
      logger.error({ error, competitionId }, 'Failed to fetch competition players');
      return [];
    }
  }

  /**
   * Get detailed player information
   */
  async getPlayerDetails(playerId: string, competitionId: string = '1'): Promise<any> {
    return this.request(`/v4/competitions/${competitionId}/players/${playerId}`);
  }

  /**
   * Get player performance data
   */
  async getPlayerPerformance(playerId: string, competitionId: string = '1'): Promise<any> {
    return this.request(`/v4/competitions/${competitionId}/players/${playerId}/performance`);
  }

  /**
   * Get player market value history
   */
  async getPlayerMarketValue(playerId: string, competitionId: string = '1'): Promise<any> {
    return this.request(`/v4/competitions/${competitionId}/players/${playerId}/marketvalue`);
  }

  /**
   * Get player CV (Contract Value) from league endpoint
   * The CV field represents the contract value of a player, which is different from market value
   */
  async getPlayerCV(playerId: string, leagueId: string = '7389547'): Promise<{
    playerId: string;
    playerName: string;
    teamName: string;
    cvValue: number;
    marketValue: number;
  } | null> {
    try {
      const data = await this.request<any>(`/v4/leagues/${leagueId}/players/${playerId}`);
      
      if (!data) {
        logger.warn({ playerId, leagueId }, 'No player data received');
        return null;
      }

      const cvValue = data.cv;
      if (cvValue === undefined || cvValue === null) {
        logger.warn({ playerId, availableFields: Object.keys(data) }, 'CV value not found in player data');
        return null;
      }

      const playerName = data.n || `${data.fn || ''} ${data.ln || ''}`.trim();
      const result = {
        playerId,
        playerName,
        teamName: data.tn || 'Unknown Team',
        cvValue,
        marketValue: data.mv || 0
      };

      logger.info({ playerId, cvValue, marketValue: result.marketValue }, 'Successfully retrieved player CV value');
      return result;

    } catch (error) {
      logger.error({ playerId, leagueId, error }, 'Error fetching player CV value');
      return null;
    }
  }

  /**
   * Get live match data
   */
  async getLiveMatches(competitionId: string = '1'): Promise<LiveMatch[]> {
    try {
      const data = await this.request<any>(`/v4/competitions/${competitionId}/live`);
      
      if (data && Array.isArray(data)) {
        return data;
      }
      
      return [];
    } catch (error) {
      logger.error({ error, competitionId }, 'Failed to fetch live matches');
      return [];
    }
  }

  /**
   * Get competition matches for a specific matchday
   */
  async getCompetitionMatches(competitionId: string = '1', matchday?: number): Promise<any> {
    const path = matchday 
      ? `/v4/competitions/${competitionId}/matches?matchday=${matchday}`
      : `/v4/competitions/${competitionId}/matches`;
      
    return this.request(path);
  }

  /**
   * Transform Kickbase player data to our Player interface
   */
  transformPlayer(kickbasePlayer: KickbasePlayer, teamName?: string): Player {
    const positionMap: Record<number, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
      1: 'GK',
      2: 'DEF', 
      3: 'MID',
      4: 'FWD'
    };

    return {
      id: kickbasePlayer.pi,
      name: kickbasePlayer.n,
      firstName: kickbasePlayer.fn,
      position: positionMap[kickbasePlayer.pos] || 'MID',
      verein: teamName || this.getTeamName(kickbasePlayer.tid),
      kosten: 0, // Market value not available in this endpoint
      punkte_hist: [], // Will be populated from performance data
      punkte_avg: 0, // Average points not available in this endpoint
      punkte_sum: kickbasePlayer.p || 0,
      marketValue: 0, // Market value not available in this endpoint
      totalPoints: kickbasePlayer.p || 0,
      averagePoints: 0, // Average points not available in this endpoint
      goals: kickbasePlayer.g || 0,
      assists: kickbasePlayer.a || 0,
      minutesPlayed: kickbasePlayer.mt || 0,
      totalMinutesPlayed: kickbasePlayer.mt || 0,
      appearances: 0, // Appearances not available in this endpoint
      jerseyNumber: kickbasePlayer.shn,
      playerImageUrl: kickbasePlayer.pim,
      isInjured: kickbasePlayer.il || false,
      status: kickbasePlayer.st?.toString() || '0',
      yellowCards: kickbasePlayer.y || 0,
      redCards: kickbasePlayer.r || 0,
    };
  }

  /**
   * Transform live match data to our Match interface
   */
  transformMatch(liveMatch: LiveMatch, spieltag: number): Match {
    return {
      id: liveMatch.i,
      spieltag,
      heim: this.getTeamName(liveMatch.h),
      auswaerts: this.getTeamName(liveMatch.a),
      kickoff: liveMatch.ko,
    };
  }

  /**
   * Get team name from team ID - Legacy IDs for 2025/26 Bundesliga
   */
  private getTeamName(teamId: string): string {
    const teamMap: Record<string, string> = {
      '2': 'Bayern München',         // Bayern (Legacy ID)
      '3': 'Borussia Dortmund',      // Dortmund
      '4': 'Eintracht Frankfurt',    // Frankfurt (Legacy ID)
      '5': 'SC Freiburg',            // Freiburg (Legacy ID)
      '6': 'Hamburger SV',           // Hamburg (Promoted for 2025/26)
      '7': 'Bayer 04 Leverkusen',    // Leverkusen (Legacy ID)
      '8': 'FC Schalke 04',          // Schalke (relegated)
      '9': 'VfB Stuttgart',          // Stuttgart
      '10': 'Werder Bremen',         // Bremen (Legacy ID)
      '11': 'VfL Wolfsburg',         // Wolfsburg (Legacy ID)
      '12': 'TSG Hoffenheim',        // Hoffenheim (Legacy ID)
      '13': 'FC Augsburg',           // Augsburg
      '14': 'VfL Bochum',            // Bochum (relegated)
      '15': 'Borussia Mönchengladbach', // M'gladbach
      '18': 'FSV Mainz 05',          // Mainz
      '28': '1. FC Köln',            // Köln (Promoted for 2025/26)
      '39': 'FC St. Pauli',          // St. Pauli (Promoted for 2025/26)
      '40': '1. FC Union Berlin',    // Union Berlin
      '43': 'RB Leipzig',            // Leipzig (Legacy ID)
      '50': '1. FC Heidenheim'       // Heidenheim (only ID 50)
    } as const;

    return teamMap[teamId] || `Team ${teamId}`;
  }

  /**
   * Get enhanced player data with performance history and CV value
   */
  async getEnhancedPlayerData(playerId: string, competitionId: string = '1', leagueId: string = '7389547'): Promise<Partial<Player>> {
    try {
      const [details, performance, marketValue, cvData] = await Promise.allSettled([
        this.getPlayerDetails(playerId, competitionId),
        this.getPlayerPerformance(playerId, competitionId),
        this.getPlayerMarketValue(playerId, competitionId),
        this.getPlayerCV(playerId, leagueId),
      ]);

      const enhancedData: Partial<Player> = {};

      // Process performance data
      if (performance.status === 'fulfilled' && performance.value) {
        const perfData = performance.value;
        if (perfData.pts && Array.isArray(perfData.pts)) {
          enhancedData.punkte_hist = perfData.pts;
          enhancedData.recentPerformance = perfData.pts.slice(-5); // Last 5 games
        }
        if (perfData.mt && Array.isArray(perfData.mt)) {
          enhancedData.minutes_hist = perfData.mt;
        }
      }

      // Process market value history
      if (marketValue.status === 'fulfilled' && marketValue.value) {
        const mvData = marketValue.value;
        if (mvData.mv && Array.isArray(mvData.mv)) {
          enhancedData.marketValueHistory = mvData.mv;
        }
      }

      // Process CV (Contract Value) data
      logger.info({ 
        playerId, 
        cvDataStatus: cvData.status,
        cvDataValue: cvData.status === 'fulfilled' ? cvData.value : null,
        cvDataReason: cvData.status === 'rejected' ? cvData.reason : null
      }, 'CV data processing debug');
      
      if (cvData.status === 'fulfilled' && cvData.value) {
        const cv = cvData.value;
        enhancedData.cvValue = cv.cvValue;
        enhancedData.marketValue = cv.cvValue; // Use CV as primary market value
        enhancedData.kosten = cv.cvValue; // Use CV for Arena Mode costs
        
        logger.info({ 
          playerId, 
          cvValue: cv.cvValue, 
          playerName: cv.playerName 
        }, 'Enhanced player data with CV value');
      } else {
        logger.warn({ 
          playerId,
          cvDataStatus: cvData.status,
          cvDataReason: cvData.status === 'rejected' ? cvData.reason : 'No CV data'
        }, 'Failed to get CV data for player');
      }

      return enhancedData;
    } catch (error) {
      logger.error({ error, playerId }, 'Failed to get enhanced player data');
      return {};
    }
  }

  /**
   * Get current season data with live updates
   */
  async getCurrentSeasonData(competitionId: string = '1'): Promise<{
    players: Player[];
    matches: Match[];
    config: KickbaseConfig;
  }> {
    try {
      const [config, players, liveMatches] = await Promise.all([
        this.getConfig(),
        this.getCompetitionPlayers(competitionId),
        this.getLiveMatches(competitionId),
      ]);

      const transformedPlayers = players.map(p => this.transformPlayer(p));
      const transformedMatches = liveMatches.map(m => this.transformMatch(m, 1)); // Current matchday

      logger.info({
        playersCount: transformedPlayers.length,
        matchesCount: transformedMatches.length,
      }, 'Retrieved current season data');

      return {
        players: transformedPlayers,
        matches: transformedMatches,
        config,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get current season data');
      throw error;
    }
  }
}

// Export singleton instance
export const enhancedKickbaseClient = new EnhancedKickbaseClient();
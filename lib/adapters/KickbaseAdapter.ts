import pino from 'pino';
import type { Match, Player } from '../types';

const logger = pino({ name: 'KickbaseAdapter' });

interface KickbaseResponse<T> {
  data: T;
}

export class KickbaseAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      }
    });
    if (!res.ok) {
      logger.error({ status: res.status, url }, 'Kickbase Request fehlgeschlagen');
      throw new Error(`Kickbase Request fehlgeschlagen (${res.status})`);
    }
    const json = (await res.json()) as KickbaseResponse<T> | T;
    if ('data' in (json as KickbaseResponse<T>)) {
      return (json as KickbaseResponse<T>).data;
    }
    return json as T;
  }

  async getPlayers(spieltag: number): Promise<Player[]> {
    // Use Bundesliga competition ID (1) and get all players
    // Note: Kickbase API doesn't have matchday-specific player endpoints
    // We get all players and can filter by matchday if needed
    const data = await this.request<any>(`/v4/competitions/1/players`);
    
    // Log raw API response for analysis (first player only)
    if (data && data.it && Array.isArray(data.it) && data.it.length > 0) {
      logger.info({ rawPlayer: data.it[0] }, 'Raw Kickbase player data structure');
    }
    
    // Transform Kickbase API response to our Player interface
    if (data && data.it && Array.isArray(data.it)) {
      const players = data.it.map((player: any) => this.transformPlayer(player));
      
      // Enhance with detailed data for key players (limit to avoid rate limiting)
      const enhancedPlayers = await Promise.all(
        players.slice(0, 50).map(async (player) => {
          try {
            const detailedData = await this.getPlayerDetails(player.id);
            return { ...player, ...detailedData };
          } catch (error) {
            logger.warn({ playerId: player.id, error }, 'Failed to fetch detailed player data');
            return player;
          }
        })
      );
      
      // Return enhanced players + remaining players without enhancement
      return [...enhancedPlayers, ...players.slice(50)];
    }
    
    return [];
  }

  /**
   * Fetch detailed player performance data from Kickbase API
   */
  async getPlayerPerformance(playerId: string): Promise<any> {
    try {
      return await this.request<any>(`/v4/competitions/1/players/${playerId}/performance`);
    } catch (error) {
      logger.warn({ playerId, error }, 'Failed to fetch player performance');
      return null;
    }
  }

  /**
   * Fetch player market value history from Kickbase API
   */
  async getPlayerMarketValue(playerId: string, timeframe: string = 'season'): Promise<any> {
    try {
      return await this.request<any>(`/v4/competitions/1/players/${playerId}/marketvalue/${timeframe}`);
    } catch (error) {
      logger.warn({ playerId, timeframe, error }, 'Failed to fetch player market value');
      return null;
    }
  }

  /**
   * Fetch comprehensive player details including performance and market value
   */
  async getPlayerDetails(playerId: string): Promise<Partial<Player>> {
    const [performance, marketValue] = await Promise.all([
      this.getPlayerPerformance(playerId),
      this.getPlayerMarketValue(playerId, 'season')
    ]);

    const details: Partial<Player> = {};

    // Extract performance data
    if (performance && performance.data) {
      const perfData = performance.data;
      if (perfData.points && Array.isArray(perfData.points)) {
        details.recentPerformance = perfData.points.slice(-5); // Last 5 games
        details.totalPoints = perfData.points.reduce((sum: number, p: number) => sum + p, 0);
        details.averagePoints = details.totalPoints / perfData.points.length;
      }
    }

    // Extract market value data
    if (marketValue && marketValue.data && Array.isArray(marketValue.data)) {
      details.marketValueHistory = marketValue.data.map((mv: any) => mv.value || mv.mv || 0);
      if (details.marketValueHistory.length > 0) {
        details.marketValue = details.marketValueHistory[details.marketValueHistory.length - 1];
      }
    }

    return details;
  }

  private transformPlayer(kickbasePlayer: any): Player {
    // Map Kickbase position numbers to our position strings
    const positionMap: Record<number, Player['position']> = {
      1: 'GK',   // Goalkeeper
      2: 'DEF',  // Defender
      3: 'MID',  // Midfielder
      4: 'FWD'   // Forward
    };

    // Generate mock historical data since Kickbase API doesn't provide this directly
    const currentPoints = kickbasePlayer.p || 0;
    const mockHistory = this.generateMockHistory(currentPoints);

    return {
      id: kickbasePlayer.pi || `unknown-${Date.now()}`,
      name: kickbasePlayer.n || 'Unknown Player',
      position: positionMap[kickbasePlayer.pos] || 'MID',
      verein: this.getTeamName(kickbasePlayer.tid),
      kosten: this.calculateMarketValue(kickbasePlayer), // Market value calculation
      punkte_hist: mockHistory,
      punkte_avg: mockHistory.reduce((a, b) => a + b, 0) / mockHistory.length,
      punkte_sum: mockHistory.reduce((a, b) => a + b, 0),
      minutes_hist: this.generateMockMinutes(),
      goals_hist: this.generateMockGoals(kickbasePlayer.g || 0),
      assists_hist: this.generateMockAssists(kickbasePlayer.a || 0),
      // Enhanced fields from Kickbase API
      minutesPlayed: kickbasePlayer.mt || 0,           // Minutes played in last game (mt field)
      goals: kickbasePlayer.g || 0,                    // Goals scored (last game)
      assists: kickbasePlayer.a || 0,                  // Assists (last game)
      isInjured: kickbasePlayer.il === 1,              // Injury/loan status (1 = injured/loaned)
      status: kickbasePlayer.st?.toString(),           // Player status
      playerImageUrl: kickbasePlayer.pim,              // Player image URL
      totalPoints: currentPoints,                      // Current season points
      averagePoints: currentPoints > 0 ? currentPoints / Math.max(1, mockHistory.length) : 0,
      // Market value will be populated by enhanced API calls in getPlayers method
      marketValue: undefined
    };
  }

  private generateMockHistory(currentPoints: number): number[] {
    // Generate 5 historical points based on current points with some variation
    const basePoints = Math.max(currentPoints * 0.8, 50); // Ensure minimum base points
    return Array.from({ length: 5 }, (_, i) => {
      const variation = (Math.random() - 0.5) * 20; // ±10 points variation
      return Math.round(basePoints + variation + (i % 2 === 0 ? 5 : -5));
    });
  }

  private generateMockMinutes(): number[] {
    // Generate mock minutes played (typically 60-90 minutes)
    return Array.from({ length: 5 }, () => Math.round(60 + Math.random() * 30));
  }

  private generateMockGoals(currentSeasonGoals: number): number[] {
    // Generate historical goals based on current season total
    // Distribute goals across 4 matchdays (as user mentioned 4 matchdays played)
    const goals = [0, 0, 0, 0]; // 4 matchdays
    let remaining = currentSeasonGoals;
    
    // Randomly distribute goals across matchdays
    for (let i = 0; i < 4 && remaining > 0; i++) {
      const maxGoals = Math.min(remaining, 3); // Max 3 goals per game
      const goalsThisGame = Math.floor(Math.random() * (maxGoals + 1));
      goals[i] = goalsThisGame;
      remaining -= goalsThisGame;
    }
    
    return goals;
  }

  private generateMockAssists(currentSeasonAssists: number): number[] {
    // Generate historical assists based on current season total
    // Distribute assists across 4 matchdays
    const assists = [0, 0, 0, 0]; // 4 matchdays
    let remaining = currentSeasonAssists;
    
    // Randomly distribute assists across matchdays
    for (let i = 0; i < 4 && remaining > 0; i++) {
      const maxAssists = Math.min(remaining, 3); // Max 3 assists per game
      const assistsThisGame = Math.floor(Math.random() * (maxAssists + 1));
      assists[i] = assistsThisGame;
      remaining -= assistsThisGame;
    }
    
    return assists;
  }

  private calculateMarketValue(kickbasePlayer: any): number {
    // If API provides market value, use it (convert from thousands to full amount)
    if (kickbasePlayer.mv && kickbasePlayer.mv > 0) {
      return kickbasePlayer.mv * 1000;
    }
    
    // Generate realistic market value based on player performance and position
    const currentPoints = kickbasePlayer.p || 0;
    const goals = kickbasePlayer.g || 0;
    const assists = kickbasePlayer.a || 0;
    const position = kickbasePlayer.pos;
    
    // Base values by position (in thousands)
    const positionBaseValues: { [key: number]: number } = {
      1: 15000000, // GK - 15M base
      2: 25000000, // DEF - 25M base  
      3: 35000000, // MID - 35M base
      4: 45000000  // FWD - 45M base
    };
    
    const baseValue = positionBaseValues[position] || 25000000;
    
    // Performance multiplier based on points (0.5x to 2.5x)
    const performanceMultiplier = Math.max(0.5, Math.min(2.5, 1 + (currentPoints - 200) / 200));
    
    // Goal/assist bonus for attacking players
    let attackingBonus = 1;
    if (position === 3 || position === 4) { // MID or FWD
      attackingBonus = 1 + (goals * 0.1) + (assists * 0.05);
    }
    
    const finalValue = Math.round(baseValue * performanceMultiplier * attackingBonus);
    
    // Ensure minimum value of 5M and maximum of 100M
    return Math.max(5000000, Math.min(100000000, finalValue));
  }

  private getTeamName(teamId: string | number): string {
    // Map team IDs to team names - this is a simplified mapping
    // In a real implementation, you'd want to fetch team data from the API
    const teamMap: Record<string, string> = {
      '1': 'Bayern München',
      '2': 'Bayern München', 
      '3': 'Borussia Dortmund',
      '4': 'RB Leipzig',
      '5': 'SC Freiburg',
      '6': 'Bayer Leverkusen',
      '7': 'Eintracht Frankfurt',
      '8': 'VfL Wolfsburg',
      '9': 'Borussia Mönchengladbach',
      '10': 'FC Augsburg',
      '11': 'TSG Hoffenheim',
      '12': 'VfB Stuttgart',
      '13': 'Werder Bremen',
      '14': 'FC Köln',
      '15': 'Union Berlin',
      '16': 'VfL Bochum',
      '17': 'FSV Mainz 05',
      '18': 'Hertha BSC',
      '19': 'FC Schalke 04',
      '20': 'Arminia Bielefeld',
      '40': 'Werder Bremen'
    };
    
    return teamMap[String(teamId)] || `Team ${teamId}`;
  }

  async getMatches(spieltag: number): Promise<Match[]> {
    try {
      // Get matchdays/fixtures for Bundesliga (competition ID 1)
      const data = await this.request<any>(`/v4/competitions/1/matchdays`);
      
      // Find matches for the specific spieltag
      if (data && data.matchdays) {
        const matchday = data.matchdays.find((md: any) => md.matchday === spieltag);
        if (matchday && matchday.matches) {
          return matchday.matches.map((match: any) => this.transformMatch(match, spieltag));
        }
      }
    } catch (error) {
      logger.warn({ spieltag, error }, 'Failed to fetch matches from API, generating mock data');
    }
    
    // Fallback to mock matches if API fails or no data
    return this.generateMockMatches(spieltag);
  }

  private transformMatch(kickbaseMatch: any, spieltag: number): Match {
    return {
      id: kickbaseMatch.id || `match-${spieltag}-${Date.now()}`,
      spieltag,
      heim: this.getTeamName(kickbaseMatch.homeTeamId || kickbaseMatch.heim),
      auswaerts: this.getTeamName(kickbaseMatch.awayTeamId || kickbaseMatch.auswaerts),
      kickoff: kickbaseMatch.kickoff || kickbaseMatch.date || new Date().toISOString()
    };
  }

  private generateMockMatches(spieltag: number): Match[] {
    const teams = ['Bayern München', 'Borussia Dortmund', 'RB Leipzig', 'SC Freiburg', 'Bayer Leverkusen', 'Eintracht Frankfurt'];
    
    return [
      {
        id: `match-${spieltag}-1`,
        spieltag,
        heim: teams[0],
        auswaerts: teams[1],
        kickoff: new Date(Date.now() + 3600_000).toISOString()
      },
      {
        id: `match-${spieltag}-2`,
        spieltag,
        heim: teams[2],
        auswaerts: teams[3],
        kickoff: new Date(Date.now() + 7200_000).toISOString()
      },
      {
        id: `match-${spieltag}-3`,
        spieltag,
        heim: teams[4],
        auswaerts: teams[5],
        kickoff: new Date(Date.now() + 10_800_000).toISOString()
      }
    ];
  }
}

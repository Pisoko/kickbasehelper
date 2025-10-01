/**
 * Centralized Mock Data Generator for Bundesliga 2025/2026 Season
 * 
 * This module provides realistic mock data generation for the current season,
 * including proper team lineups, realistic match schedules, and season-appropriate data.
 */

export interface MockMatch {
  id: string;
  spieltag: number;
  heim: string;
  auswaerts: string;
  kickoff: string;
  homeGoals?: number;
  awayGoals?: number;
  matchStatus?: 'scheduled' | 'live' | 'finished' | 'halftime';
  minute?: number;
  homeTeamSymbol?: string;
  awayTeamSymbol?: string;
}

export interface MockPlayer {
  id: string;
  name: string;
  firstName?: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  verein: string;
  kosten: number;
  punkte_hist: number[];
  punkte_avg: number;
  punkte_sum: number;
  minutes_hist: number[];
  goals_hist?: number[];
  assists_hist?: number[];
}

/**
 * Official Bundesliga teams for 2025/2026 season
 */
export const BUNDESLIGA_TEAMS_2025_26 = [
  'Bayern München',
  'Borussia Dortmund', 
  'RB Leipzig',
  'Bayer Leverkusen',
  'Eintracht Frankfurt',
  'SC Freiburg',
  'VfB Stuttgart',
  'Borussia Mönchengladbach',
  'VfL Wolfsburg',
  '1. FC Union Berlin',
  'Werder Bremen',
  'FC Augsburg',
  'TSG Hoffenheim',
  'FSV Mainz 05',
  'VfL Bochum',
  'FC St. Pauli',
  'Holstein Kiel',
  '1. FC Heidenheim'
] as const;

/**
 * Team strength ratings for realistic odds and performance generation
 */
const TEAM_STRENGTH_RATINGS = {
  'Bayern München': 95,
  'Borussia Dortmund': 88,
  'RB Leipzig': 85,
  'Bayer Leverkusen': 84,
  'Eintracht Frankfurt': 78,
  'VfB Stuttgart': 76,
  'SC Freiburg': 74,
  'Borussia Mönchengladbach': 72,
  'VfL Wolfsburg': 70,
  '1. FC Union Berlin': 68,
  'Werder Bremen': 66,
  'TSG Hoffenheim': 65,
  'FC Augsburg': 62,
  'FSV Mainz 05': 60,
  'VfL Bochum': 55,
  'FC St. Pauli': 52,
  'Holstein Kiel': 50,
  '1. FC Heidenheim': 48
} as const;

/**
 * Season configuration for 2025/2026
 */
export const SEASON_CONFIG = {
  startDate: new Date('2025-08-16'), // First matchday
  totalMatchdays: 34,
  currentMatchday: 5,
  completedMatchdays: 5,
  matchesPerMatchday: 9
} as const;

export class MockDataGenerator {
  /**
   * Generate realistic matches for a specific matchday
   */
  static generateMatches(matchday: number): MockMatch[] {
    if (matchday < 1 || matchday > SEASON_CONFIG.totalMatchdays) {
      throw new Error(`Invalid matchday: ${matchday}. Must be between 1 and ${SEASON_CONFIG.totalMatchdays}`);
    }

    const pairings = this.generateMatchdayPairings(matchday);
    const kickoffTimes = this.generateKickoffTimes(matchday);

    return pairings.map((pairing, index) => {
      const match: MockMatch = {
        id: `2025-${matchday.toString().padStart(2, '0')}-${(index + 1).toString().padStart(2, '0')}`,
        spieltag: matchday,
        heim: pairing.heim,
        auswaerts: pairing.auswaerts,
        kickoff: kickoffTimes[index].toISOString(),
        homeTeamSymbol: this.getTeamSymbol(pairing.heim),
        awayTeamSymbol: this.getTeamSymbol(pairing.auswaerts)
      };

      // Add scores and status for completed matchdays
      if (matchday <= SEASON_CONFIG.completedMatchdays) {
        const result = this.generateMatchResult(pairing.heim, pairing.auswaerts);
        match.homeGoals = result.homeGoals;
        match.awayGoals = result.awayGoals;
        match.matchStatus = 'finished';
      } else if (matchday === SEASON_CONFIG.currentMatchday + 1) {
        // Some matches might be live or scheduled for next matchday
        const isLive = Math.random() < 0.3; // 30% chance of being live
        if (isLive) {
          const liveResult = this.generateLiveMatchResult(pairing.heim, pairing.auswaerts);
          match.homeGoals = liveResult.homeGoals;
          match.awayGoals = liveResult.awayGoals;
          match.matchStatus = liveResult.status;
          match.minute = liveResult.minute;
        } else {
          match.matchStatus = 'scheduled';
        }
      } else {
        match.matchStatus = 'scheduled';
      }

      return match;
    });
  }

  /**
   * Generate realistic team pairings for a matchday using round-robin algorithm
   */
  private static generateMatchdayPairings(matchday: number): Array<{heim: string, auswaerts: string}> {
    const teams = [...BUNDESLIGA_TEAMS_2025_26];
    const pairings: Array<{heim: string, auswaerts: string}> = [];
    
    // Use a deterministic shuffle based on matchday for consistent results
    const shuffled = this.deterministicShuffle(teams, matchday);
    
    // Create 9 pairings from 18 teams
    for (let i = 0; i < 18; i += 2) {
      pairings.push({
        heim: shuffled[i],
        auswaerts: shuffled[i + 1]
      });
    }

    return pairings;
  }

  /**
   * Generate realistic kickoff times for Bundesliga matches
   */
  private static generateKickoffTimes(matchday: number): Date[] {
    const baseDate = this.getMatchdayBaseDate(matchday);
    
    return [
      // Friday 20:30 (1 match)
      new Date(baseDate.getTime() - 24 * 60 * 60 * 1000 + 20.5 * 60 * 60 * 1000),
      
      // Saturday 15:30 (5 matches)
      new Date(baseDate.getTime() + 15.5 * 60 * 60 * 1000),
      new Date(baseDate.getTime() + 15.5 * 60 * 60 * 1000),
      new Date(baseDate.getTime() + 15.5 * 60 * 60 * 1000),
      new Date(baseDate.getTime() + 15.5 * 60 * 60 * 1000),
      new Date(baseDate.getTime() + 15.5 * 60 * 60 * 1000),
      
      // Saturday 18:30 (1 match)
      new Date(baseDate.getTime() + 18.5 * 60 * 60 * 1000),
      
      // Sunday 15:30 (1 match)
      new Date(baseDate.getTime() + 24 * 60 * 60 * 1000 + 15.5 * 60 * 60 * 1000),
      
      // Sunday 17:30 (1 match)
      new Date(baseDate.getTime() + 24 * 60 * 60 * 1000 + 17.5 * 60 * 60 * 1000)
    ];
  }

  /**
   * Generate realistic match results based on team strength
   */
  private static generateMatchResult(homeTeam: string, awayTeam: string): {homeGoals: number, awayGoals: number} {
    const homeStrength = TEAM_STRENGTH_RATINGS[homeTeam as keyof typeof TEAM_STRENGTH_RATINGS] || 60;
    const awayStrength = TEAM_STRENGTH_RATINGS[awayTeam as keyof typeof TEAM_STRENGTH_RATINGS] || 60;
    
    // Home advantage
    const adjustedHomeStrength = homeStrength + 5;
    
    // Calculate expected goals based on strength difference
    const strengthDiff = (adjustedHomeStrength - awayStrength) / 20;
    const homeExpectedGoals = Math.max(0.5, 1.5 + strengthDiff);
    const awayExpectedGoals = Math.max(0.5, 1.5 - strengthDiff);
    
    // Generate goals using Poisson-like distribution
    const homeGoals = this.generateGoals(homeExpectedGoals);
    const awayGoals = this.generateGoals(awayExpectedGoals);
    
    return { homeGoals, awayGoals };
  }

  /**
   * Generate live match result with current status
   */
  private static generateLiveMatchResult(homeTeam: string, awayTeam: string): {
    homeGoals: number, 
    awayGoals: number, 
    status: 'live' | 'halftime',
    minute: number
  } {
    const minute = Math.floor(Math.random() * 90) + 1;
    const status: 'live' | 'halftime' = minute === 45 ? 'halftime' : 'live';
    
    // Scale goals based on current minute
    const gameProgress = minute / 90;
    const result = this.generateMatchResult(homeTeam, awayTeam);
    
    const homeGoals = Math.floor(result.homeGoals * gameProgress * (0.5 + Math.random() * 0.5));
    const awayGoals = Math.floor(result.awayGoals * gameProgress * (0.5 + Math.random() * 0.5));
    
    return { homeGoals, awayGoals, status, minute };
  }

  /**
   * Generate number of goals using weighted random distribution
   */
  private static generateGoals(expectedGoals: number): number {
    const random = Math.random();
    const scaledExpected = expectedGoals * 0.8; // Scale down for realism
    
    if (random < 0.3) return 0;
    if (random < 0.6) return 1;
    if (random < 0.8) return 2;
    if (random < 0.95) return 3;
    return Math.min(4, Math.floor(scaledExpected * 2));
  }

  /**
   * Get base date for a matchday (Saturday of that week)
   */
  private static getMatchdayBaseDate(matchday: number): Date {
    const matchdayDate = new Date(SEASON_CONFIG.startDate);
    matchdayDate.setDate(SEASON_CONFIG.startDate.getDate() + (matchday - 1) * 7);
    
    // Adjust to Saturday of that week
    const dayOfWeek = matchdayDate.getDay();
    const daysToSaturday = (6 - dayOfWeek) % 7;
    matchdayDate.setDate(matchdayDate.getDate() + daysToSaturday);
    
    return matchdayDate;
  }

  /**
   * Deterministic shuffle for consistent results
   */
  private static deterministicShuffle<T>(array: T[], seed: number): T[] {
    const shuffled = [...array];
    let currentIndex = shuffled.length;
    
    // Use matchday as seed for consistent but varied results
    let randomSeed = seed * 9301 + 49297;
    
    while (currentIndex !== 0) {
      randomSeed = (randomSeed * 9301 + 49297) % 233280;
      const randomIndex = Math.floor((randomSeed / 233280) * currentIndex);
      currentIndex--;
      
      [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
    }
    
    return shuffled;
  }

  /**
   * Get team symbol/abbreviation
   */
  private static getTeamSymbol(teamName: string): string {
    const symbolMap: Record<string, string> = {
      'Bayern München': 'FCB',
      'Borussia Dortmund': 'BVB',
      'RB Leipzig': 'RBL',
      'Bayer Leverkusen': 'B04',
      'Eintracht Frankfurt': 'SGE',
      'SC Freiburg': 'SCF',
      'VfB Stuttgart': 'VFB',
      'Borussia Mönchengladbach': 'BMG',
      'VfL Wolfsburg': 'WOB',
      '1. FC Union Berlin': 'FCU',
      'Werder Bremen': 'SVW',
      'FC Augsburg': 'FCA',
      'TSG Hoffenheim': 'TSG',
      'FSV Mainz 05': 'M05',
      'VfL Bochum': 'BOC',
      'FC St. Pauli': 'STP',
      'Holstein Kiel': 'KSV',
      '1. FC Heidenheim': 'HDH'
    };
    
    return symbolMap[teamName] || teamName.substring(0, 3).toUpperCase();
  }

  /**
   * Generate realistic player data for a team
   */
  static generatePlayersForTeam(teamName: string, startingId: number = 1): MockPlayer[] {
    const positions = [
      { pos: 'GK' as const, count: 3, basePoints: 65, baseCost: 5_000_000 },
      { pos: 'DEF' as const, count: 8, basePoints: 78, baseCost: 7_500_000 },
      { pos: 'MID' as const, count: 8, basePoints: 95, baseCost: 8_500_000 },
      { pos: 'FWD' as const, count: 6, basePoints: 110, baseCost: 12_000_000 }
    ];

    const players: MockPlayer[] = [];
    let playerId = startingId;

    const teamStrength = TEAM_STRENGTH_RATINGS[teamName as keyof typeof TEAM_STRENGTH_RATINGS] || 60;
    const strengthMultiplier = teamStrength / 70; // Normalize around average team

    for (const { pos, count, basePoints, baseCost } of positions) {
      for (let i = 0; i < count; i++) {
        const variation = (playerId % 7) * 3;
        const strengthAdjustedPoints = Math.round(basePoints * strengthMultiplier);
        const hist = Array.from({ length: 5 }, (_, idx) => 
          Math.max(0, strengthAdjustedPoints + variation - idx * 2 + (idx % 2 === 0 ? 4 : -3))
        );
        
        const minutes = Array.from({ length: 5 }, (_, idx) => 
          Math.max(0, 70 + ((playerId + idx * 3) % 21))
        );
        
        const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
        const sum = hist.reduce((a, b) => a + b, 0);
        const cost = Math.round((baseCost + variation * 120_000 + i * 90_000) * strengthMultiplier);

        players.push({
          id: `mock-player-${playerId}`,
          name: `${teamName} ${pos} ${i + 1}`,
          firstName: `Spieler${playerId}`,
          position: pos,
          verein: teamName,
          kosten: cost,
          punkte_hist: hist,
          punkte_avg: avg,
          punkte_sum: sum,
          minutes_hist: minutes,
          goals_hist: pos === 'FWD' ? [1, 0, 2, 1, 0] : pos === 'MID' ? [0, 1, 0, 0, 1] : [0, 0, 0, 0, 0],
          assists_hist: pos === 'MID' ? [2, 1, 0, 1, 1] : pos === 'FWD' ? [1, 0, 1, 0, 0] : [0, 0, 0, 0, 0]
        });

        playerId++;
      }
    }

    return players;
  }

  /**
   * Get team strength rating
   */
  static getTeamStrength(teamName: string): number {
    return TEAM_STRENGTH_RATINGS[teamName as keyof typeof TEAM_STRENGTH_RATINGS] || 60;
  }

  /**
   * Get current season info
   */
  static getSeasonInfo() {
    return {
      season: '2025/2026',
      ...SEASON_CONFIG,
      teams: BUNDESLIGA_TEAMS_2025_26
    };
  }
}
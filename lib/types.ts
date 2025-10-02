export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface Player {
  id: string;
  name: string;
  firstName?: string;              // First name from API (fn field)
  position: Position;
  verein: string;
  kosten: number;
  punkte_hist: number[];
  punkte_avg: number;
  punkte_sum: number;
  minutes_hist?: number[];
  goals_hist?: number[];          // Historical goals per matchday
  assists_hist?: number[];        // Historical assists per matchday
  oddsModifier?: number;
  // Enhanced player data from Kickbase API
  marketValue?: number;           // Current market value (from API calls)
  cvValue?: number;               // Contract Value (cv field from league endpoint)
  totalPoints?: number;           // Total season points
  averagePoints?: number;         // Average points per game
  goals?: number;                 // Goals scored (g field)
  assists?: number;               // Assists (a field)
  isInjured?: boolean;           // Injury status (il field)
  status?: string;               // Player status (st field)
  playerImageUrl?: string;       // Player image URL (pim field)
  minutesPlayed?: number;        // Minutes played in last game (mt field)
  totalMinutesPlayed?: number;   // Total minutes played this season (sec field converted to minutes)
  appearances?: number;          // Number of appearances/games played (smc field)
  jerseyNumber?: number;         // Jersey/shirt number (shn field)
  yellowCards?: number;          // Yellow cards (y field)
  redCards?: number;             // Red cards (r field)
  recentPerformance?: number[];  // Points from last 3-5 games
  marketValueHistory?: number[]; // Historical market values
  xFactor?: number;              // Calculated X-Factor for optimization
}

export interface Match {
  id: string;
  spieltag: number;
  heim: string;
  auswaerts: string;
  kickoff?: string;
  // Additional match data from Kickbase API
  homeGoals?: number;        // t1g - Home team goals
  awayGoals?: number;        // t2g - Away team goals
  matchStatus?: number;      // st - Match status (0=not started, 1=live, 2=finished)
  matchTime?: string;        // mtd - Match time/duration
  isLive?: boolean;          // il - Is live flag
  homeTeamSymbol?: string;   // t1sy - Home team symbol/abbreviation
  awayTeamSymbol?: string;   // t2sy - Away team symbol/abbreviation
  homeTeamImage?: string;    // t1im - Home team image/logo URL
  awayTeamImage?: string;    // t2im - Away team image/logo URL
  odds?: {
    heim: number;
    unentschieden: number;
    auswaerts: number;
    format: 'decimal' | 'fractional' | 'american';
  };
}

export interface Odds {
  matchId: string;
  heim: number;
  unentschieden: number;
  auswaerts: number;
  format: 'decimal' | 'fractional' | 'american';
}

export type OddsProvider = 'none' | 'external' | 'odds-api';

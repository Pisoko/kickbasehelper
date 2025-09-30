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
}

export interface Match {
  id: string;
  spieltag: number;
  heim: string;
  auswaerts: string;
  kickoff?: string;
}

export interface Odds {
  matchId: string;
  heim: number;
  unentschieden: number;
  auswaerts: number;
  format: 'decimal' | 'fractional' | 'american';
}

export type OddsProvider = 'none' | 'external' | 'odds-api';

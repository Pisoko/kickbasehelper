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
  totalPoints?: number;           // Total season points
  averagePoints?: number;         // Average points per game
  goals?: number;                 // Goals scored (g field)
  assists?: number;               // Assists (a field)
  isInjured?: boolean;           // Injury status (il field)
  status?: string;               // Player status (st field)
  playerImageUrl?: string;       // Player image URL (pim field)
  minutesPlayed?: number;        // Minutes played in last game (mt field)
  recentPerformance?: number[];  // Points from last 3-5 games
  marketValueHistory?: number[]; // Historical market values
}

export interface Match {
  id: string;
  spieltag: number;
  heim: string;
  auswaerts: string;
  kickoff?: string;
  odds?: Odds;
}

export interface Odds {
  matchId: string;
  heim: number;
  unentschieden: number;
  auswaerts: number;
  format: 'decimal' | 'prob';
}

export interface ProjectionParams {
  baseMode: 'avg' | 'sum' | 'last3';
  w_base: number;
  w_form: number;
  w_odds: number;
  w_home: number;
  w_minutes: number;
  w_risk: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface PlayerProjection extends Player {
  p_pred: number;
  value: number;
  minutesWeight: number;
  formBoost: number;
  oddsModifier: number;
  homeBonus: number;
}

export interface PlayerPick {
  playerId: string;
  name: string;
  position: Position;
  verein: string;
  kosten: number;
  p_pred: number;
  value: number;
}

export interface OptimizationResult {
  formation: Formation;
  lineup: PlayerPick[];
  objective: number;
  restbudget: number;
}

export type Formation = '4-4-2' | '4-2-4' | '3-4-3' | '4-3-3' | '5-3-2' | '3-5-2' | '5-4-1' | '4-5-1' | '3-6-1' | '5-2-3';

export type OddsProvider = 'none' | 'external';

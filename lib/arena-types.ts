/**
 * Arena mode types for formation builder and player selection
 */

import { Player, Position } from './types';

export type FormationType = '3-5-2' | '3-4-3' | '3-6-1' | '4-4-2' | '4-3-3' | '4-2-3-1' | '4-2-4' | '4-5-1' | '5-3-2' | '5-4-1' | '5-2-3';

export interface FormationPosition {
  id: string;
  position: Position;
  x: number; // Position on field (0-100%)
  y: number; // Position on field (0-100%)
  playerId?: string; // ID of selected player
}

export interface Formation {
  type: FormationType;
  name: string;
  positions: FormationPosition[];
}

export interface ArenaTeam {
  formation: FormationType;
  players: { [positionId: string]: Player };
  totalCost: number;
  budget: number;
}

export interface PlayerPool {
  goalkeepers: Player[];
  defenders: Player[];
  midfielders: Player[];
  forwards: Player[];
}

// Formation definitions with positions (rotated 180 degrees - GK at bottom)
export const FORMATIONS: Record<FormationType, Formation> = {
  '3-5-2': {
    type: '3-5-2',
    name: '3-5-2',
    positions: [
      // Goalkeeper (now at bottom)
      { id: 'gk1', position: 'GK', x: 50, y: 85 },
      // Defenders
      { id: 'def1', position: 'DEF', x: 25, y: 62 },
      { id: 'def2', position: 'DEF', x: 50, y: 62 },
      { id: 'def3', position: 'DEF', x: 75, y: 62 },
      // Midfielders
      { id: 'mid1', position: 'MID', x: 10, y: 39 },
      { id: 'mid2', position: 'MID', x: 30, y: 39 },
      { id: 'mid3', position: 'MID', x: 50, y: 39 },
      { id: 'mid4', position: 'MID', x: 70, y: 39 },
      { id: 'mid5', position: 'MID', x: 90, y: 39 },
      // Forwards (now at top)
      { id: 'fwd1', position: 'FWD', x: 35, y: 16 },
      { id: 'fwd2', position: 'FWD', x: 65, y: 16 },
    ]
  },
  '3-4-3': {
    type: '3-4-3',
    name: '3-4-3',
    positions: [
      // Goalkeeper (now at bottom)
      { id: 'gk1', position: 'GK', x: 50, y: 85 },
      // Defenders
      { id: 'def1', position: 'DEF', x: 25, y: 62 },
      { id: 'def2', position: 'DEF', x: 50, y: 62 },
      { id: 'def3', position: 'DEF', x: 75, y: 62 },
      // Midfielders
      { id: 'mid1', position: 'MID', x: 20, y: 39 },
      { id: 'mid2', position: 'MID', x: 40, y: 39 },
      { id: 'mid3', position: 'MID', x: 60, y: 39 },
      { id: 'mid4', position: 'MID', x: 80, y: 39 },
      // Forwards (now at top)
      { id: 'fwd1', position: 'FWD', x: 20, y: 16 },
      { id: 'fwd2', position: 'FWD', x: 50, y: 16 },
      { id: 'fwd3', position: 'FWD', x: 80, y: 16 },
    ]
  },
  '3-6-1': {
    type: '3-6-1',
    name: '3-6-1',
    positions: [
      // Goalkeeper (now at bottom)
      { id: 'gk1', position: 'GK', x: 50, y: 85 },
      // Defenders
      { id: 'def1', position: 'DEF', x: 25, y: 62 },
      { id: 'def2', position: 'DEF', x: 50, y: 62 },
      { id: 'def3', position: 'DEF', x: 75, y: 62 },
      // Midfielders
      { id: 'mid1', position: 'MID', x: 10, y: 39 },
      { id: 'mid2', position: 'MID', x: 25, y: 39 },
      { id: 'mid3', position: 'MID', x: 40, y: 39 },
      { id: 'mid4', position: 'MID', x: 60, y: 39 },
      { id: 'mid5', position: 'MID', x: 75, y: 39 },
      { id: 'mid6', position: 'MID', x: 90, y: 39 },
      // Forward (now at top)
      { id: 'fwd1', position: 'FWD', x: 50, y: 16 },
    ]
  },
  '4-4-2': {
    type: '4-4-2',
    name: '4-4-2',
    positions: [
      // Goalkeeper (now at bottom)
      { id: 'gk1', position: 'GK', x: 50, y: 85 },
      // Defenders - gleichmäßige Abstände
      { id: 'def1', position: 'DEF', x: 20, y: 62 },
      { id: 'def2', position: 'DEF', x: 40, y: 62 },
      { id: 'def3', position: 'DEF', x: 60, y: 62 },
      { id: 'def4', position: 'DEF', x: 80, y: 62 },
      // Midfielders - gleichmäßige Abstände
      { id: 'mid1', position: 'MID', x: 20, y: 39 },
      { id: 'mid2', position: 'MID', x: 40, y: 39 },
      { id: 'mid3', position: 'MID', x: 60, y: 39 },
      { id: 'mid4', position: 'MID', x: 80, y: 39 },
      // Forwards - gleichmäßige Abstände
      { id: 'fwd1', position: 'FWD', x: 37.5, y: 16 },
      { id: 'fwd2', position: 'FWD', x: 62.5, y: 16 },
    ]
  },
  '4-3-3': {
    type: '4-3-3',
    name: '4-3-3',
    positions: [
      // Goalkeeper (now at bottom)
      { id: 'gk1', position: 'GK', x: 50, y: 85 },
      // Defenders - gleichmäßige Abstände
      { id: 'def1', position: 'DEF', x: 20, y: 62 },
      { id: 'def2', position: 'DEF', x: 40, y: 62 },
      { id: 'def3', position: 'DEF', x: 60, y: 62 },
      { id: 'def4', position: 'DEF', x: 80, y: 62 },
      // Midfielders - gleichmäßige Abstände
      { id: 'mid1', position: 'MID', x: 25, y: 39 },
      { id: 'mid2', position: 'MID', x: 50, y: 39 },
      { id: 'mid3', position: 'MID', x: 75, y: 39 },
      // Forwards - gleichmäßige Abstände
      { id: 'fwd1', position: 'FWD', x: 25, y: 16 },
      { id: 'fwd2', position: 'FWD', x: 50, y: 16 },
      { id: 'fwd3', position: 'FWD', x: 75, y: 16 },
    ]
  },
  '4-2-3-1': {
    type: '4-2-3-1',
    name: '4-2-3-1',
    positions: [
      // Goalkeeper (now at bottom)
      { id: 'gk1', position: 'GK', x: 50, y: 85 },
      // Defenders
      { id: 'def1', position: 'DEF', x: 15, y: 62 },
      { id: 'def2', position: 'DEF', x: 35, y: 62 },
      { id: 'def3', position: 'DEF', x: 65, y: 62 },
      { id: 'def4', position: 'DEF', x: 85, y: 62 },
      // Defensive Midfielders
      { id: 'mid1', position: 'MID', x: 35, y: 50 },
      { id: 'mid2', position: 'MID', x: 65, y: 50 },
      // Attacking Midfielders
      { id: 'mid3', position: 'MID', x: 20, y: 28 },
      { id: 'mid4', position: 'MID', x: 50, y: 28 },
      { id: 'mid5', position: 'MID', x: 80, y: 28 },
      // Forward (now at top)
      { id: 'fwd1', position: 'FWD', x: 50, y: 16 },
    ]
  },
  '4-2-4': {
    type: '4-2-4',
    name: '4-2-4',
    positions: [
      // Goalkeeper
      { id: 'gk1', position: 'GK', x: 50, y: 85 },
      // Defenders
      { id: 'def1', position: 'DEF', x: 20, y: 62 },
      { id: 'def2', position: 'DEF', x: 40, y: 62 },
      { id: 'def3', position: 'DEF', x: 60, y: 62 },
      { id: 'def4', position: 'DEF', x: 80, y: 62 },
      // Midfielders
      { id: 'mid1', position: 'MID', x: 35, y: 39 },
      { id: 'mid2', position: 'MID', x: 65, y: 39 },
      // Forwards
      { id: 'fwd1', position: 'FWD', x: 15, y: 16 },
      { id: 'fwd2', position: 'FWD', x: 40, y: 16 },
      { id: 'fwd3', position: 'FWD', x: 60, y: 16 },
      { id: 'fwd4', position: 'FWD', x: 85, y: 16 },
    ]
  },
  '4-5-1': {
    type: '4-5-1',
    name: '4-5-1',
    positions: [
      // Goalkeeper (now at bottom)
      { id: 'gk1', position: 'GK', x: 50, y: 85 },
      // Defenders - gleichmäßige Abstände
      { id: 'def1', position: 'DEF', x: 20, y: 62 },
      { id: 'def2', position: 'DEF', x: 40, y: 62 },
      { id: 'def3', position: 'DEF', x: 60, y: 62 },
      { id: 'def4', position: 'DEF', x: 80, y: 62 },
      // Midfielders - gleichmäßige Abstände
      { id: 'mid1', position: 'MID', x: 10, y: 39 },
      { id: 'mid2', position: 'MID', x: 30, y: 39 },
      { id: 'mid3', position: 'MID', x: 50, y: 39 },
      { id: 'mid4', position: 'MID', x: 70, y: 39 },
      { id: 'mid5', position: 'MID', x: 90, y: 39 },
      // Forward
      { id: 'fwd1', position: 'FWD', x: 50, y: 16 },
    ]
  },
  '5-3-2': {
    type: '5-3-2',
    name: '5-3-2',
    positions: [
      // Goalkeeper (now at bottom)
      { id: 'gk1', position: 'GK', x: 50, y: 85 },
      // Defenders
      { id: 'def1', position: 'DEF', x: 10, y: 62 },
      { id: 'def2', position: 'DEF', x: 30, y: 62 },
      { id: 'def3', position: 'DEF', x: 50, y: 62 },
      { id: 'def4', position: 'DEF', x: 70, y: 62 },
      { id: 'def5', position: 'DEF', x: 90, y: 62 },
      // Midfielders
      { id: 'mid1', position: 'MID', x: 25, y: 39 },
      { id: 'mid2', position: 'MID', x: 50, y: 39 },
      { id: 'mid3', position: 'MID', x: 75, y: 39 },
      // Forwards
      { id: 'fwd1', position: 'FWD', x: 35, y: 16 },
      { id: 'fwd2', position: 'FWD', x: 65, y: 16 },
    ]
  },
  '5-4-1': {
    type: '5-4-1',
    name: '5-4-1',
    positions: [
      // Goalkeeper (now at bottom)
      { id: 'gk1', position: 'GK', x: 50, y: 85 },
      // Defenders
      { id: 'def1', position: 'DEF', x: 10, y: 62 },
      { id: 'def2', position: 'DEF', x: 30, y: 62 },
      { id: 'def3', position: 'DEF', x: 50, y: 62 },
      { id: 'def4', position: 'DEF', x: 70, y: 62 },
      { id: 'def5', position: 'DEF', x: 90, y: 62 },
      // Midfielders
      { id: 'mid1', position: 'MID', x: 20, y: 39 },
      { id: 'mid2', position: 'MID', x: 40, y: 39 },
      { id: 'mid3', position: 'MID', x: 60, y: 39 },
      { id: 'mid4', position: 'MID', x: 80, y: 39 },
      // Forward
      { id: 'fwd1', position: 'FWD', x: 50, y: 16 },
    ]
  },
  '5-2-3': {
    type: '5-2-3',
    name: '5-2-3',
    positions: [
      // Goalkeeper (now at bottom)
      { id: 'gk1', position: 'GK', x: 50, y: 85 },
      // Defenders
      { id: 'def1', position: 'DEF', x: 10, y: 62 },
      { id: 'def2', position: 'DEF', x: 30, y: 62 },
      { id: 'def3', position: 'DEF', x: 50, y: 62 },
      { id: 'def4', position: 'DEF', x: 70, y: 62 },
      { id: 'def5', position: 'DEF', x: 90, y: 62 },
      // Midfielders
      { id: 'mid1', position: 'MID', x: 35, y: 39 },
      { id: 'mid2', position: 'MID', x: 65, y: 39 },
      // Forwards
      { id: 'fwd1', position: 'FWD', x: 20, y: 16 },
      { id: 'fwd2', position: 'FWD', x: 50, y: 16 },
      { id: 'fwd3', position: 'FWD', x: 80, y: 16 },
    ]
  }
};

export const ARENA_BUDGET = 150000000; // 150 Million Euro
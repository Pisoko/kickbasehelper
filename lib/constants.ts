import type { Formation, ProjectionParams } from './types';

export const FORMATIONS: Record<Formation, { DEF: number; MID: number; FWD: number }> = {
  '4-4-2': { DEF: 4, MID: 4, FWD: 2 },
  '4-2-4': { DEF: 4, MID: 2, FWD: 4 },
  '3-4-3': { DEF: 3, MID: 4, FWD: 3 },
  '4-3-3': { DEF: 4, MID: 3, FWD: 3 },
  '5-3-2': { DEF: 5, MID: 3, FWD: 2 },
  '3-5-2': { DEF: 3, MID: 5, FWD: 2 },
  '5-4-1': { DEF: 5, MID: 4, FWD: 1 },
  '4-5-1': { DEF: 4, MID: 5, FWD: 1 },
  '3-6-1': { DEF: 3, MID: 6, FWD: 1 },
  '5-2-3': { DEF: 5, MID: 2, FWD: 3 }
};

export const DEFAULT_PARAMS: ProjectionParams = {
  baseMode: 'avg',
  w_base: 1,
  w_form: 0.35,
  w_odds: 0.35,
  w_home: 0.1,
  w_minutes: 0.2,
  w_risk: 0.15,
  alpha: 1,
  beta: 0.2,
  gamma: 0.7
};

export const FORMATION_LIST = Object.keys(FORMATIONS) as (keyof typeof FORMATIONS)[];

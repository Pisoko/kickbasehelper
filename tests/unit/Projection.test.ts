import { describe, expect, it } from 'vitest';

import { computeProjections } from '../../lib/projection';
import { DEFAULT_PARAMS } from '../../lib/constants';
import type { Match, Odds, Player, ProjectionParams } from '../../lib/types';

describe('Projection', () => {
  const player: Player = {
    id: 'p1',
    name: 'Test Spieler',
    position: 'MID',
    verein: 'FC Atlas',
    kosten: 10_000_000,
    punkte_hist: [80, 85, 120, 110, 115],
    punkte_avg: 102,
    punkte_sum: 510,
    minutes_hist: [90, 88, 90, 85, 80]
  };
  const match: Match = {
    id: 'm1',
    spieltag: 1,
    heim: 'FC Atlas',
    auswaerts: 'SV Comet'
  };
  const odds: Odds = {
    matchId: 'm1',
    heim: 2.0,
    unentschieden: 3.4,
    auswaerts: 3.6,
    format: 'decimal'
  };

  it('boostet Spieler mit starker Form in last3 gegenüber avg', () => {
    const paramsAvg: ProjectionParams = { ...DEFAULT_PARAMS, baseMode: 'avg' };
    const paramsLast3: ProjectionParams = { ...DEFAULT_PARAMS, baseMode: 'last3' };
    const avgProjection = computeProjections([player], [match], [odds], paramsAvg)[0];
    const last3Projection = computeProjections([player], [match], [odds], paramsLast3)[0];
    expect(last3Projection.p_pred).toBeGreaterThan(avgProjection.p_pred);
  });

  it('neutralisiert Odds bei w_odds = 0', () => {
    const paramsWithOdds: ProjectionParams = { ...DEFAULT_PARAMS, baseMode: 'avg', w_odds: 0 };
    const withOdds = computeProjections([player], [match], [odds], paramsWithOdds)[0];
    const paramsZeroOdds: ProjectionParams = { ...DEFAULT_PARAMS, baseMode: 'avg', w_odds: 0 };
    const withoutOdds = computeProjections([player], [match], [], paramsZeroOdds)[0];
    expect(withOdds.p_pred).toBeCloseTo(withoutOdds.p_pred, 6);
  });
});

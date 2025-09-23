import { describe, expect, it } from 'vitest';

import { FORMATIONS } from '../../lib/constants';
import { computeProjections } from '../../lib/projection';
import { optimizeAuto, optimizeForFormation } from '../../lib/optimization';
import type { Match, Odds, Player, ProjectionParams } from '../../lib/types';

function createPlayers(): Player[] {
  const teams = ['FC Atlas', 'SV Comet', 'Union Helios', 'Bayern Nova'];
  const players: Player[] = [];
  let id = 1;
  for (const team of teams) {
    // GK
    players.push(createPlayer(id++, team, 'GK', 5_000_000, [70, 75, 72, 80, 78]));
    // DEF
    for (let i = 0; i < 6; i++) {
      players.push(createPlayer(id++, team, 'DEF', 6_000_000 + i * 250_000, [65 + i * 2, 70 + i, 68 + i, 75 + i, 72 + i]));
    }
    // MID
    for (let i = 0; i < 6; i++) {
      players.push(createPlayer(id++, team, 'MID', 8_000_000 + i * 300_000, [80 + i * 3, 78 + i * 2, 82 + i * 2, 85 + i * 2, 88 + i * 2]));
    }
    // FWD
    for (let i = 0; i < 3; i++) {
      players.push(createPlayer(id++, team, 'FWD', 11_000_000 + i * 400_000, [90 + i * 4, 95 + i * 3, 98 + i * 3, 102 + i * 3, 99 + i * 2]));
    }
  }
  return players;
}

function createPlayer(
  id: number,
  team: string,
  position: Player['position'],
  cost: number,
  points: number[]
): Player {
  const avg = points.reduce((a, b) => a + b, 0) / points.length;
  return {
    id: `p-${id}`,
    name: `${team} ${position} ${id}`,
    position,
    verein: team,
    kosten: cost,
    punkte_hist: points,
    punkte_avg: avg,
    punkte_sum: points.reduce((a, b) => a + b, 0),
    minutes_hist: [90, 88, 87, 90, 85]
  };
}

describe('Optimize', () => {
  const players = createPlayers();
  const matches: Match[] = [
    { id: 'm1', spieltag: 1, heim: 'FC Atlas', auswaerts: 'SV Comet' },
    { id: 'm2', spieltag: 1, heim: 'Union Helios', auswaerts: 'Bayern Nova' }
  ];
  const odds: Odds[] = [
    { matchId: 'm1', heim: 2.1, unentschieden: 3.3, auswaerts: 3.4, format: 'decimal' },
    { matchId: 'm2', heim: 2.5, unentschieden: 3.4, auswaerts: 2.9, format: 'decimal' }
  ];
  const params: ProjectionParams = {
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

  it('berechnet eine gültige Aufstellung über Auto-Formation', async () => {
    const projections = computeProjections(players, matches, odds, params);
    const bannedPlayer = players[0];
    const result = await optimizeAuto(players, projections, 150_000_000, [bannedPlayer.id]);
    expect(result).toBeTruthy();
    expect(result?.lineup).toHaveLength(11);

    const counts = result!.lineup.reduce(
      (acc, player) => {
        acc[player.position] = (acc[player.position] ?? 0) + 1;
        return acc;
      },
      { GK: 0, DEF: 0, MID: 0, FWD: 0 } as Record<Player['position'], number>
    );
    expect(counts.GK).toBe(1);
    const formation = result!.formation;
    expect(counts.DEF).toBe(FORMATIONS[formation].DEF);
    expect(counts.MID).toBe(FORMATIONS[formation].MID);
    expect(counts.FWD).toBe(FORMATIONS[formation].FWD);

    const totalCost = result!.lineup.reduce((acc, player) => acc + player.kosten, 0);
    expect(totalCost).toBeLessThanOrEqual(150_000_000);
    expect(result!.lineup.find((player) => player.playerId === bannedPlayer.id)).toBeUndefined();

    const manualResults = await Promise.all(
      Object.keys(FORMATIONS).map((form) =>
        optimizeForFormation(projections, form as keyof typeof FORMATIONS, {
          formation: form as keyof typeof FORMATIONS,
          budget: 150_000_000,
          blacklist: new Set([bannedPlayer.id])
        })
      )
    );
    const bestManual = manualResults.filter(Boolean).reduce((max, current) => {
      const value = current!.objective;
      return value > max ? value : max;
    }, -Infinity);
    expect(result!.objective).toBeGreaterThanOrEqual(bestManual);
  });
});

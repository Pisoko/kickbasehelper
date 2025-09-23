import GLPK from 'glpk.js';

import { FORMATIONS } from './constants';
import type { Formation, OptimizationResult, PlayerProjection, Player } from './types';

interface OptimizeOptions {
  formation: Formation;
  budget: number;
  blacklist: Set<string>;
}

export async function optimizeForFormation(
  projections: PlayerProjection[],
  formation: Formation,
  options: OptimizeOptions
): Promise<OptimizationResult | null> {
  const glpk = await GLPK();
  const players = projections.filter((p) => !options.blacklist.has(p.id));
  const formationConstraints = FORMATIONS[formation];
  const rows: Parameters<typeof glpk.solve>[0]['subjectTo'] = [
    {
      name: 'exact11',
      vars: players.map((p, idx) => ({ name: `x_${idx}`, coef: 1 })),
      bnds: { type: glpk.GLP_FX, ub: 11, lb: 11 }
    },
    {
      name: 'budget',
      vars: players.map((p, idx) => ({ name: `x_${idx}`, coef: p.kosten })),
      bnds: { type: glpk.GLP_UP, ub: options.budget, lb: 0 }
    },
    {
      name: 'gk',
      vars: players
        .map((p, idx) => (p.position === 'GK' ? { name: `x_${idx}`, coef: 1 } : null))
        .filter(Boolean) as { name: string; coef: number }[],
      bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
    },
    {
      name: 'def',
      vars: players
        .map((p, idx) => (p.position === 'DEF' ? { name: `x_${idx}`, coef: 1 } : null))
        .filter(Boolean) as { name: string; coef: number }[],
      bnds: { type: glpk.GLP_FX, lb: formationConstraints.DEF, ub: formationConstraints.DEF }
    },
    {
      name: 'mid',
      vars: players
        .map((p, idx) => (p.position === 'MID' ? { name: `x_${idx}`, coef: 1 } : null))
        .filter(Boolean) as { name: string; coef: number }[],
      bnds: { type: glpk.GLP_FX, lb: formationConstraints.MID, ub: formationConstraints.MID }
    },
    {
      name: 'fwd',
      vars: players
        .map((p, idx) => (p.position === 'FWD' ? { name: `x_${idx}`, coef: 1 } : null))
        .filter(Boolean) as { name: string; coef: number }[],
      bnds: { type: glpk.GLP_FX, lb: formationConstraints.FWD, ub: formationConstraints.FWD }
    }
  ];

  const cols = players.map((p, idx) => ({
    name: `x_${idx}`,
    kind: glpk.GLP_BV,
    obj: p.p_pred
  }));

  const result = glpk.solve({
    name: `opt_${formation}`,
    objective: {
      direction: glpk.GLP_MAX,
      name: 'objective',
      vars: players.map((p, idx) => ({ name: `x_${idx}`, coef: p.p_pred }))
    },
    subjectTo: rows,
    binaries: cols.map((col) => col.name)
  });

  if (result.result.status !== glpk.GLP_OPT && result.result.status !== glpk.GLP_FEAS) {
    return greedyFallback(players, formation, options.budget);
  }

  const lineup: OptimizationResult['lineup'] = [];
  let costSum = 0;
  let objective = 0;
  players.forEach((player, idx) => {
    const value = result.result.vars[`x_${idx}`];
    if (value === 1) {
      lineup.push({
        playerId: player.id,
        name: player.name,
        position: player.position,
        verein: player.verein,
        kosten: player.kosten,
        p_pred: player.p_pred,
        value: player.value
      });
      costSum += player.kosten;
      objective += player.p_pred;
    }
  });

  if (lineup.length !== 11) {
    return greedyFallback(players, formation, options.budget);
  }

  return {
    formation,
    lineup,
    objective,
    restbudget: options.budget - costSum
  };
}

function greedyFallback(players: PlayerProjection[], formation: Formation, budget: number): OptimizationResult | null {
  const formationConstraints = FORMATIONS[formation];
  const grouped: Record<string, PlayerProjection[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: []
  };
  for (const player of players) {
    grouped[player.position].push(player);
  }
  Object.values(grouped).forEach((arr) => arr.sort((a, b) => b.value - a.value));
  const counts: Record<string, number> = {
    GK: 1,
    DEF: formationConstraints.DEF,
    MID: formationConstraints.MID,
    FWD: formationConstraints.FWD
  };
  const lineup: OptimizationResult['lineup'] = [];
  let costSum = 0;
  let objective = 0;
  for (const pos of Object.keys(grouped) as (keyof typeof grouped)[]) {
    const need = counts[pos];
    const picks = grouped[pos].slice(0, need);
    picks.forEach((player) => {
      lineup.push({
        playerId: player.id,
        name: player.name,
        position: player.position,
        verein: player.verein,
        kosten: player.kosten,
        p_pred: player.p_pred,
        value: player.value
      });
      costSum += player.kosten;
      objective += player.p_pred;
    });
  }
  if (lineup.length !== 11 || costSum > budget) {
    return null;
  }
  return {
    formation,
    lineup,
    objective,
    restbudget: budget - costSum
  };
}

export async function optimizeAuto(
  players: Player[],
  projections: PlayerProjection[],
  budget: number,
  blacklist: string[],
  manualFormation?: Formation
): Promise<OptimizationResult | null> {
  const blacklistSet = new Set(blacklist);
  const projectionMap = new Map(projections.map((p) => [p.id, p]));
  const relevant = players
    .map((player) => projectionMap.get(player.id))
    .filter((p): p is PlayerProjection => Boolean(p));

  const formations = manualFormation ? [manualFormation] : (Object.keys(FORMATIONS) as Formation[]);
  let best: OptimizationResult | null = null;
  for (const formation of formations) {
    const res = await optimizeForFormation(relevant, formation, {
      formation,
      budget,
      blacklist: blacklistSet
    });
    if (res && (!best || res.objective > best.objective)) {
      best = res;
    }
  }
  return best;
}

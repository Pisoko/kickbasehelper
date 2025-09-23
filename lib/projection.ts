import { clamp } from 'lodash';

import type { Match, Odds, Player, PlayerProjection, ProjectionParams } from './types';

interface FeatureOptions {
  baseMode: ProjectionParams['baseMode'];
  matches: Match[];
  odds: Odds[];
  params: ProjectionParams;
}

function probabilityFromOdds(odds: Odds) {
  if (odds.format === 'prob') {
    const total = odds.heim + odds.unentschieden + odds.auswaerts;
    if (total === 0) {
      return { win: 0, draw: 0, loss: 0 };
    }
    return { win: odds.heim / total, draw: odds.unentschieden / total, loss: odds.auswaerts / total };
  }
  const inverse = [odds.heim, odds.unentschieden, odds.auswaerts].map((o) => (o > 0 ? 1 / o : 0));
  const sum = inverse.reduce((acc, val) => acc + val, 0);
  if (sum === 0) {
    return { win: 0, draw: 0, loss: 0 };
  }
  return {
    win: inverse[0] / sum,
    draw: inverse[1] / sum,
    loss: inverse[2] / sum
  };
}

function zScore(value: number, mean: number, std: number) {
  if (std === 0) {
    return 0;
  }
  return (value - mean) / std;
}

function rollingAverage(values: number[], window: number) {
  if (values.length === 0) {
    return 0;
  }
  const slice = values.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function baseScore(player: Player, mode: ProjectionParams['baseMode']) {
  switch (mode) {
    case 'sum':
      return player.punkte_sum;
    case 'last3':
      return rollingAverage(player.punkte_hist, 3);
    case 'avg':
    default:
      return player.punkte_avg;
  }
}

export function computePlayerProjection(
  player: Player,
  options: FeatureOptions
): PlayerProjection {
  const { matches, odds, params, baseMode } = options;
  const base = baseScore(player, baseMode);
  const last3 = rollingAverage(player.punkte_hist, 3);
  const varianceSum = player.punkte_hist.reduce((acc, val) => acc + Math.pow(val - player.punkte_avg, 2), 0);
  const formStd = player.punkte_hist.length > 1 ? Math.sqrt(varianceSum / player.punkte_hist.length) : 0;
  const formBoost = zScore(last3, player.punkte_avg, formStd || 1);
  const match = matches.find((m) => m.heim === player.verein || m.auswaerts === player.verein);
  const oddsEntry = odds.find((o) => o.matchId === match?.id);
  const { win, draw, loss } = oddsEntry ? probabilityFromOdds(oddsEntry) : { win: 0, draw: 0, loss: 0 };
  const oddsModifier = params.w_odds === 0 ? 0 : params.alpha * win + params.beta * draw - params.gamma * loss;
  const homeBonus = match && match.heim === player.verein ? 1 : 0;
  const minutesWeight = player.minutes_hist && player.minutes_hist.length > 0
    ? clamp(player.minutes_hist.reduce((a, b) => a + b, 0) / (player.minutes_hist.length * 90), 0, 1)
    : 1;
  const riskPenalty = 0; // Placeholder für echte Risikodaten

  const p_pred =
    params.w_base * base +
    params.w_form * formBoost +
    params.w_odds * oddsModifier +
    params.w_home * homeBonus +
    params.w_minutes * minutesWeight -
    params.w_risk * riskPenalty;

  const value = player.kosten > 0 ? p_pred / player.kosten : 0;

  return {
    ...player,
    p_pred,
    value,
    minutesWeight,
    formBoost,
    oddsModifier,
    homeBonus
  };
}

export function computeProjections(
  players: Player[],
  matches: Match[],
  odds: Odds[],
  params: ProjectionParams
) {
  return players.map((player) =>
    computePlayerProjection(player, {
      matches,
      odds,
      params,
      baseMode: params.baseMode
    })
  );
}

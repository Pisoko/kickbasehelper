import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DEFAULT_PARAMS, FORMATION_LIST } from '../../../lib/constants';
import { readCache } from '../../../lib/data';
import { computeProjections } from '../../../lib/projection';
import { optimizeAuto } from '../../../lib/optimization';
import type { ProjectionParams } from '../../../lib/types';

const weightSchema = z.object({
  w_base: z.number(),
  w_form: z.number(),
  w_odds: z.number(),
  w_home: z.number(),
  w_minutes: z.number(),
  w_risk: z.number(),
  alpha: z.number(),
  beta: z.number(),
  gamma: z.number()
});

const requestSchema = z.object({
  spieltag: z.number().min(1),
  formation: z.union([z.literal('auto'), z.enum(FORMATION_LIST)]),
  budget: z.number().positive(),
  baseMode: z.enum(['avg', 'sum', 'last3']),
  weights: weightSchema,
  blacklist: z.array(z.string()).default([])
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() }, { status: 400 });
  }
  const { spieltag, formation, budget, baseMode, weights, blacklist } = parsed.data;
  const cache = readCache(spieltag);
  if (!cache) {
    return NextResponse.json({ error: 'Keine Daten im Cache' }, { status: 404 });
  }
  const params: ProjectionParams = {
    ...DEFAULT_PARAMS,
    baseMode,
    ...weights
  };
  const odds = cache.odds ?? [];
  const projections = computeProjections(cache.players, cache.matches, odds, params);
  const result = await optimizeAuto(
    cache.players,
    projections,
    budget,
    blacklist,
    formation === 'auto' ? undefined : formation
  );
  if (!result) {
    return NextResponse.json({ error: 'Keine Lösung gefunden' }, { status: 422 });
  }
  return NextResponse.json({
    formation: result.formation,
    lineup: result.lineup,
    objective: result.objective,
    restbudget: result.restbudget
  });
}

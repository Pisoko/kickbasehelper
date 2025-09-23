import { argv, exit } from 'node:process';
import { config } from 'dotenv';

import pino from 'pino';

// Load environment variables from .env.local
config({ path: '.env.local' });

import { cacheAgeDays, readCache, writeCache } from '../lib/data';
import { KickbaseAdapter } from '../lib/adapters/KickbaseAdapter';
import { createOddsAdapter } from '../lib/adapters/OddsProvider';
import type { Match, Player, Odds, OddsProvider } from '../lib/types';

const logger = pino({ name: 'fetchData' });

interface FetchOptions {
  force?: boolean;
  season?: string;
}

export async function fetchMatchdayData(spieltag: number, options: FetchOptions = {}) {
  const cache = readCache(spieltag, options.season);
  const age = cacheAgeDays(spieltag, options.season);
  if (cache && age !== null && age <= 7 && !options.force) {
    logger.info({ spieltag, age }, 'Cache noch frisch, verwende gespeicherte Daten');
    return { ...cache, cacheAge: age, fromCache: true };
  }

  const baseUrl = process.env.KICKBASE_BASE ?? '';
  const apiKey = process.env.KICKBASE_KEY ?? '';
  const oddsProvider = (process.env.ODDS_PROVIDER as OddsProvider) ?? 'none';
  const oddsKey = process.env.ODDS_API_KEY;
  const useMock = !baseUrl || !apiKey;

  let players: Player[] = [];
  let matches: Match[] = [];
  let odds: Odds[] = [];

  if (useMock) {
    const mock = generateMockData(spieltag);
    players = mock.players;
    matches = mock.matches;
    odds = mock.odds;
  } else {
    const adapter = new KickbaseAdapter(baseUrl, apiKey);
    players = await adapter.getPlayers(spieltag);
    matches = await adapter.getMatches(spieltag);
    const adapterOdds = await createOddsAdapter(oddsProvider, oddsKey);
    odds = await adapterOdds.fetchOdds(matches);
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    players,
    matches,
    odds
  };
  writeCache(spieltag, payload, options.season);
  return { ...payload, cacheAge: 0, fromCache: false };
}

function generateMockData(spieltag: number) {
  const teams = ['FC Atlas', 'SV Comet', 'Union Helios', 'Bayern Nova', 'SC Polaris', 'Dynamo Eclipse'];
  const positions: { pos: Player['position']; count: number; basePoints: number; baseCost: number }[] = [
    { pos: 'GK', count: 1, basePoints: 65, baseCost: 5_000_000 },
    { pos: 'DEF', count: 4, basePoints: 78, baseCost: 7_500_000 },
    { pos: 'MID', count: 3, basePoints: 95, baseCost: 8_500_000 },
    { pos: 'FWD', count: 2, basePoints: 110, baseCost: 12_000_000 }
  ];
  const players: Player[] = [];
  let counter = 1;
  for (const team of teams) {
    for (const { pos, count, basePoints, baseCost } of positions) {
      for (let i = 0; i < count; i++) {
        const variation = (counter % 7) * 3;
        const hist = Array.from({ length: 5 }, (_, idx) => basePoints + variation - idx * 2 + (idx % 2 === 0 ? 4 : -3));
        const minutes = Array.from({ length: 5 }, (_, idx) => 70 + ((counter + idx * 3) % 21));
        const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
        const sum = hist.reduce((a, b) => a + b, 0);
        const cost = baseCost + variation * 120_000 + i * 90_000;
        players.push({
          id: `mock-${spieltag}-${counter}`,
          name: `${team} ${pos} ${i + 1}`,
          position: pos,
          verein: team,
          kosten: cost,
          punkte_hist: hist,
          punkte_avg: avg,
          punkte_sum: sum,
          minutes_hist: minutes
        });
        counter += 1;
      }
    }
  }

  const matches: Match[] = [
    {
      id: `match-${spieltag}-1`,
      spieltag,
      heim: teams[0],
      auswaerts: teams[1],
      kickoff: new Date(Date.now() + 3600_000).toISOString()
    },
    {
      id: `match-${spieltag}-2`,
      spieltag,
      heim: teams[2],
      auswaerts: teams[3],
      kickoff: new Date(Date.now() + 7200_000).toISOString()
    },
    {
      id: `match-${spieltag}-3`,
      spieltag,
      heim: teams[4],
      auswaerts: teams[5],
      kickoff: new Date(Date.now() + 10_800_000).toISOString()
    }
  ];

  const odds: Odds[] = matches.map((match, idx) => ({
    matchId: match.id,
    heim: 2.1 + idx * 0.1,
    unentschieden: 3.3 + idx * 0.2,
    auswaerts: 3.0 + idx * 0.15,
    format: 'decimal'
  }));

  return { players, matches, odds };
}

async function main() {
  const args = argv.slice(2);
  const spieltagArgIndex = args.findIndex((arg) => arg === '--spieltag');
  const force = args.includes('--force');
  let spieltag = 1;
  if (spieltagArgIndex !== -1 && args[spieltagArgIndex + 1]) {
    spieltag = Number(args[spieltagArgIndex + 1]);
  }
  if (!Number.isFinite(spieltag) || spieltag < 1) {
    logger.error('Bitte --spieltag <nummer> angeben');
    exit(1);
  }
  await fetchMatchdayData(spieltag, { force });
  logger.info({ spieltag }, 'Daten erfolgreich aktualisiert');
}

if (import.meta.url === `file://${__filename}`) {
  main().catch((error) => {
    logger.error(error);
    exit(1);
  });
}

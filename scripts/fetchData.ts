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
  // No mock data allowed - only live API data
  if (!baseUrl || !apiKey) {
    throw new Error('KICKBASE_BASE and KICKBASE_KEY environment variables are required - no mock data allowed');
  }

  let players: Player[] = [];
  let matches: Match[] = [];
  let odds: Odds[] = [];

  const adapter = new KickbaseAdapter(baseUrl, apiKey);
  
  // Test the new optimized method
  logger.info('Testing new optimized player fetching method...');
  players = await adapter.getAllPlayersFromTeamsOptimized();
  logger.info(`Fetched ${players.length} players using optimized method`);
  
  matches = await adapter.getMatches(spieltag);
  const adapterOdds = await createOddsAdapter(oddsProvider, oddsKey);
  odds = await adapterOdds.fetchOdds(matches);

  const payload = {
    updatedAt: new Date().toISOString(),
    players,
    matches,
    odds
  };
  writeCache(spieltag, payload, options.season);
  return { ...payload, cacheAge: 0, fromCache: false };
}

// Mock data generation removed - only live API data allowed

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

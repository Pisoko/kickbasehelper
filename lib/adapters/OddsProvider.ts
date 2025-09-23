import pino from 'pino';

import type { Match, Odds, OddsProvider } from '../types';

const logger = pino({ name: 'OddsProvider' });

export interface OddsAdapter {
  fetchOdds(matches: Match[]): Promise<Odds[]>;
}

export class NoOddsAdapter implements OddsAdapter {
  async fetchOdds(matches: Match[]): Promise<Odds[]> {
    return matches.map((match) => ({
      matchId: match.id,
      heim: 0,
      unentschieden: 0,
      auswaerts: 0,
      format: 'decimal'
    }));
  }
}

export async function createOddsAdapter(provider: OddsProvider, apiKey?: string): Promise<OddsAdapter> {
  if (provider === 'external') {
    if (!apiKey) {
      logger.warn('Externer Odds Provider ohne API-Key, fallback auf none');
      return new NoOddsAdapter();
    }
    const { ExternalOddsAdapter } = await import('./external/ExternalOddsAdapter');
    return new ExternalOddsAdapter(apiKey);
  }
  return new NoOddsAdapter();
}

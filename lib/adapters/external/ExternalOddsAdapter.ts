import type { Match, Odds } from '../../types';
import type { OddsAdapter } from '../OddsProvider';

export class ExternalOddsAdapter implements OddsAdapter {
  constructor(private readonly apiKey: string) {}

  async fetchOdds(matches: Match[]): Promise<Odds[]> {
    // Placeholder-Implementierung: Integriere hier eine echte Quoten-API.
    return matches.map((match) => ({
      matchId: match.id,
      heim: 2.2,
      unentschieden: 3.4,
      auswaerts: 3.1,
      format: 'decimal'
    }));
  }
}

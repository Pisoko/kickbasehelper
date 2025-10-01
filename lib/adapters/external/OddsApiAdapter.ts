import type { Match, Odds } from '../../types';
import type { OddsAdapter } from '../OddsProvider';
import pino from 'pino';

const logger = pino({ name: 'OddsApiAdapter' });

interface OddsApiResponse {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    last_update: string;
    markets: Array<{
      key: string;
      last_update: string;
      outcomes: Array<{
        name: string;
        price: number;
      }>;
    }>;
  }>;
}

/**
 * Adapter für die Odds API (the-odds-api.com) für Bundesliga-Wettquoten
 * Unterstützt Head-to-Head (1X2) Märkte mit europäischen Buchmachern
 */
export class OddsApiAdapter implements OddsAdapter {
  private readonly baseUrl = 'https://api.the-odds-api.com/v4';
  private readonly sport = 'soccer_germany_bundesliga';
  private readonly regions = 'eu'; // Europäische Buchmacher
  private readonly markets = 'h2h'; // Head-to-Head (1X2)
  
  constructor(private readonly apiKey: string) {}

  async fetchOdds(matches: Match[]): Promise<Odds[]> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      logger.warn('Odds API key not configured, falling back to mock odds');
      return this.generateMockOdds(matches);
    }

    try {
      logger.info({ matchCount: matches.length }, 'Fetching Bundesliga odds from Odds API');
      
      const response = await fetch(
        `${this.baseUrl}/sports/${this.sport}/odds/?regions=${this.regions}&markets=${this.markets}&apiKey=${this.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        logger.error({ status: response.status, statusText: response.statusText }, 'Failed to fetch odds from Odds API');
        return this.generateMockOdds(matches);
      }

      const apiData: OddsApiResponse[] = await response.json();
      logger.info({ apiMatchCount: apiData.length }, 'Successfully fetched odds from Odds API');
      
      return this.mapApiResponseToOdds(matches, apiData);
    } catch (error) {
      logger.error({ error }, 'Error fetching odds from Odds API');
      return this.generateMockOdds(matches);
    }
  }

  private mapApiResponseToOdds(matches: Match[], apiData: OddsApiResponse[]): Odds[] {
    const odds: Odds[] = [];

    for (const match of matches) {
      // Finde entsprechendes Spiel in der API-Antwort
      const apiMatch = apiData.find(apiGame => 
          this.teamNamesMatch(match.heim, apiGame.home_team) &&
          this.teamNamesMatch(match.auswaerts, apiGame.away_team)
        );

      if (apiMatch && apiMatch.bookmakers.length > 0) {
        // Verwende den ersten verfügbaren Buchmacher mit h2h-Markt
        const bookmaker = apiMatch.bookmakers.find(bm => 
          bm.markets.some(market => market.key === 'h2h')
        );

        if (bookmaker) {
          const h2hMarket = bookmaker.markets.find(market => market.key === 'h2h');
          
          if (h2hMarket && h2hMarket.outcomes.length >= 3) {
            // Finde die Quoten für Heim, Unentschieden, Auswärts
            const homeOdds = h2hMarket.outcomes.find(outcome => 
              this.teamNamesMatch(match.heim, outcome.name)
            );
            const awayOdds = h2hMarket.outcomes.find(outcome => 
                this.teamNamesMatch(match.auswaerts, outcome.name)
            );
            const drawOdds = h2hMarket.outcomes.find(outcome => 
              outcome.name.toLowerCase() === 'draw'
            );

            if (homeOdds && awayOdds && drawOdds) {
              odds.push({
                matchId: match.id,
                heim: homeOdds.price,
                unentschieden: drawOdds.price,
                auswaerts: awayOdds.price,
                format: 'decimal'
              });

              logger.debug({
                matchId: match.id,
                homeTeam: match.heim,
                awayTeam: match.auswaerts,
                bookmaker: bookmaker.title,
                odds: { home: homeOdds.price, draw: drawOdds.price, away: awayOdds.price }
              }, 'Mapped odds for match');
            }
          }
        }
      }

      // Fallback zu Mock-Odds wenn keine API-Daten verfügbar
      if (!odds.find(o => o.matchId === match.id)) {
        odds.push(this.generateMockOddsForMatch(match));
        logger.debug({ matchId: match.id }, 'Using mock odds for match (no API data)');
      }
    }

    return odds;
  }

  /**
   * Überprüft, ob zwei Teamnamen übereinstimmen
   * Berücksichtigt verschiedene Schreibweisen und Abkürzungen
   */
  private teamNamesMatch(kickbaseName: string, apiName: string): boolean {
    const normalize = (name: string) => name
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const kickbaseNorm = normalize(kickbaseName);
    const apiNorm = normalize(apiName);

    // Exakte Übereinstimmung
    if (kickbaseNorm === apiNorm) return true;

    // Mapping für bekannte Unterschiede
    const teamMappings: { [key: string]: string[] } = {
      'fc bayern münchen': ['bayern munich', 'bayern münchen', 'fc bayern'],
      'borussia dortmund': ['dortmund', 'bvb'],
      'rb leipzig': ['leipzig', 'rasenballsport leipzig'],
      'bayer 04 leverkusen': ['bayer leverkusen', 'leverkusen'],
      'eintracht frankfurt': ['frankfurt', 'eintracht'],
      'borussia mönchengladbach': ['mönchengladbach', 'gladbach', 'borussia mgladbach'],
      'vfl wolfsburg': ['wolfsburg'],
      'sc freiburg': ['freiburg'],
      'tsg 1899 hoffenheim': ['hoffenheim', 'tsg hoffenheim'],
      'vfb stuttgart': ['stuttgart'],
      '1 fc union berlin': ['union berlin', 'fc union berlin'],
      'sv werder bremen': ['werder bremen', 'bremen'],
      '1 fsv mainz 05': ['mainz', 'mainz 05'],
      'fc augsburg': ['augsburg'],
      'vfl bochum': ['bochum'],
      '1 fc heidenheim 1846': ['heidenheim', 'fc heidenheim'],
      'fc st pauli': ['st pauli'],
      'holstein kiel': ['kiel']
    };

    // Prüfe Mappings
    for (const [canonical, variants] of Object.entries(teamMappings)) {
      if (kickbaseNorm === canonical || variants.includes(kickbaseNorm)) {
        if (apiNorm === canonical || variants.includes(apiNorm)) {
          return true;
        }
      }
    }

    // Teilstring-Übereinstimmung als letzter Ausweg
    return kickbaseNorm.includes(apiNorm) || apiNorm.includes(kickbaseNorm);
  }

  private generateMockOdds(matches: Match[]): Odds[] {
    return matches.map(match => this.generateMockOddsForMatch(match));
  }

  private generateMockOddsForMatch(match: Match): Odds {
    // Einfache Mock-Odds basierend auf Teamstärke
    const { home, draw, away } = this.getTeamStrength(match.heim, match.auswaerts);
    
    return {
      matchId: match.id,
      heim: home,
      unentschieden: draw,
      auswaerts: away,
      format: 'decimal'
    };
  }

  /**
   * Schätzt Teamstärke basierend auf bekannten Bundesliga-Teams
   * Gibt realistische Odds zurück
   */
  private getTeamStrength(homeTeam: string, awayTeam: string): { home: number; draw: number; away: number } {
    const teamStrengths: { [key: string]: number } = {
      'FC Bayern München': 95,
      'Borussia Dortmund': 85,
      'RB Leipzig': 80,
      'Bayer 04 Leverkusen': 78,
      'Eintracht Frankfurt': 70,
      'Borussia Mönchengladbach': 65,
      'VfL Wolfsburg': 65,
      'SC Freiburg': 62,
      'TSG 1899 Hoffenheim': 60,
      'VfB Stuttgart': 60,
      '1. FC Union Berlin': 58,
      'SV Werder Bremen': 55,
      '1. FSV Mainz 05': 52,
      'FC Augsburg': 50,
      'VfL Bochum': 45,
      '1. FC Heidenheim 1846': 42,
      'FC St. Pauli': 40,
      'Holstein Kiel': 38
    };

    const homeStrength = teamStrengths[homeTeam] || 50;
    const awayStrength = teamStrengths[awayTeam] || 50;
    
    // Heimvorteil
    const adjustedHomeStrength = homeStrength + 5;
    
    // Berechne Wahrscheinlichkeiten
    const total = adjustedHomeStrength + awayStrength;
    const homeProbability = adjustedHomeStrength / total;
    const awayProbability = awayStrength / total;
    const drawProbability = 0.25; // Feste 25% für Unentschieden
    
    // Konvertiere zu Odds (1 / Wahrscheinlichkeit)
    const homeOdds = 1 / (homeProbability * 0.75); // Reduziert um Draw-Wahrscheinlichkeit
    const awayOdds = 1 / (awayProbability * 0.75);
    const drawOdds = 1 / drawProbability;
    
    return {
      home: Math.round(homeOdds * 100) / 100,
      draw: Math.round(drawOdds * 100) / 100,
      away: Math.round(awayOdds * 100) / 100
    };
  }
}
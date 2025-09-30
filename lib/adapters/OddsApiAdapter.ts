import { Odds, Match } from '../types';

// Odds API response structure
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

export class OddsApiAdapter {
  private apiKey: string;
  private baseUrl = 'https://api.the-odds-api.com/v4';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetches odds for Bundesliga matches
   */
  async fetchOdds(matches: Match[]): Promise<Odds[]> {
    if (!this.apiKey || this.apiKey === 'YOUR_ODDS_API_KEY_HERE') {
      console.log('Odds API key not configured, using mock odds');
      return this.generateMockOdds(matches);
    }

    try {
      const url = `${this.baseUrl}/sports/soccer_germany_bundesliga/odds/?regions=eu&markets=h2h&apiKey=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
      }

      const data: OddsApiResponse[] = await response.json();
      
      return this.mapApiResponseToOdds(data, matches);
    } catch (error) {
      console.error('Error fetching odds from Odds API:', error);
      return this.generateMockOdds(matches);
    }
  }

  /**
   * Maps team names to match between different data sources
   */
  private teamNamesMatch(apiTeamName: string, matchTeamName: string): boolean {
    const normalize = (name: string) => 
      name.toLowerCase()
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    const normalizedApiName = normalize(apiTeamName);
    const normalizedMatchName = normalize(matchTeamName);
    
    // Direct match
    if (normalizedApiName === normalizedMatchName) {
      return true;
    }
    
    // Team name mappings between Odds API (English) and internal data (German)
    const teamMappings: Record<string, string[]> = {
      // Internal German name -> [Odds API English names]
      'bayern münchen': ['bayern munich', 'fc bayern munich', 'bayern'],
      'borussia dortmund': ['borussia dortmund', 'bvb', 'dortmund'],
      'rb leipzig': ['rb leipzig', 'leipzig'],
      'bayer 04 leverkusen': ['bayer leverkusen', 'bayer 04 leverkusen', 'leverkusen'],
      'eintracht frankfurt': ['eintracht frankfurt', 'frankfurt'],
      'borussia mönchengladbach': ['borussia monchengladbach', 'borussia mgladbach', 'gladbach'],
      'vfb stuttgart': ['vfb stuttgart', 'stuttgart'],
      'sc freiburg': ['sc freiburg', 'freiburg'],
      'tsg hoffenheim': ['tsg hoffenheim', 'hoffenheim'],
      '1 fc köln': ['1 fc koln', 'fc koln', 'koln'],
      'fsv mainz 05': ['fsv mainz 05', 'mainz 05', 'mainz'],
      'fc augsburg': ['fc augsburg', 'augsburg'],
      'vfl wolfsburg': ['vfl wolfsburg', 'wolfsburg'],
      'werder bremen': ['werder bremen', 'bremen'],
      '1 fc union berlin': ['1 fc union berlin', 'union berlin', 'fc union berlin'],
      '1 fc heidenheim': ['1 fc heidenheim', 'fc heidenheim', 'heidenheim'],
      'fc st pauli': ['fc st pauli', 'st pauli'],
      'hamburger sv': ['hamburger sv', 'hamburg', 'hsv']
    };

    // Check if the internal team name (matchTeamName) maps to the API team name (apiTeamName)
    for (const [internalName, apiVariations] of Object.entries(teamMappings)) {
      if (normalizedMatchName === internalName) {
        if (apiVariations.includes(normalizedApiName)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Maps API response to internal odds format
   */
  private mapApiResponseToOdds(apiData: OddsApiResponse[], matches: Match[]): Odds[] {
    const oddsMap: Odds[] = [];
    
    for (const match of matches) {
      // Find corresponding API data for this match
      const apiMatch = apiData.find(api => 
        this.teamNamesMatch(api.home_team, match.heim) && 
        this.teamNamesMatch(api.away_team, match.auswaerts)
      );

      if (apiMatch && apiMatch.bookmakers.length > 0) {
        // Use the first bookmaker's odds (could be enhanced to select best bookmaker)
        const bookmaker = apiMatch.bookmakers[0];
        const h2hMarket = bookmaker.markets.find(market => market.key === 'h2h');
        
        if (h2hMarket && h2hMarket.outcomes.length >= 3) {
          const homeOdds = h2hMarket.outcomes.find(o => o.name === apiMatch.home_team)?.price || 2.0;
          const awayOdds = h2hMarket.outcomes.find(o => o.name === apiMatch.away_team)?.price || 2.0;
          const drawOdds = h2hMarket.outcomes.find(o => o.name === 'Draw')?.price || 3.0;

          oddsMap.push({
            matchId: match.id,
            heim: homeOdds,
            unentschieden: drawOdds,
            auswaerts: awayOdds,
            format: 'decimal'
          });
        } else {
          // Fallback to mock odds if market data is incomplete
          oddsMap.push(this.generateMockOddsForMatch(match));
        }
      } else {
        // No API data found for this match, use mock odds
        oddsMap.push(this.generateMockOddsForMatch(match));
      }
    }
    
    return oddsMap;
  }

  /**
   * Generates mock odds for all matches
   */
  private generateMockOdds(matches: Match[]): Odds[] {
    return matches.map(match => this.generateMockOddsForMatch(match));
  }

  /**
   * Generates mock odds for a single match based on team strength
   */
  private generateMockOddsForMatch(match: Match): Odds {
    const homeStrength = this.getTeamStrength(match.heim);
    const awayStrength = this.getTeamStrength(match.auswaerts);
    
    // Calculate odds based on relative strength (higher strength = lower odds)
    const strengthDiff = homeStrength - awayStrength;
    const homeAdvantage = 0.1; // Small home advantage
    
    let heimOdds = 2.5 - (strengthDiff + homeAdvantage) * 0.3;
    let auswaertsOdds = 2.5 + (strengthDiff - homeAdvantage) * 0.3;
    let unentschiedenOdds = 3.2;
    
    // Ensure odds are within reasonable bounds
    heimOdds = Math.max(1.2, Math.min(5.0, heimOdds));
    auswaertsOdds = Math.max(1.2, Math.min(5.0, auswaertsOdds));
    
    return {
      matchId: match.id,
      heim: Number(heimOdds.toFixed(2)),
      unentschieden: Number(unentschiedenOdds.toFixed(2)),
      auswaerts: Number(auswaertsOdds.toFixed(2)),
      format: 'decimal'
    };
  }

  /**
   * Returns a strength rating for teams (0-1, higher is stronger)
   */
  private getTeamStrength(teamName: string): number {
    const teamStrengths: Record<string, number> = {
      'FC Bayern München': 0.95,
      'Borussia Dortmund': 0.85,
      'RB Leipzig': 0.80,
      'Bayer Leverkusen': 0.78,
      'Eintracht Frankfurt': 0.70,
      'VfL Wolfsburg': 0.65,
      'Borussia Mönchengladbach': 0.62,
      'VfB Stuttgart': 0.60,
      'SC Freiburg': 0.58,
      'TSG Hoffenheim': 0.55,
      'Union Berlin': 0.52,
      '1. FC Köln': 0.48,
      'Werder Bremen': 0.45,
      '1. FSV Mainz 05': 0.42,
      'FC Augsburg': 0.40,
      'VfL Bochum': 0.35,
      '1. FC Heidenheim': 0.30
    };
    
    return teamStrengths[teamName] || 0.5; // Default to average strength
  }
}
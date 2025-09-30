import type { Match, Odds } from '../../types';
import type { OddsAdapter } from '../OddsProvider';

interface ApiFootballOddsResponse {
  response: Array<{
    fixture: {
      id: number;
      date: string;
      status: {
        short: string;
      };
    };
    teams: {
      home: { name: string };
      away: { name: string };
    };
    bookmakers: Array<{
      name: string;
      bets: Array<{
        name: string;
        values: Array<{
          value: string;
          odd: string;
        }>;
      }>;
    }>;
  }>;
}

export class ExternalOddsAdapter implements OddsAdapter {
  private readonly baseUrl = 'https://api-football-v1.p.rapidapi.com/v3';
  private readonly bundesligaId = 78; // German Bundesliga ID
  
  constructor(private readonly apiKey: string) {}

  async fetchOdds(matches: Match[]): Promise<Odds[]> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.warn('API-Football API key not configured, falling back to mock odds');
      return this.generateMockOdds(matches);
    }

    try {
      // Get current season year
      const currentYear = new Date().getFullYear();
      const season = currentYear; // API-Football uses current year for season
      
      const response = await fetch(
        `${this.baseUrl}/odds?league=${this.bundesligaId}&season=${season}&bet=1`,
        {
          method: 'GET',
          headers: {
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
            'X-RapidAPI-Key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API-Football request failed: ${response.status}`);
      }

      const data: ApiFootballOddsResponse = await response.json();
      
      return this.mapApiResponseToOdds(matches, data);
    } catch (error) {
      console.error('Error fetching odds from API-Football:', error);
      return this.generateMockOdds(matches);
    }
  }

  private mapApiResponseToOdds(matches: Match[], apiData: ApiFootballOddsResponse): Odds[] {
    const oddsMap = new Map<string, Odds>();

    // Process API response
    apiData.response.forEach((fixture) => {
      const homeTeam = fixture.teams.home.name;
      const awayTeam = fixture.teams.away.name;
      
      // Find matching Kickbase match
      const kickbaseMatch = matches.find(match => 
        this.teamNamesMatch(match.heim, homeTeam) && 
        this.teamNamesMatch(match.auswaerts, awayTeam)
      );

      if (kickbaseMatch && fixture.bookmakers.length > 0) {
        // Get odds from first available bookmaker
        const bookmaker = fixture.bookmakers[0];
        const matchWinnerBet = bookmaker.bets.find(bet => bet.name === 'Match Winner');
        
        if (matchWinnerBet && matchWinnerBet.values.length >= 3) {
          const homeOdds = parseFloat(matchWinnerBet.values.find(v => v.value === 'Home')?.odd || '2.0');
          const drawOdds = parseFloat(matchWinnerBet.values.find(v => v.value === 'Draw')?.odd || '3.0');
          const awayOdds = parseFloat(matchWinnerBet.values.find(v => v.value === 'Away')?.odd || '3.0');

          oddsMap.set(kickbaseMatch.id, {
            matchId: kickbaseMatch.id,
            heim: homeOdds,
            unentschieden: drawOdds,
            auswaerts: awayOdds,
            format: 'decimal'
          });
        }
      }
    });

    // Fill in missing odds with mock data
    return matches.map(match => 
      oddsMap.get(match.id) || this.generateMockOddsForMatch(match)
    );
  }

  private teamNamesMatch(kickbaseName: string, apiName: string): boolean {
    // Normalize team names for comparison
    const normalize = (name: string) => 
      name.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/fc\s+/g, '')
        .replace(/\s+fc$/g, '')
        .replace(/bvb/g, 'borussia dortmund')
        .replace(/bayern munich/g, 'bayern münchen')
        .replace(/eintracht frankfurt/g, 'frankfurt')
        .trim();

    return normalize(kickbaseName).includes(normalize(apiName)) || 
           normalize(apiName).includes(normalize(kickbaseName));
  }

  private generateMockOdds(matches: Match[]): Odds[] {
    return matches.map(match => this.generateMockOddsForMatch(match));
  }

  private generateMockOddsForMatch(match: Match): Odds {
    // Generate realistic mock odds based on team strength
    const teamStrengths = this.getTeamStrength(match.heim, match.auswaerts);
    
    return {
      matchId: match.id,
      heim: teamStrengths.home,
      unentschieden: teamStrengths.draw,
      auswaerts: teamStrengths.away,
      format: 'decimal'
    };
  }

  private getTeamStrength(homeTeam: string, awayTeam: string): { home: number; draw: number; away: number } {
    // Team strength rankings (lower = stronger)
    const teamRankings: Record<string, number> = {
      'Bayern München': 1,
      'Borussia Dortmund': 2,
      'RB Leipzig': 3,
      'Bayer Leverkusen': 4,
      'Eintracht Frankfurt': 5,
      'VfL Wolfsburg': 6,
      'Borussia Mönchengladbach': 7,
      'SC Freiburg': 8,
      'TSG Hoffenheim': 9,
      'VfB Stuttgart': 10,
      '1. FC Union Berlin': 11,
      'FC Augsburg': 12,
      'Hertha BSC': 13,
      '1. FSV Mainz 05': 14,
      '1. FC Köln': 15,
      'VfL Bochum': 16,
      'SpVgg Greuther Fürth': 17,
      'Arminia Bielefeld': 18
    };

    const homeRank = teamRankings[homeTeam] || 10;
    const awayRank = teamRankings[awayTeam] || 10;
    
    // Home advantage factor
    const homeAdvantage = 0.3;
    
    // Calculate strength difference
    const strengthDiff = (awayRank - homeRank) / 5;
    
    // Base odds
    let homeOdds = 2.5 - strengthDiff - homeAdvantage;
    let awayOdds = 2.5 + strengthDiff;
    let drawOdds = 3.2;
    
    // Ensure realistic ranges
    homeOdds = Math.max(1.2, Math.min(5.0, homeOdds));
    awayOdds = Math.max(1.2, Math.min(5.0, awayOdds));
    drawOdds = Math.max(2.8, Math.min(4.0, drawOdds));
    
    return {
      home: Math.round(homeOdds * 100) / 100,
      draw: Math.round(drawOdds * 100) / 100,
      away: Math.round(awayOdds * 100) / 100
    };
  }
}

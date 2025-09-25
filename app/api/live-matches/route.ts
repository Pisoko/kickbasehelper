import { NextResponse } from 'next/server';
import { enhancedKickbaseClient } from '../../../lib/adapters/EnhancedKickbaseClient';
import { kickbaseAuth } from '../../../lib/adapters/KickbaseAuthService';

interface MatchEvent {
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty';
  minute: number;
  playerId: string;
  playerName: string;
  description: string;
}

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: 'live' | 'finished' | 'scheduled' | 'halftime';
  events: MatchEvent[];
  kickoff: string;
  competition: string;
}

function transformMatchData(apiMatch: any): LiveMatch {
  return {
    id: apiMatch.id || `match_${Date.now()}`,
    homeTeam: apiMatch.homeTeam?.name || apiMatch.homeTeam || 'Heimteam',
    awayTeam: apiMatch.awayTeam?.name || apiMatch.awayTeam || 'Auswärtsteam',
    homeScore: apiMatch.homeScore || 0,
    awayScore: apiMatch.awayScore || 0,
    minute: apiMatch.minute || 0,
    status: apiMatch.status || 'scheduled',
    events: apiMatch.events?.map((event: any) => ({
      type: event.type || 'goal',
      minute: event.minute || 0,
      playerId: event.playerId || '',
      playerName: event.playerName || 'Unbekannter Spieler',
      description: event.description || ''
    })) || [],
    kickoff: apiMatch.kickoff || new Date().toISOString(),
    competition: apiMatch.competition || 'Bundesliga'
  };
}

// Mock data for demonstration when API is not available
function generateMockMatches(): LiveMatch[] {
  const teams = [
    'Bayern München', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen',
    'Eintracht Frankfurt', 'VfL Wolfsburg', 'SC Freiburg', 'Union Berlin',
    'Borussia Mönchengladbach', 'VfB Stuttgart', 'TSG Hoffenheim', 'FC Augsburg'
  ];

  const mockMatches: LiveMatch[] = [];
  const now = new Date();

  // Generate 3-5 mock matches
  for (let i = 0; i < Math.floor(Math.random() * 3) + 3; i++) {
    const homeTeam = teams[Math.floor(Math.random() * teams.length)];
    let awayTeam = teams[Math.floor(Math.random() * teams.length)];
    while (awayTeam === homeTeam) {
      awayTeam = teams[Math.floor(Math.random() * teams.length)];
    }

    const statuses: Array<'live' | 'finished' | 'scheduled' | 'halftime'> = 
      ['live', 'finished', 'scheduled', 'halftime'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const homeScore = status === 'scheduled' ? 0 : Math.floor(Math.random() * 4);
    const awayScore = status === 'scheduled' ? 0 : Math.floor(Math.random() * 4);
    const minute = status === 'live' ? Math.floor(Math.random() * 90) + 1 : 
                   status === 'halftime' ? 45 : 
                   status === 'finished' ? 90 : 0;

    const events: MatchEvent[] = [];
    if (status !== 'scheduled') {
      // Generate some random events
      const eventCount = Math.floor(Math.random() * 5);
      for (let j = 0; j < eventCount; j++) {
        const eventTypes: Array<'goal' | 'yellow_card' | 'red_card' | 'substitution'> = 
          ['goal', 'yellow_card', 'red_card', 'substitution'];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        
        events.push({
          type: eventType,
          minute: Math.floor(Math.random() * minute) + 1,
          playerId: `player_${j}`,
          playerName: `Spieler ${j + 1}`,
          description: eventType === 'goal' ? 'Tor' : 
                      eventType === 'yellow_card' ? 'Gelbe Karte' :
                      eventType === 'red_card' ? 'Rote Karte' : 'Auswechslung'
        });
      }
    }

    const kickoffTime = new Date(now.getTime() + (i - 2) * 2 * 60 * 60 * 1000); // Spread matches over time

    mockMatches.push({
      id: `match_${i}`,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      minute,
      status,
      events: events.sort((a, b) => a.minute - b.minute),
      kickoff: kickoffTime.toISOString(),
      competition: 'Bundesliga 2025/26'
    });
  }

  return mockMatches;
}

export async function GET() {
  try {
    // Check authentication
    if (!kickbaseAuth.isTokenValid()) {
      try {
        await kickbaseAuth.refreshToken();
      } catch (authError) {
        console.warn('Authentication failed, using mock data:', authError);
        // Continue with mock data instead of failing
      }
    }

    let matches: LiveMatch[] = [];

    try {
      // Try to fetch live matches from the API
      const liveMatches = await enhancedKickbaseClient.getLiveMatches();
      matches = liveMatches.map(transformMatchData);
      
      // If no live matches, also try competition matches
      if (matches.length === 0) {
        const competitionMatches = await enhancedKickbaseClient.getCompetitionMatches();
        matches = competitionMatches.slice(0, 10).map(transformMatchData);
      }
    } catch (apiError) {
      console.warn('API error, using mock data:', apiError);
      // Fall back to mock data
      matches = generateMockMatches();
    }

    // If still no matches, use mock data
    if (matches.length === 0) {
      matches = generateMockMatches();
    }

    return NextResponse.json({
      success: true,
      matches,
      timestamp: new Date().toISOString(),
      totalMatches: matches.length,
      source: matches.length > 0 && matches[0].id.startsWith('match_') ? 'mock' : 'api'
    });

  } catch (error) {
    console.error('Live matches API error:', error);
    
    // Return mock data as fallback
    const mockMatches = generateMockMatches();
    
    return NextResponse.json({
      success: true,
      matches: mockMatches,
      timestamp: new Date().toISOString(),
      totalMatches: mockMatches.length,
      source: 'mock',
      error: 'API unavailable, showing mock data'
    });
  }
}
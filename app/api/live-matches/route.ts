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

// No mock data generation - only live API data allowed

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
      console.warn('API error:', apiError);
      // No mock data fallback - only live API data allowed
      matches = [];
    }

    // No fallback to mock data - show error if no live data available
    if (matches.length === 0) {
      console.log('No live matches available from API');
      return NextResponse.json({
        error: 'Keine Live-Spiele verfügbar',
        message: 'Die Kickbase API liefert derzeit keine Live-Spiele. Bitte versuchen Sie es später erneut.',
        dataSource: 'error',
        updatedAt: new Date().toISOString()
      }, { status: 503 });
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
    
    // No mock data fallback - only live API data allowed
    return NextResponse.json({
      error: 'Live-Spiele nicht verfügbar',
      message: 'Die Kickbase API ist derzeit nicht erreichbar. Bitte versuchen Sie es später erneut.',
      dataSource: 'error',
      updatedAt: new Date().toISOString()
    }, { status: 503 });
  }
}
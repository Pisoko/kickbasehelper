import { NextResponse } from 'next/server';
import { enhancedKickbaseClient } from '../../../lib/adapters/EnhancedKickbaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spieltag = Number(searchParams.get('spieltag') ?? '1');
    
    console.log(`Testing EnhancedKickbaseClient.getCompetitionMatchdays for spieltag ${spieltag}`);
    
    let matches: any[] = [];
    let dataSource = 'unknown';
    let apiError: string | null = null;

    // Test EnhancedKickbaseClient
    try {
      const matchdaysData = await enhancedKickbaseClient.getCompetitionMatchdays('1');
      console.log(`API call successful. Found ${matchdaysData.it?.length || 0} matchdays`);
      
      if (matchdaysData.it) {
        const matchday = matchdaysData.it.find((md: any) => md.day === spieltag);
        console.log(`Matchday ${spieltag} found:`, !!matchday);
        
        if (matchday && matchday.it) {
          matches = matchday.it.map((match: any) => ({
            id: `match-${match.i || 'unknown'}`,
            homeTeam: match.ht?.n || 'Unbekannt',
            awayTeam: match.at?.n || 'Unbekannt',
            kickoff: match.ko || new Date().toISOString(),
            homeScore: match.hg || 0,
            awayScore: match.ag || 0,
            status: match.st || 'scheduled',
            matchday: spieltag
          }));
          dataSource = 'live';
        }
      }
    } catch (error) {
      console.error('EnhancedKickbaseClient error:', error);
      apiError = error instanceof Error ? error.message : 'Unknown API error';
      dataSource = 'error';
    }

    // No fallback to mock data - show error if no live data available
    if (matches.length === 0) {
      console.log(`No matches available for matchday ${spieltag} from API`);
      dataSource = 'error';
    }

    return NextResponse.json({
      matches,
      spieltag,
      matchCount: matches.length,
      dataSource,
      apiError,
      isMockData: dataSource === 'mock',
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fehler beim Testen der Matches:', error);
    return NextResponse.json(
      { error: 'Fehler beim Testen der Matches', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// No mock data generation - only live API data allowed
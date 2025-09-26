import { NextRequest, NextResponse } from 'next/server';
import { KickbaseAdapter } from '../../../lib/adapters/KickbaseAdapter';
import { getTeamByKickbaseId } from '../../../lib/teamMapping';

const kickbaseAdapter = new KickbaseAdapter(
  process.env.KICKBASE_BASE || 'https://api.kickbase.de',
  process.env.KICKBASE_KEY || ''
);

const getTeamName = (teamId: string | number): string => {
  const teamInfo = getTeamByKickbaseId(teamId);
  return teamInfo?.fullName || `Team ${teamId}`;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  
  try {

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // Fetch performance data directly from Kickbase API
    console.log('Fetching performance data for player:', playerId);
    
    const apiKey = process.env.KICKBASE_KEY;
    if (!apiKey) {
      throw new Error('KICKBASE_KEY environment variable is not set');
    }
    
    const response = await fetch(`https://api.kickbase.com/v4/competitions/1/players/${playerId}/performance`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Kickbase API request failed: ${response.status} ${response.statusText}`);
    }
    
    const performanceData = await response.json();
    console.log('Raw performance data:', performanceData);
    console.log('Performance data type:', typeof performanceData);
    console.log('Performance data is null:', performanceData === null);
    console.log('Performance data is undefined:', performanceData === undefined);
    
    console.log(`[DEBUG] Raw performance data for player ${playerId}:`, JSON.stringify(performanceData, null, 2));
    
    // If no data is returned, throw an error to trigger mock data fallback
    if (!performanceData || !performanceData.it || !Array.isArray(performanceData.it) || performanceData.it.length === 0) {
      throw new Error('No performance data available from Kickbase API');
    }
    
    // Find current season data (2025/2026)
    const currentSeasonData = performanceData.it.find((season: any) => season.ti === "2025/2026");
    if (!currentSeasonData || !currentSeasonData.ph || !Array.isArray(currentSeasonData.ph)) {
      throw new Error('No current season (2025/2026) data found in performance data');
    }
    
    // Filter all matches up to matchday 4 (according to user requirements)
    // Include all matches where the player was potentially available, even with 0 minutes
    // This ensures transparency and shows all games, not just those with playing time
    const squadAppearances = currentSeasonData.ph.filter((match: any) => 
      match.day <= 4 && match.day >= 1
    );
    
    // Transform the match history data
    const matches = squadAppearances.map((match: any) => ({
      matchday: match.day,
      homeTeam: getTeamName(match.t1) || 'Unknown',
      awayTeam: getTeamName(match.t2) || 'Unknown',
      homeScore: match.t1g || 0,
      awayScore: match.t2g || 0,
      playerMinutes: match.mp ? parseInt(match.mp.replace("'", "")) : 0,
      playerPoints: match.p || 0,
      matchDate: match.md || new Date().toISOString(),
      playerTeam: match.pt === match.t1 ? getTeamName(match.t1) : getTeamName(match.t2)
    }));
    
    // Calculate totals and actual appearances (only games with minutes > 0)
    const actualAppearances = matches.filter((match: any) => match.playerMinutes > 0);
    const start11Appearances = matches.filter((match: any) => match.playerMinutes >= 45);
    const totalPoints = matches.reduce((sum: number, match: any) => sum + match.playerPoints, 0);
    const totalMinutes = matches.reduce((sum: number, match: any) => sum + match.playerMinutes, 0);
    const averagePoints = actualAppearances.length > 0 ? totalPoints / actualAppearances.length : 0;
    
    // Calculate total matchdays played (unique matchdays from all matches)
    const totalMatchdays = matches.length > 0 ? Math.max(...matches.map((match: any) => match.matchday)) : 4;
    
    // Transform the data to match our expected format
    const transformedData = {
      playerId,
      matches,
      totalPoints,
      totalMinutes,
      averagePoints,
      actualAppearances: actualAppearances.length,
      start11Count: start11Appearances.length,
      totalMatchdays
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error fetching player performance:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      playerId,
      baseUrl: process.env.KICKBASE_BASE,
      hasApiKey: !!process.env.KICKBASE_KEY
    });
    
    // Return mock data for demonstration
    const mockData = {
      playerId: request.nextUrl.searchParams.get('playerId'),
      matches: [
        {
          matchday: 1,
          homeTeam: 'Bayern München',
          awayTeam: 'RB Leipzig',
          homeScore: 6,
          awayScore: 0,
          playerMinutes: 91,
          playerPoints: 427,
          matchDate: '2025-08-22T18:30:00Z',
          playerTeam: 'Bayern München'
        },
        {
          matchday: 2,
          homeTeam: 'Borussia Dortmund',
          awayTeam: 'Bayern München',
          homeScore: 2,
          awayScore: 3,
          playerMinutes: 107,
          playerPoints: 273,
          matchDate: '2025-08-29T15:30:00Z',
          playerTeam: 'Bayern München'
        },
        {
          matchday: 3,
          homeTeam: 'Bayern München',
          awayTeam: 'SC Freiburg',
          homeScore: 5,
          awayScore: 0,
          playerMinutes: 69,
          playerPoints: 378,
          matchDate: '2025-09-05T18:30:00Z',
          playerTeam: 'Bayern München'
        },
        {
          matchday: 4,
          homeTeam: 'Bayer Leverkusen',
          awayTeam: 'Bayern München',
          homeScore: 1,
          awayScore: 4,
          playerMinutes: 105,
          playerPoints: 390,
          matchDate: '2025-09-12T20:30:00Z',
          playerTeam: 'Bayern München'
        }
      ],
      totalPoints: 1468,
      totalMinutes: 372,
      averagePoints: 367,
      actualAppearances: 4,
      start11Count: 4,
      totalMatchdays: 4
    };

    return NextResponse.json(mockData);
  }
}
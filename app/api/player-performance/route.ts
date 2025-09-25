import { NextRequest, NextResponse } from 'next/server';
import { KickbaseAdapter } from '../../../lib/adapters/KickbaseAdapter';

const kickbaseAdapter = new KickbaseAdapter(
  process.env.KICKBASE_API_URL || 'https://api.kickbase.com',
  process.env.KICKBASE_API_KEY || ''
);

// Team ID to name mapping (simplified version)
const getTeamName = (teamId: string): string => {
  const teamMap: Record<string, string> = {
    '1': 'Bayern München',
    '2': 'Borussia Dortmund',
    '3': 'RB Leipzig',
    '4': 'Bayer Leverkusen',
    '5': 'Eintracht Frankfurt',
    '6': 'SC Freiburg',
    '7': 'Union Berlin',
    '8': 'Borussia Mönchengladbach',
    '9': 'VfL Wolfsburg',
    '10': 'FC Augsburg',
    '11': 'TSG Hoffenheim',
    '12': 'VfB Stuttgart',
    '13': 'Werder Bremen',
    '14': 'VfL Bochum',
    '15': 'FSV Mainz 05',
    '16': 'FC Heidenheim',
    '17': 'Holstein Kiel',
    '18': 'FC St. Pauli'
  };
  return teamMap[teamId] || `Team ${teamId}`;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // Fetch player performance data from Kickbase API
    const performanceData = await kickbaseAdapter.getPlayerPerformance(playerId);
    
    console.log(`[DEBUG] Raw performance data for player ${playerId}:`, JSON.stringify(performanceData, null, 2));
    
    // If no data is returned, throw an error to trigger mock data fallback
    if (!performanceData || !performanceData.it || !Array.isArray(performanceData.it) || performanceData.it.length === 0) {
      throw new Error('No performance data available from Kickbase API');
    }
    
    // Extract current season data (first item in 'it' array)
    const currentSeasonData = performanceData.it[0];
    if (!currentSeasonData.ph || !Array.isArray(currentSeasonData.ph)) {
      throw new Error('No match history found in performance data');
    }
    
    // Transform the match history data
    const matches = currentSeasonData.ph.map((match: any, index: number) => ({
      matchday: match.day || index + 1,
      homeTeam: getTeamName(match.t1) || 'Unknown',
      awayTeam: getTeamName(match.t2) || 'Unknown',
      homeScore: match.t1g || 0,
      awayScore: match.t2g || 0,
      playerMinutes: parseInt(match.mp?.replace("'", "") || "0"),
      playerPoints: match.p || 0,
      matchDate: match.md || new Date().toISOString(),
      playerTeam: match.pt === match.t1 ? getTeamName(match.t1) : getTeamName(match.t2)
    }));
    
    // Calculate totals
    const totalPoints = matches.reduce((sum: number, match: any) => sum + match.playerPoints, 0);
    const totalMinutes = matches.reduce((sum: number, match: any) => sum + match.playerMinutes, 0);
    const averagePoints = matches.length > 0 ? totalPoints / matches.length : 0;
    
    // Transform the data to match our expected format
    const transformedData = {
      playerId,
      matches,
      totalPoints,
      totalMinutes,
      averagePoints
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error fetching player performance:', error);
    
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
      averagePoints: 367
    };

    return NextResponse.json(mockData);
  }
}
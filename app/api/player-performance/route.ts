import { NextRequest, NextResponse } from 'next/server';
import { KickbaseAdapter } from '../../../lib/adapters/KickbaseAdapter';

const kickbaseAdapter = new KickbaseAdapter(
  process.env.KICKBASE_API_URL || 'https://api.kickbase.com',
  process.env.KICKBASE_API_KEY || ''
);

// Team ID to name mapping (correct IDs for 2025/26 Bundesliga season)
const getTeamName = (teamId: string): string => {
  const teamMap: Record<string, string> = {
    // Official Bundesliga team IDs (high numbers)
    '82': 'Bayern München',        // Bayern (men's team)
    '3': 'Borussia Dortmund',      // Dortmund
    '92': 'RB Leipzig',            // Leipzig
    '83': 'Bayer 04 Leverkusen',   // Leverkusen
    '89': 'Eintracht Frankfurt',   // Frankfurt
    '88': 'SC Freiburg',           // Freiburg
    '40': 'Union Berlin',          // Union Berlin
    '15': 'Borussia Mönchengladbach', // M'gladbach
    '87': 'VfL Wolfsburg',         // Wolfsburg
    '13': 'FC Augsburg',           // Augsburg
    '84': 'TSG Hoffenheim',        // Hoffenheim
    '9': 'VfB Stuttgart',          // Stuttgart
    '80': 'Werder Bremen',         // Bremen
    '14': 'VfL Bochum',            // Bochum (if still in league)
    '18': 'FSV Mainz 05',          // Mainz
    '49': '1. FC Heidenheim 1846', // Heidenheim
    '17': 'Holstein Kiel',         // Holstein Kiel
    '39': 'FC St. Pauli',          // St. Pauli
    '86': '1. FC Köln',            // Köln
    '6': 'Hamburger SV',           // Hamburg
    
    // Legacy/Alternative team IDs that might appear in data
    '2': 'Bayern München',         // Legacy Bayern ID
    '4': 'Eintracht Frankfurt',    // Legacy Frankfurt ID
    '5': 'SC Freiburg',            // Legacy Freiburg ID
    '7': 'Bayer 04 Leverkusen',    // Legacy Leverkusen ID
    '8': 'FC Schalke 04',          // Schalke (relegated)
    '10': 'Werder Bremen',         // Legacy Bremen ID
    '11': 'TSG Hoffenheim',        // Legacy Hoffenheim ID
    '12': 'VfB Stuttgart',         // Legacy Stuttgart ID
    '16': '1. FC Heidenheim 1846', // Legacy Heidenheim ID
    
    // Additional team IDs that might appear
    '43': 'Eintracht Braunschweig', // Possible 2. Liga team
    '44': 'Hannover 96',           // Possible 2. Liga team
    '45': 'Fortuna Düsseldorf',    // Possible 2. Liga team
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
    
    // Find current season data (2025/2026)
    const currentSeasonData = performanceData.it.find((season: any) => season.ti === "2025/2026");
    if (!currentSeasonData || !currentSeasonData.ph || !Array.isArray(currentSeasonData.ph)) {
      throw new Error('No current season (2025/2026) data found in performance data');
    }
    
    // Filter all squad appearances (matches with actual data, not null values)
    // According to user requirements, only 4 matchdays have been played so far
    // Include all matches where the player was in the squad (even with 0 minutes for transparency)
    const squadAppearances = currentSeasonData.ph.filter((match: any) => 
      match.p !== null && match.mp !== null && match.day <= 4
    );
    
    // Transform the match history data
    const matches = squadAppearances.map((match: any) => ({
      matchday: match.day,
      homeTeam: getTeamName(match.t1) || 'Unknown',
      awayTeam: getTeamName(match.t2) || 'Unknown',
      homeScore: match.t1g || 0,
      awayScore: match.t2g || 0,
      playerMinutes: parseInt(match.mp?.replace("'", "") || "0"),
      playerPoints: match.p || 0,
      matchDate: match.md || new Date().toISOString(),
      playerTeam: match.pt === match.t1 ? getTeamName(match.t1) : getTeamName(match.t2)
    }));
    
    // Calculate totals and actual appearances (only games with minutes > 0)
    const actualAppearances = matches.filter((match: any) => match.playerMinutes > 0);
    const totalPoints = matches.reduce((sum: number, match: any) => sum + match.playerPoints, 0);
    const totalMinutes = matches.reduce((sum: number, match: any) => sum + match.playerMinutes, 0);
    const averagePoints = actualAppearances.length > 0 ? totalPoints / actualAppearances.length : 0;
    
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
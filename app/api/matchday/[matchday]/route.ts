import { NextRequest, NextResponse } from 'next/server';
import { enhancedKickbaseClient } from '../../../../lib/adapters/EnhancedKickbaseClient';
import { createOddsProvider } from '../../../../lib/adapters/OddsProvider';
import { getTeamByKickbaseId } from '../../../../lib/teamMapping';
import pino from 'pino';

const logger = pino({ name: 'MatchdayAPI' });

interface Match {
  id: string;
  spieltag: number;
  heim: string;
  auswaerts: string;
  kickoff: string;
  homeGoals?: number;
  awayGoals?: number;
  matchStatus?: number;
  matchTime?: string;
  isLive?: boolean;
  homeTeamSymbol?: string;
  awayTeamSymbol?: string;
  homeTeamImage?: string;
  awayTeamImage?: string;
  odds?: {
    heim: number;
    unentschieden: number;
    auswaerts: number;
    format: 'decimal' | 'fractional' | 'american';
  };
}

/**
 * GET /api/matchday/[matchday]
 * Returns match data for a specific matchday
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchday: string }> }
) {
  try {
    const resolvedParams = await params;
    const matchday = parseInt(resolvedParams.matchday);
    
    if (isNaN(matchday) || matchday < 1 || matchday > 34) {
      return NextResponse.json(
        { error: 'Invalid matchday. Must be between 1 and 34.' },
        { status: 400 }
      );
    }

    logger.info({ matchday }, 'Fetching matchday data');

    let apiError = null;
    
    // Try to fetch live data from Kickbase API
    try {
      logger.info('Attempting to fetch live data from Kickbase API using EnhancedKickbaseClient');
      
      const matchdaysData = await enhancedKickbaseClient.getCompetitionMatchdays('1');
      
      if (matchdaysData && matchdaysData.it) {
        // Find the specific matchday in the response
        const targetMatchday = matchdaysData.it.find((md: any) => md.day === matchday);
        
        if (targetMatchday && targetMatchday.it) {
          // Transform matches for this matchday
          const matches = targetMatchday.it.map((match: any) => {
            const homeTeamName = getTeamName(match.t1);
            const awayTeamName = getTeamName(match.t2);
            const homeTeamData = getTeamByKickbaseId(match.t1.toString());
            const awayTeamData = getTeamByKickbaseId(match.t2.toString());
            
            // Determine match status
            let status: 'upcoming' | 'live' | 'finished' = 'upcoming';
            if (match.st === 2) {
              status = 'finished';
            } else if (match.il || match.st === 1) {
              status = 'live';
            }
            
            return {
              id: match.mi || `match-${matchday}-${Date.now()}`,
              spieltag: matchday,
              heim: homeTeamName,
              auswaerts: awayTeamName,
              homeTeam: {
                id: match.t1.toString(),
                name: homeTeamName,
                shortName: homeTeamData?.shortName || homeTeamName,
                logo: homeTeamData?.logo
              },
              awayTeam: {
                id: match.t2.toString(),
                name: awayTeamName,
                shortName: awayTeamData?.shortName || awayTeamName,
                logo: awayTeamData?.logo
              },
              kickoff: match.dt || new Date().toISOString(),
              status,
              result: (match.t1g !== undefined && match.t2g !== undefined) ? {
                homeGoals: match.t1g,
                awayGoals: match.t2g
              } : undefined,
              homeGoals: match.t1g,
              awayGoals: match.t2g,
              matchStatus: match.st,
              matchTime: match.mtd,
              isLive: match.il || false,
              homeTeamSymbol: match.t1sy,
              awayTeamSymbol: match.t2sy,
              homeTeamImage: match.t1im,
              awayTeamImage: match.t2im
            };
          });

          // Fetch odds for upcoming matches
          let matchesWithOdds = matches;
          try {
            const upcomingMatches = matches.filter(match => !match.isLive && !match.homeGoals && !match.awayGoals);
            if (upcomingMatches.length > 0) {
              logger.info({ upcomingMatchesCount: upcomingMatches.length }, 'Fetching odds for upcoming matches');
              
              const oddsProvider = await createOddsProvider();
              const oddsData = await oddsProvider.fetchOdds(upcomingMatches);
              
              // Merge odds data with matches
              matchesWithOdds = matches.map(match => {
                const matchOdds = oddsData.find(odds => odds.matchId === match.id);
                if (matchOdds) {
                  return {
                    ...match,
                    odds: {
                      heim: matchOdds.heim,
                      unentschieden: matchOdds.unentschieden,
                      auswaerts: matchOdds.auswaerts,
                      format: matchOdds.format
                    }
                  };
                }
                return match;
              });
              
              logger.info({ oddsCount: oddsData.length }, 'Successfully fetched odds data');
            }
          } catch (oddsError) {
            logger.warn({ error: oddsError }, 'Failed to fetch odds, continuing without odds data');
          }

          logger.info({ matchday, matchesCount: matchesWithOdds.length }, 'Successfully fetched live matchday data');
          
          return NextResponse.json({
            success: true,
            data: {
              matchday,
              matches: matchesWithOdds,
              startDate: getMatchdayStartDate(matchday),
              endDate: getMatchdayEndDate(matchday),
              dataSource: 'live'
            }
          });
        } else {
          logger.warn({ matchday }, 'Matchday not found in API response');
        }
      } else {
        logger.warn('Invalid matchdays data structure from API');
      }
    } catch (error) {
      logger.error({ error, matchday }, 'Failed to fetch live matchday data');
      apiError = `Kickbase API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // No fallback to mock data - show error if no live data available
    logger.info({ matchday }, 'No live data available, returning error response');
    
    return NextResponse.json({
      error: `Keine Spiele für Spieltag ${matchday} verfügbar`,
      message: 'Die Kickbase API liefert derzeit keine Spiele für diesen Spieltag. Bitte versuchen Sie es später erneut.',
      spieltag: matchday,
      dataSource: 'error',
      updatedAt: new Date().toISOString(),
      apiError
    }, { status: 503 });
  } catch (error) {
    logger.error({ error }, 'Unexpected error in matchday API');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching matchday data'
      },
      { status: 500 }
    );
  }
}

// Helper function to get team name from team ID - Using consistent mapping from teamMapping.ts
function getTeamName(teamId: string): string {
  // Korrekte Team-Zuordnung basierend auf echten Kickbase API Daten für Saison 2025/26
  const teamMapping: { [key: string]: string } = {
    '2': 'Bayern München',        // FCB
    '3': 'Borussia Dortmund',     // BVB
    '4': 'Eintracht Frankfurt',   // SGE
    '5': 'SC Freiburg',           // SCF
    '6': 'Hamburger SV',          // HSV
    '7': 'Bayer 04 Leverkusen',   // B04
    '9': 'VfB Stuttgart',         // VFB
    '10': 'Werder Bremen',        // SVW
    '11': 'VfL Wolfsburg',        // WOB
    '13': 'FC Augsburg',          // FCA
    '14': 'TSG Hoffenheim',       // TSG - KORRIGIERT!
    '15': 'Borussia Mönchengladbach', // BMG
    '18': 'FSV Mainz 05',         // M05
    '28': '1. FC Köln',           // KOE
    '39': 'FC St. Pauli',         // STP
    '40': '1. FC Union Berlin',   // FCU
    '43': 'RB Leipzig',           // RBL
    '50': '1. FC Heidenheim'      // FCH
  };
  
  return teamMapping[teamId] || `Team ${teamId}`;
}

// Helper function to get matchday start date
function getMatchdayStartDate(matchday: number): string {
  const seasonStart = new Date('2025-08-16');
  const matchdayDate = new Date(seasonStart);
  matchdayDate.setDate(seasonStart.getDate() + (matchday - 1) * 7);
  
  // Adjust to Friday of that week (matches typically start Friday)
  const dayOfWeek = matchdayDate.getDay();
  const daysToFriday = (5 - dayOfWeek + 7) % 7;
  matchdayDate.setDate(matchdayDate.getDate() + daysToFriday);
  matchdayDate.setHours(20, 30, 0, 0); // 20:30 typical kickoff
  
  return matchdayDate.toISOString();
}

// Helper function to get matchday end date
function getMatchdayEndDate(matchday: number): string {
  const startDate = new Date(getMatchdayStartDate(matchday));
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 2); // Sunday
  endDate.setHours(17, 30, 0, 0); // 17:30 typical Sunday kickoff
  
  return endDate.toISOString();
}

// No mock data generation - only live API data allowed
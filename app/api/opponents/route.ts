import { NextRequest, NextResponse } from 'next/server';
import { enhancedKickbaseClient } from '../../../lib/adapters/EnhancedKickbaseClient';
import { getTeamByKickbaseId } from '../../../lib/teamMapping';
import { createOddsProvider } from '../../../lib/adapters/OddsProvider';
import pino from 'pino';

const logger = pino({ name: 'OpponentsAPI' });

interface OpponentInfo {
  teamName: string;
  opponentName: string;
  opponentLogo?: string;
  isHome: boolean;
  homeOdds?: number;
  awayOdds?: number;
  drawOdds?: number;
  matchday: number;
  kickoff: string;
}

/**
 * GET /api/opponents
 * Returns upcoming opponent information for all teams
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Fetching upcoming opponent data');

    // Get current matchday + 1 (next matchday)
    const currentMatchday = 5; // Based on workspace rules
    const nextMatchday = currentMatchday + 1;

    if (nextMatchday > 34) {
      return NextResponse.json(
        { error: 'Season ended, no upcoming matches.' },
        { status: 404 }
      );
    }

    // Fetch matchday data from Kickbase API
    const matchdaysData = await enhancedKickbaseClient.getCompetitionMatchdays('1');
    
    if (!matchdaysData || !matchdaysData.it) {
      return NextResponse.json(
        { error: 'Failed to fetch matchday data' },
        { status: 500 }
      );
    }

    // Find the next matchday
    const targetMatchday = matchdaysData.it.find((md: any) => md.day === nextMatchday);
    
    if (!targetMatchday || !targetMatchday.it) {
      return NextResponse.json(
        { error: `No matches found for matchday ${nextMatchday}` },
        { status: 404 }
      );
    }

    // Transform matches to opponent info
    const opponentInfos: OpponentInfo[] = [];
    
    for (const match of targetMatchday.it) {
      const homeTeamId = match.t1?.toString();
      const awayTeamId = match.t2?.toString();
      
      if (!homeTeamId || !awayTeamId) continue;

      const homeTeamData = getTeamByKickbaseId(homeTeamId);
      const awayTeamData = getTeamByKickbaseId(awayTeamId);
      
      const homeTeamName = homeTeamData?.fullName || `Team ${homeTeamId}`;
      const awayTeamName = awayTeamData?.fullName || `Team ${awayTeamId}`;

      // Add home team's opponent info
      opponentInfos.push({
        teamName: homeTeamName,
        opponentName: awayTeamName,
        opponentLogo: awayTeamData?.dflId,
        isHome: true,
        matchday: nextMatchday,
        kickoff: match.dt || new Date().toISOString()
      });

      // Add away team's opponent info
      opponentInfos.push({
        teamName: awayTeamName,
        opponentName: homeTeamName,
        opponentLogo: homeTeamData?.dflId,
        isHome: false,
        matchday: nextMatchday,
        kickoff: match.dt || new Date().toISOString()
      });
    }

    // Try to get odds data
    try {
      const oddsAdapter = await createOddsProvider();
      const matches = targetMatchday.it.map((match: any) => {
        const homeTeamData = getTeamByKickbaseId(match.t1?.toString());
        const awayTeamData = getTeamByKickbaseId(match.t2?.toString());
        
        return {
          id: match.mi || `match-${nextMatchday}-${match.t1}-${match.t2}`,
          spieltag: nextMatchday,
          heim: homeTeamData?.fullName || `Team ${match.t1}`,
          auswaerts: awayTeamData?.fullName || `Team ${match.t2}`,
          kickoff: match.dt || new Date().toISOString()
        };
      });

      const oddsData = await oddsAdapter.fetchOdds(matches);
      
      // Merge odds data with opponent info
      for (const opponentInfo of opponentInfos) {
        const matchOdds = oddsData.find((odds: any) => {
          const homeTeam = opponentInfo.isHome ? opponentInfo.teamName : opponentInfo.opponentName;
          const awayTeam = opponentInfo.isHome ? opponentInfo.opponentName : opponentInfo.teamName;
          
          return (odds.heim === homeTeam && odds.auswaerts === awayTeam) ||
                 (odds.heim.includes(homeTeam.split(' ')[0]) && odds.auswaerts.includes(awayTeam.split(' ')[0]));
        });

        if (matchOdds) {
          opponentInfo.homeOdds = matchOdds.heim;
          opponentInfo.awayOdds = matchOdds.auswaerts;
          opponentInfo.drawOdds = matchOdds.unentschieden;
        }
      }
    } catch (oddsError) {
      logger.warn({ error: oddsError }, 'Failed to fetch odds data, continuing without odds');
    }

    return NextResponse.json({
      success: true,
      data: {
        matchday: nextMatchday,
        opponents: opponentInfos
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to fetch opponent data');
    return NextResponse.json(
      { error: 'Failed to fetch opponent data' },
      { status: 500 }
    );
  }
}
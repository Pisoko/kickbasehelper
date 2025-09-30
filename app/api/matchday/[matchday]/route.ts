import { NextRequest, NextResponse } from 'next/server';
import { getTeamByKickbaseId } from '../../../../lib/teamMapping';
import { readCache } from '../../../../lib/data';
import { createOddsProvider } from '../../../../lib/adapters/OddsProvider';
import type { Match as OddsMatch } from '../../../../lib/types';
import pino from 'pino';

const logger = pino({ name: 'MatchdayAPI' });

interface Match {
  id: string;
  homeTeam: {
    id: string;
    name: string;
    shortName: string;
    logo?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    shortName: string;
    logo?: string;
  };
  kickoff: string;
  status: 'upcoming' | 'live' | 'finished';
  result?: {
    homeGoals: number;
    awayGoals: number;
  };
  odds?: {
    heim: number;
    unentschieden: number;
    auswaerts: number;
    format: 'decimal' | 'fractional' | 'american';
  };
}

interface MatchdayData {
  matchday: number;
  matches: Match[];
  startDate: string;
  endDate: string;
}

/**
 * GET /api/matchday/[matchday]
 * Returns match data for a specific matchday
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { matchday: string } }
) {
  try {
    const matchday = parseInt(params.matchday);
    
    if (isNaN(matchday) || matchday < 1 || matchday > 34) {
      return NextResponse.json(
        { error: 'Invalid matchday. Must be between 1 and 34.' },
        { status: 400 }
      );
    }

    logger.info({ matchday }, 'Fetching matchday data');

    const apiKey = process.env.KICKBASE_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Kickbase API Key nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Get matchday data from Kickbase API
    const response = await fetch(
      `https://api.kickbase.com/v4/competitions/1/matchdays`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Kickbase API Error: ${response.status}`);
    }

    const matchdaysData = await response.json();
    
    if (!matchdaysData.it || !Array.isArray(matchdaysData.it)) {
      return NextResponse.json(
        { error: 'No match data available' },
        { status: 404 }
      );
    }

    // Find the specific matchday
    const specificMatchday = matchdaysData.it.find((md: any) => md.day === matchday);
    
    if (!specificMatchday || !specificMatchday.it || specificMatchday.it.length === 0) {
      return NextResponse.json(
        { error: `No matches found for matchday ${matchday}` },
        { status: 404 }
      );
    }

    const matchdayMatches = specificMatchday.it;

    // Try to load odds data from cache
    let oddsData: any[] = [];
    try {
      const cachedData = readCache(matchday);
      if (cachedData && cachedData.odds) {
        oddsData = cachedData.odds;
        logger.info({ matchday, oddsCount: oddsData.length }, 'Loaded odds data from cache');
      }
  
    } catch (error) {
      logger.warn({ matchday, error }, 'Failed to load odds data from cache');
    }

    // Transform matches to our format
    const matches: Match[] = matchdayMatches.map((match: any) => {
      const homeTeam = getTeamByKickbaseId(match.t1);
      const awayTeam = getTeamByKickbaseId(match.t2);
      
      // Determine match status
      let status: 'upcoming' | 'live' | 'finished' = 'upcoming';
      if (match.st === 2) {
        status = 'finished';
      } else if (match.st === 1) {
        status = 'live';
      }

      const matchId = match.mi || `match_${match.t1}_${match.t2}`;
      
      // Find odds for this match
      let matchOdds = oddsData.find((odds: any) => 
        odds.matchId === matchId || 
        odds.matchId === `match-${matchday}-${matchdayMatches.indexOf(match) + 1}`
      );
      
      // Generate mock odds if no real odds are available OR if all odds are 0
      const hasValidOdds = matchOdds && (matchOdds.heim > 0 || matchOdds.unentschieden > 0 || matchOdds.auswaerts > 0);
      
      if (!hasValidOdds && status === 'upcoming') {
        // Use placeholder odds - will be replaced by OddsProvider below
        matchOdds = {
          heim: 0,
          unentschieden: 0,
          auswaerts: 0,
          format: 'decimal'
        };
      }

      return {
        id: matchId,
        homeTeam: {
          id: match.t1,
          name: homeTeam?.fullName || `Team ${match.t1}`,
          shortName: homeTeam?.shortName || match.t1sy || `T${match.t1}`,
          logo: match.t1im || undefined
        },
        awayTeam: {
          id: match.t2,
          name: awayTeam?.fullName || `Team ${match.t2}`,
          shortName: awayTeam?.shortName || match.t2sy || `T${match.t2}`,
          logo: match.t2im || undefined
        },
        kickoff: match.dt || new Date().toISOString(),
        status,
        result: status === 'finished' || status === 'live' ? {
          homeGoals: match.t1g || 0,
          awayGoals: match.t2g || 0
        } : undefined,
        odds: matchOdds ? {
          heim: matchOdds.heim,
          unentschieden: matchOdds.unentschieden,
          auswaerts: matchOdds.auswaerts,
          format: matchOdds.format || 'decimal'
        } : undefined
      };
    });

    // Sort matches by kickoff time
    matches.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

    // Fetch odds for upcoming matches using OddsProvider
    const upcomingMatches = matches.filter(match => match.status === 'upcoming');
    if (upcomingMatches.length > 0) {
      try {
        const oddsProvider = await createOddsProvider();
        
        // Convert to OddsMatch format
        const oddsMatches: OddsMatch[] = upcomingMatches.map(match => ({
          id: match.id,
          spieltag: matchday,
          heim: match.homeTeam.name,
          auswaerts: match.awayTeam.name,
          kickoff: match.kickoff
        }));

        const fetchedOdds = await oddsProvider.fetchOdds(oddsMatches);
        
        // Update matches with fetched odds
        fetchedOdds.forEach(odds => {
          const matchIndex = matches.findIndex(m => m.id === odds.matchId);
          if (matchIndex !== -1 && matches[matchIndex].status === 'upcoming') {
            matches[matchIndex].odds = {
              heim: odds.heim,
              unentschieden: odds.unentschieden,
              auswaerts: odds.auswaerts,
              format: odds.format
            };
          }
        });

        logger.info({ matchday, oddsCount: fetchedOdds.length }, 'Successfully fetched odds from provider');
      } catch (error) {
        logger.warn({ matchday, error }, 'Failed to fetch odds from provider, using cached/mock odds');
      }
    }

    // Calculate start and end dates for the matchday
    const kickoffTimes = matches.map(m => new Date(m.kickoff));
    const startDate = new Date(Math.min(...kickoffTimes.map(d => d.getTime()))).toISOString();
    const endDate = new Date(Math.max(...kickoffTimes.map(d => d.getTime()))).toISOString();

    const matchdayData: MatchdayData = {
      matchday,
      matches,
      startDate,
      endDate
    };

    logger.info({ matchday, matchCount: matches.length }, 'Successfully fetched matchday data');

    return NextResponse.json(matchdayData);

  } catch (error) {
    logger.error({ error, matchday: params.matchday }, 'Failed to fetch matchday data');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch matchday data'
      },
      { status: 500 }
    );
  }
}
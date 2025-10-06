import { NextRequest, NextResponse } from 'next/server';
import { defeatOddsService } from '@/lib/services/DefeatOddsService';
import pino from 'pino';

const logger = pino({ name: 'DefeatOddsAPI' });

/**
 * GET /api/defeat-odds
 * Returns defeat odds for all teams in the upcoming matchday
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Fetching defeat odds for upcoming matchday');

    // Get defeat odds mapping for the upcoming matchday
    const defeatOddsMapping = await defeatOddsService.getDefeatOddsMapping();
    
    // Get additional info about the upcoming matchday
    const matchdayInfo = await defeatOddsService.getUpcomingMatchdayInfo();

    if (Object.keys(defeatOddsMapping).length === 0) {
      logger.warn('No defeat odds available for upcoming matchday');
      return NextResponse.json({
        success: false,
        message: 'Keine Niederlagen-Quoten für den kommenden Spieltag verfügbar',
        teamOdds: {},
        matchdayInfo
      }, { status: 404 });
    }

    logger.info({ 
      teamsCount: Object.keys(defeatOddsMapping).length,
      matchday: matchdayInfo.matchday 
    }, 'Successfully retrieved defeat odds');

    return NextResponse.json({
      success: true,
      message: `Niederlagen-Quoten für Spieltag ${matchdayInfo.matchday} geladen`,
      teamOdds: defeatOddsMapping,
      matchdayInfo,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error({ error }, 'Failed to fetch defeat odds');
    
    return NextResponse.json({
      success: false,
      message: 'Fehler beim Laden der Niederlagen-Quoten',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      teamOdds: {},
      matchdayInfo: {
        matchday: 0,
        matchesCount: 0,
        teamsWithOdds: [],
        hasOdds: false
      }
    }, { status: 500 });
  }
}
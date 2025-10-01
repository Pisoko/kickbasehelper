import { NextResponse } from 'next/server';
import { enhancedKickbaseClient } from '../../../lib/adapters/EnhancedKickbaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const matchday = searchParams.get('matchday');
    
    // Bundesliga Competition ID ist "1"
    const competitionId = "1";
    
    // Verwende EnhancedKickbaseClient für authentifizierte API-Aufrufe
    const matchdaysData = await enhancedKickbaseClient.getCompetitionMatchdays(competitionId);

    // Wenn ein spezifischer Spieltag angefragt wird, filtere die Daten
    let filteredData = matchdaysData;
    if (matchday) {
      const matchdayNumber = parseInt(matchday);
      if (matchdaysData.it && Array.isArray(matchdaysData.it)) {
        const specificMatchday = matchdaysData.it.find(
          (md: any) => md.day === matchdayNumber
        );
        filteredData = specificMatchday ? { it: [specificMatchday], day: matchdaysData.day } : { it: [], day: matchdaysData.day };
      }
    }

    return NextResponse.json({
      ...filteredData,
      updatedAt: new Date().toISOString(),
      competitionId,
      requestedMatchday: matchday ? parseInt(matchday) : null,
      dataSource: 'live'
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Spieltag-Daten:', error);
    return NextResponse.json(
      { 
        error: 'Fehler beim Abrufen der Spieltag-Daten',
        details: error instanceof Error ? error.message : 'Unknown error',
        dataSource: 'error'
      },
      { status: 500 }
    );
  }
}
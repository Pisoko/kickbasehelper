import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const matchday = searchParams.get('matchday');
    
    const apiKey = process.env.KICKBASE_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Kickbase API Key nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Bundesliga Competition ID ist "1"
    const competitionId = "1";
    
    const response = await fetch(
      `https://api.kickbase.com/v4/competitions/${competitionId}/matchdays`,
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
      requestedMatchday: matchday ? parseInt(matchday) : null
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Spieltag-Daten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Spieltag-Daten' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';

export async function GET() {
  try {
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
      `https://api.kickbase.com/v4/competitions/${competitionId}/table`,
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

    const tableData = await response.json();

    return NextResponse.json({
      table: tableData,
      updatedAt: new Date().toISOString(),
      competitionId
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Bundesliga-Tabelle:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Tabellendaten' },
      { status: 500 }
    );
  }
}
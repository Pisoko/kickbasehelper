import { NextResponse } from 'next/server';

// Mapping für Team-Namen (falls nötig)
const teamNameMapping: { [key: string]: string } = {
  'Bayern': 'FC Bayern München',
  'Dortmund': 'Borussia Dortmund',
  'Leipzig': 'RB Leipzig',
  'Frankfurt': 'Eintracht Frankfurt',
  'Stuttgart': 'VfB Stuttgart',
  'Leverkusen': 'Bayer 04 Leverkusen',
  'Köln': '1. FC Köln',
  'Freiburg': 'Sport-Club Freiburg',
  'Wolfsburg': 'VfL Wolfsburg',
  'Hoffenheim': 'TSG Hoffenheim',
  'Union Berlin': '1. FC Union Berlin',
  'Mainz': '1. FSV Mainz 05',
  'Augsburg': 'FC Augsburg',
  'Hamburg': 'Hamburger SV',
  'M\'gladbach': 'Borussia Mönchengladbach',
  'Heidenheim': '1. FC Heidenheim 1846'
};

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

    const rawData = await response.json();

    // Transform Kickbase data to expected format
    const transformedTeams = rawData.it?.map((team: any, index: number) => {
      const fullName = teamNameMapping[team.tn] || team.tn;
      
      // Berechne Statistiken basierend auf verfügbaren Daten
      const played = team.mc || 0;
      const points = team.cp || 0;
      const goalDifference = team.gd || 0;
      
      // Schätze Siege, Unentschieden, Niederlagen basierend auf Punkten
      // 3 Punkte = Sieg, 1 Punkt = Unentschieden, 0 Punkte = Niederlage
      const maxWins = Math.floor(points / 3);
      const remainingPoints = points % 3;
      const draws = remainingPoints;
      const wins = maxWins;
      const losses = played - wins - draws;

      // Schätze realistische Tore basierend auf Position und Tordifferenz
      const estimateGoals = (position: number, goalDiff: number, gamesPlayed: number) => {
        if (gamesPlayed === 0) return { goalsFor: 0, goalsAgainst: 0 };
        
        // Basis-Tore pro Spiel basierend auf Liga-Position (bessere Teams schießen mehr Tore)
        const baseGoalsPerGame = Math.max(0.8, 2.5 - (position - 1) * 0.08);
        const estimatedGoalsFor = Math.round(baseGoalsPerGame * gamesPlayed);
        
        // Berechne Gegentore mathematisch korrekt: goalsAgainst = goalsFor - goalDiff
        const estimatedGoalsAgainst = Math.max(0, estimatedGoalsFor - goalDiff);
        
        // Falls die Tordifferenz zu groß ist, passe goalsFor an
        let finalGoalsFor = estimatedGoalsFor;
        let finalGoalsAgainst = estimatedGoalsAgainst;
        
        if (estimatedGoalsAgainst === 0 && goalDiff > 0) {
          // Für sehr positive Tordifferenzen: Erhöhe goalsFor entsprechend
          finalGoalsFor = Math.max(estimatedGoalsFor, Math.abs(goalDiff) + Math.round(gamesPlayed * 0.5));
          finalGoalsAgainst = finalGoalsFor - goalDiff;
        }
        
        return {
          goalsFor: Math.max(0, finalGoalsFor),
          goalsAgainst: Math.max(0, finalGoalsAgainst)
        };
      };

      const { goalsFor, goalsAgainst } = estimateGoals(team.cpl || index + 1, goalDifference, played);

      return {
        id: team.tid || `team-${index}`,
        name: fullName,
        shortName: team.tn || 'UNK',
        logo: team.tim ? `https://api.kickbase.com/${team.tim}` : undefined,
        position: team.cpl || index + 1,
        points: points,
        played: played,
        won: Math.max(0, wins),
        drawn: Math.max(0, draws),
        lost: Math.max(0, losses),
        goalsFor: goalsFor,
        goalsAgainst: goalsAgainst,
        goalDifference: goalDifference,
        form: [], // Nicht in dieser API verfügbar
        // Kickbase-spezifische Daten
        totalMarketValue: team.sp ? Math.round((team.sp / 1000) * 100) / 100 : 0, // Umrechnung von Millionen zu Milliarden (2 Dezimalstellen)
        averageMarketValue: team.sp ? Math.round(team.sp / 25) : 0, // Geschätzt für ~25 Spieler
        playerCount: 25 // Standard Kader-Größe
      };
    }) || [];

    // Sortiere nach Position
    transformedTeams.sort((a: any, b: any) => a.position - b.position);

    const tableData = {
      teams: transformedTeams,
      season: '2025/2026',
      lastUpdate: new Date().toISOString()
    };

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
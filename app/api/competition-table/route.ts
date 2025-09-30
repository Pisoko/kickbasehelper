import { NextResponse } from 'next/server';

// Function to calculate real goals from all matchday results
async function calculateRealGoals(apiKey: string, competitionId: string) {
  const teamGoals: { [teamId: string]: { goalsFor: number; goalsAgainst: number } } = {};
  
  try {
    // Fetch all matchdays data from Kickbase API
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
      console.error(`Failed to fetch matchdays: ${response.status}`);
      return teamGoals;
    }

    const matchdaysData = await response.json();
    
    if (!matchdaysData.it || !Array.isArray(matchdaysData.it)) {
      console.error('Invalid matchdays data structure');
      return teamGoals;
    }

    // Process all matchdays and their matches
    for (const matchday of matchdaysData.it) {
      if (!matchday.it || !Array.isArray(matchday.it)) continue;
      
      for (const match of matchday.it) {
        // Only process finished matches (st === 2)
        if (match.st === 2 && match.t1g !== undefined && match.t2g !== undefined) {
          const team1Id = match.t1.toString();
          const team2Id = match.t2.toString();
          const team1Goals = match.t1g || 0;
          const team2Goals = match.t2g || 0;
          
          // Initialize team goals if not exists
          if (!teamGoals[team1Id]) {
            teamGoals[team1Id] = { goalsFor: 0, goalsAgainst: 0 };
          }
          if (!teamGoals[team2Id]) {
            teamGoals[team2Id] = { goalsFor: 0, goalsAgainst: 0 };
          }
          
          // Add goals for team 1
          teamGoals[team1Id].goalsFor += team1Goals;
          teamGoals[team1Id].goalsAgainst += team2Goals;
          
          // Add goals for team 2
          teamGoals[team2Id].goalsFor += team2Goals;
          teamGoals[team2Id].goalsAgainst += team1Goals;
        }
      }
    }
    
    console.log('Calculated real goals for teams:', Object.keys(teamGoals).length);
    return teamGoals;
  } catch (error) {
    console.error('Error calculating real goals:', error);
    return teamGoals;
  }
}

// Mapping für Team-Namen (falls nötig)
const teamNameMapping: { [key: string]: string } = {
  'Bayern': 'FC Bayern München',
  'Dortmund': 'Borussia Dortmund',
  'Leipzig': 'RB Leipzig',
  'Frankfurt': 'Eintracht Frankfurt',
  'Stuttgart': 'VfB Stuttgart',
  'Leverkusen': 'Bayer 04 Leverkusen',
  'Köln': '1. FC Köln',
  'Freiburg': 'SC Freiburg',
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

    // Calculate real goals from all matchday results
    const realGoalsData = await calculateRealGoals(apiKey, competitionId);

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

      // Get real goals data for this team
      const teamId = team.tid?.toString() || '';
      const realGoals = realGoalsData[teamId] || { goalsFor: 0, goalsAgainst: 0 };
      
      // Use real goals if available, otherwise fall back to calculation based on goal difference
      let goalsFor = realGoals.goalsFor;
      let goalsAgainst = realGoals.goalsAgainst;
      
      // If no real goals data available, estimate based on goal difference
      if (goalsFor === 0 && goalsAgainst === 0 && played > 0) {
        // Basis-Tore pro Spiel basierend auf Liga-Position (bessere Teams schießen mehr Tore)
        const baseGoalsPerGame = Math.max(0.8, 2.5 - ((team.cpl || index + 1) - 1) * 0.08);
        const estimatedGoalsFor = Math.round(baseGoalsPerGame * played);
        const estimatedGoalsAgainst = Math.max(0, estimatedGoalsFor - goalDifference);
        
        goalsFor = estimatedGoalsFor;
        goalsAgainst = estimatedGoalsAgainst;
      }

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
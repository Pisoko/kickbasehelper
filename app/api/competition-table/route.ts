import { NextResponse } from 'next/server';
import { kickbaseAuth } from '@/lib/adapters/KickbaseAuthService';

// Function to calculate real goals from all matchday results
async function calculateRealGoals(competitionId: string) {
  const teamGoals: { [teamId: string]: { goalsFor: number; goalsAgainst: number } } = {};
  
  try {
    // Get valid token from KickbaseAuthService
    const token = await kickbaseAuth.getValidToken();
    if (!token) {
      console.warn('No valid token available for calculateRealGoals');
      return teamGoals;
    }

    // Fetch all matchdays data from Kickbase API
    const response = await fetch(
      `https://api.kickbase.com/v4/competitions/${competitionId}/matchdays`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch matchdays: ${response.status}, using empty goals data`);
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
    console.warn('Error calculating real goals, using empty data:', error);
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
    // Get valid token from KickbaseAuthService
    const token = await kickbaseAuth.getValidToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Kickbase API Token nicht verfügbar' },
        { status: 500 }
      );
    }

    // Bundesliga Competition ID ist "1"
    const competitionId = "1";
    
    let rawData = null;
    let useRealData = false;
    
    try {
      const response = await fetch(
        `https://api.kickbase.com/v4/competitions/${competitionId}/table`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        rawData = await response.json();
        useRealData = true;
      } else {
        console.warn(`Kickbase API Error: ${response.status}, using mock data`);
      }
    } catch (error) {
      console.warn('Kickbase API not available, using mock data:', error);
    }

    // Fallback to mock data if API is not available
    if (!rawData) {
      rawData = {
        it: [
          { tn: 'Bayern', tid: 1, mc: 6, cp: 16, gd: 12 },
          { tn: 'Leverkusen', tid: 2, mc: 6, cp: 14, gd: 8 },
          { tn: 'Leipzig', tid: 3, mc: 6, cp: 13, gd: 6 },
          { tn: 'Dortmund', tid: 4, mc: 6, cp: 12, gd: 4 },
          { tn: 'Frankfurt', tid: 5, mc: 6, cp: 11, gd: 2 },
          { tn: 'Stuttgart', tid: 6, mc: 6, cp: 10, gd: 0 },
          { tn: 'Freiburg', tid: 7, mc: 6, cp: 9, gd: -1 },
          { tn: 'Wolfsburg', tid: 8, mc: 6, cp: 8, gd: -2 },
          { tn: 'M\'gladbach', tid: 9, mc: 6, cp: 7, gd: -3 },
          { tn: 'Hoffenheim', tid: 10, mc: 6, cp: 6, gd: -4 },
          { tn: 'Union Berlin', tid: 11, mc: 6, cp: 5, gd: -5 },
          { tn: 'Mainz', tid: 12, mc: 6, cp: 4, gd: -6 },
          { tn: 'Augsburg', tid: 13, mc: 6, cp: 3, gd: -7 },
          { tn: 'Köln', tid: 14, mc: 6, cp: 2, gd: -8 },
          { tn: 'Heidenheim', tid: 15, mc: 6, cp: 1, gd: -9 },
          { tn: 'Hamburg', tid: 16, mc: 6, cp: 0, gd: -10 }
        ]
      };
    }

    // Calculate real goals from all matchday results
    const realGoalsData = await calculateRealGoals(competitionId);

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
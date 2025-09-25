// Durchschnittswerte basierend auf Spieltag 4 Daten (Saison 2025/2026)
export const LEAGUE_AVERAGES = {
  pointsPerMatchday: 58.44,
  totalPoints: 233.77,
  minutesPerMatchday: 45.67,
};

export const POSITION_AVERAGES = {
  GK: {
    pointsPerMatchday: 98.68,
    totalPoints: 394.74,
    minutesPerMatchday: 67.89,
  },
  DEF: {
    pointsPerMatchday: 53.91,
    totalPoints: 215.66,
    minutesPerMatchday: 44.12,
  },
  MID: {
    pointsPerMatchday: 51.53,
    totalPoints: 206.12,
    minutesPerMatchday: 43.85,
  },
  FWD: {
    pointsPerMatchday: 47.77,
    totalPoints: 191.08,
    minutesPerMatchday: 44.72,
  },
};

export const TEAM_AVERAGES = {
  Bayern: { pointsPerMatchday: 126.19, totalPoints: 504.78 },
  Dortmund: { pointsPerMatchday: 84.61, totalPoints: 338.45 },
  Leipzig: { pointsPerMatchday: 74.46, totalPoints: 297.83 },
  Stuttgart: { pointsPerMatchday: 65.20, totalPoints: 260.79 },
  Köln: { pointsPerMatchday: 64.21, totalPoints: 256.86 },
  Frankfurt: { pointsPerMatchday: 63.67, totalPoints: 254.70 },
  'St. Pauli': { pointsPerMatchday: 63.53, totalPoints: 254.12 },
  Hoffenheim: { pointsPerMatchday: 50.56, totalPoints: 202.25 },
  Wolfsburg: { pointsPerMatchday: 49.99, totalPoints: 199.95 },
  Freiburg: { pointsPerMatchday: 47.80, totalPoints: 191.19 },
};

// Hilfsfunktionen für die Berechnung
export function getPositionAverage(position: string): typeof POSITION_AVERAGES.GK {
  return POSITION_AVERAGES[position as keyof typeof POSITION_AVERAGES] || POSITION_AVERAGES.MID;
}

export function getTeamAverage(team: string): { pointsPerMatchday: number; totalPoints: number } {
  return TEAM_AVERAGES[team as keyof typeof TEAM_AVERAGES] || { 
    pointsPerMatchday: LEAGUE_AVERAGES.pointsPerMatchday, 
    totalPoints: LEAGUE_AVERAGES.totalPoints 
  };
}

// Berechnet einen relativen Score basierend auf Position und Liga-Durchschnitt
export function calculateRelativeScore(
  playerValue: number, 
  position: string, 
  metric: 'pointsPerMatchday' | 'totalPoints'
): number {
  const positionAvg = getPositionAverage(position);
  const positionValue = positionAvg[metric];
  
  if (positionValue === 0) return 0;
  
  // Normalisiere auf 0-100 Skala, wobei Positions-Durchschnitt = 50 ist
  const relativeScore = (playerValue / positionValue) * 50;
  
  // Begrenze auf 0-100
  return Math.min(100, Math.max(0, relativeScore));
}

// Berechnet Team-Bonus basierend auf Team-Performance
export function calculateTeamBonus(team: string): number {
  const teamAvg = getTeamAverage(team);
  const leagueAvg = LEAGUE_AVERAGES.pointsPerMatchday;
  
  // Team-Bonus: 0-20 Punkte basierend auf Team-Performance vs Liga-Durchschnitt
  const teamFactor = teamAvg.pointsPerMatchday / leagueAvg;
  return Math.min(20, Math.max(0, (teamFactor - 1) * 20));
}
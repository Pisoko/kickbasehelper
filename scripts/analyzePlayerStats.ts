import fs from 'fs';
import path from 'path';

interface Player {
  id: string;
  name: string;
  firstName: string;
  position: string;
  verein: string;
  kosten: number;
  punkte_hist: number[];
  punkte_avg: number;
  punkte_sum: number;
  minutes_hist: number[];
  totalMinutesPlayed: number;
  appearances: number;
  status: string;
  isInjured: boolean;
}

interface PlayerData {
  updatedAt: string;
  players: Player[];
}

interface AnalysisResult {
  totalPlayers: number;
  activePlayers: number; // Spieler mit mindestens einem Einsatz
  leagueAverages: {
    pointsPerMatchday: number;
    totalPoints: number;
    minutesPerMatchday: number;
  };
  positionAverages: {
    [position: string]: {
      pointsPerMatchday: number;
      totalPoints: number;
      minutesPerMatchday: number;
      playerCount: number;
    };
  };
  teamAverages: {
    [team: string]: {
      pointsPerMatchday: number;
      totalPoints: number;
      minutesPerMatchday: number;
      playerCount: number;
    };
  };
  statusDistribution: {
    [status: string]: number;
  };
  topPerformers: {
    byTotalPoints: Player[];
    byAveragePoints: Player[];
    byPointsPerMinute: Player[];
  };
}

function analyzePlayerData(): AnalysisResult {
  // Lade die aktuellen Spielerdaten (Spieltag 4)
  const dataPath = path.join(process.cwd(), 'data', '2025', 'spieltag_4.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const data: PlayerData = JSON.parse(rawData);
  
  const players = data.players;
  const totalPlayers = players.length;
  
  // Filtere aktive Spieler (mindestens ein Einsatz) - use punkte_hist.length as more reliable indicator
  const activePlayers = players.filter(p => (p.punkte_hist?.length || p.appearances || 0) > 0);
  const activePlayerCount = activePlayers.length;
  
  // Berechne Liga-Durchschnitte
  const totalPointsSum = activePlayers.reduce((sum, p) => sum + p.punkte_sum, 0);
  const totalMinutesSum = activePlayers.reduce((sum, p) => sum + p.totalMinutesPlayed, 0);
  const totalMatchdays = 4; // Aktueller Spieltag
  
  const leagueAverages = {
    pointsPerMatchday: totalPointsSum / (activePlayerCount * totalMatchdays),
    totalPoints: totalPointsSum / activePlayerCount,
    minutesPerMatchday: totalMinutesSum / (activePlayerCount * totalMatchdays),
  };
  
  // Berechne Positions-Durchschnitte
  const positionGroups: { [position: string]: Player[] } = {};
  activePlayers.forEach(player => {
    if (!positionGroups[player.position]) {
      positionGroups[player.position] = [];
    }
    positionGroups[player.position].push(player);
  });
  
  const positionAverages: AnalysisResult['positionAverages'] = {};
  Object.entries(positionGroups).forEach(([position, posPlayers]) => {
    const posPointsSum = posPlayers.reduce((sum, p) => sum + p.punkte_sum, 0);
    const posMinutesSum = posPlayers.reduce((sum, p) => sum + p.totalMinutesPlayed, 0);
    
    positionAverages[position] = {
      pointsPerMatchday: posPointsSum / (posPlayers.length * totalMatchdays),
      totalPoints: posPointsSum / posPlayers.length,
      minutesPerMatchday: posMinutesSum / (posPlayers.length * totalMatchdays),
      playerCount: posPlayers.length,
    };
  });
  
  // Berechne Team-Durchschnitte
  const teamGroups: { [team: string]: Player[] } = {};
  activePlayers.forEach(player => {
    if (!teamGroups[player.verein]) {
      teamGroups[player.verein] = [];
    }
    teamGroups[player.verein].push(player);
  });
  
  const teamAverages: AnalysisResult['teamAverages'] = {};
  Object.entries(teamGroups).forEach(([team, teamPlayers]) => {
    const teamPointsSum = teamPlayers.reduce((sum, p) => sum + p.punkte_sum, 0);
    const teamMinutesSum = teamPlayers.reduce((sum, p) => sum + p.totalMinutesPlayed, 0);
    
    teamAverages[team] = {
      pointsPerMatchday: teamPointsSum / (teamPlayers.length * totalMatchdays),
      totalPoints: teamPointsSum / teamPlayers.length,
      minutesPerMatchday: teamMinutesSum / (teamPlayers.length * totalMatchdays),
      playerCount: teamPlayers.length,
    };
  });
  
  // Status-Verteilung
  const statusDistribution: { [status: string]: number } = {};
  players.forEach(player => {
    const status = player.isInjured ? 'injured' : (player.status || '0');
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });
  
  // Top-Performer
  const topPerformers = {
    byTotalPoints: [...activePlayers]
      .sort((a, b) => b.punkte_sum - a.punkte_sum)
      .slice(0, 10),
    byAveragePoints: [...activePlayers]
      .sort((a, b) => b.punkte_avg - a.punkte_avg)
      .slice(0, 10),
    byPointsPerMinute: [...activePlayers]
      .filter(p => p.totalMinutesPlayed > 0)
      .sort((a, b) => (b.punkte_sum / b.totalMinutesPlayed) - (a.punkte_sum / a.totalMinutesPlayed))
      .slice(0, 10),
  };
  
  return {
    totalPlayers,
    activePlayers: activePlayerCount,
    leagueAverages,
    positionAverages,
    teamAverages,
    statusDistribution,
    topPerformers,
  };
}

function printAnalysis(result: AnalysisResult) {
  console.log('=== SPIELER-STATISTIK ANALYSE ===\n');
  
  console.log(`Gesamt-Spieler: ${result.totalPlayers}`);
  console.log(`Aktive Spieler: ${result.activePlayers}\n`);
  
  console.log('=== LIGA-DURCHSCHNITTE ===');
  console.log(`Punkte pro Spieltag: ${result.leagueAverages.pointsPerMatchday.toFixed(2)}`);
  console.log(`Gesamt-Punkte: ${result.leagueAverages.totalPoints.toFixed(2)}`);
  console.log(`Minuten pro Spieltag: ${result.leagueAverages.minutesPerMatchday.toFixed(2)}\n`);
  
  console.log('=== POSITIONS-DURCHSCHNITTE ===');
  Object.entries(result.positionAverages).forEach(([pos, avg]) => {
    console.log(`${pos}: ${avg.pointsPerMatchday.toFixed(2)} Punkte/Spieltag, ${avg.totalPoints.toFixed(2)} Gesamt-Punkte (${avg.playerCount} Spieler)`);
  });
  console.log();
  
  console.log('=== TOP TEAMS (nach Durchschnittspunkten) ===');
  const sortedTeams = Object.entries(result.teamAverages)
    .sort(([,a], [,b]) => b.pointsPerMatchday - a.pointsPerMatchday)
    .slice(0, 10);
  
  sortedTeams.forEach(([team, avg]) => {
    console.log(`${team}: ${avg.pointsPerMatchday.toFixed(2)} Punkte/Spieltag, ${avg.totalPoints.toFixed(2)} Gesamt-Punkte (${avg.playerCount} Spieler)`);
  });
  console.log();
  
  console.log('=== STATUS-VERTEILUNG ===');
  Object.entries(result.statusDistribution).forEach(([status, count]) => {
    const statusLabel = status === '0' ? 'Fit' : status === 'injured' ? 'Verletzt' : `Status ${status}`;
    console.log(`${statusLabel}: ${count} Spieler`);
  });
  console.log();
  
  console.log('=== TOP 5 PERFORMER ===');
  console.log('Nach Gesamt-Punkten:');
  result.topPerformers.byTotalPoints.slice(0, 5).forEach((player, i) => {
    console.log(`${i + 1}. ${player.firstName} ${player.name} (${player.position}, ${player.verein}): ${player.punkte_sum} Punkte`);
  });
  
  console.log('\nNach Durchschnitts-Punkten:');
  result.topPerformers.byAveragePoints.slice(0, 5).forEach((player, i) => {
    console.log(`${i + 1}. ${player.firstName} ${player.name} (${player.position}, ${player.verein}): ${player.punkte_avg} Punkte/Spiel`);
  });
  
  console.log('\nNach Punkte pro Minute:');
  result.topPerformers.byPointsPerMinute.slice(0, 5).forEach((player, i) => {
    const pointsPerMinute = player.punkte_sum / player.totalMinutesPlayed;
    console.log(`${i + 1}. ${player.firstName} ${player.name} (${player.position}, ${player.verein}): ${pointsPerMinute.toFixed(3)} Punkte/Minute`);
  });
}

// Führe die Analyse aus
const analysisResult = analyzePlayerData();
printAnalysis(analysisResult);

// Exportiere die Ergebnisse für weitere Verwendung
export { analyzePlayerData, type AnalysisResult };
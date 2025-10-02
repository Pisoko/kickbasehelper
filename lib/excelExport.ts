import * as XLSX from 'xlsx';
import { Player } from './types';
import { calculateXFactor, getGermanPosition } from './positionUtils';

// Interface für die Spieldaten der letzten 3 Spiele
interface PlayerLast3GamesData {
  playerId: string;
  last3Games: boolean[]; // true = Start-11, false = keine Start-11
  totalGames: number;
}

/**
 * Exportiert gefilterte Spielerdaten als Excel-Datei
 * Filter: Status "fit" oder "angeschlagen" UND letztes Spiel in Start11
 */
export function exportPlayersToExcel(
  players: Player[],
  playerLast3GamesData: Map<string, PlayerLast3GamesData>
): void {
  // Filtere Spieler nach den gewünschten Kriterien
  const filteredPlayers = players.filter(player => {
    // Filter 1: Status muss "fit" oder "angeschlagen" sein (0 = fit, 1 = angeschlagen)
    // Player.status ist ein string, also prüfen wir auf "0" oder "1"
    const statusFilter = player.status === "0" || player.status === "1";
    
    // Filter 2: Letztes Spiel in Start11
    const playerData = playerLast3GamesData.get(player.id);
    if (!playerData || !playerData.last3Games || playerData.last3Games.length === 0) {
      return false;
    }
    // Prüfe das letzte Spiel (letztes Element im Array)
    const lastGameStart11 = playerData.last3Games[playerData.last3Games.length - 1];
    const start11Filter = lastGameStart11 === true;
    
    return statusFilter && start11Filter;
  });

  // Erstelle Excel-Daten mit den gewünschten Feldern
  const excelData = filteredPlayers.map(player => {
    const xFactor = calculateXFactor(
      player.punkte_sum || 0,
      player.totalMinutesPlayed || 0,
      player.marketValue || player.kosten || 0,
      player.verein || ''
    );
    
    return {
      'Name': player.name, // Verwende player.name statt firstName + lastName
      'Position': getGermanPosition(player.position as any),
      'CV': player.marketValue || player.kosten, // Fallback auf kosten falls marketValue nicht verfügbar
      'X Wert': Number(xFactor.toFixed(1))
    };
  });

  // Sortiere nach X Wert (absteigend)
  excelData.sort((a, b) => b['X Wert'] - a['X Wert']);

  // Erstelle Arbeitsblatt
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Setze Spaltenbreiten
  const columnWidths = [
    { wch: 25 }, // Name
    { wch: 12 }, // Position
    { wch: 15 }, // CV
    { wch: 10 }  // X Wert
  ];
  worksheet['!cols'] = columnWidths;

  // Erstelle Arbeitsmappe
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Spieler Export');

  // Generiere Dateinamen mit aktuellem Datum
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD Format
  const fileName = `kickbase_spieler_export_${dateString}.xlsx`;

  // Lade Datei herunter
  XLSX.writeFile(workbook, fileName);
}

/**
 * Hilfsfunktion um die Anzahl der gefilterten Spieler zu ermitteln
 */
export function getFilteredPlayersCount(
  players: Player[],
  playerLast3GamesData: Map<string, PlayerLast3GamesData>
): number {
  return players.filter(player => {
    const statusFilter = player.status === "0" || player.status === "1";
    const playerData = playerLast3GamesData.get(player.id);
    if (!playerData || !playerData.last3Games || playerData.last3Games.length === 0) {
      return false;
    }
    const lastGameStart11 = playerData.last3Games[playerData.last3Games.length - 1];
    const start11Filter = lastGameStart11 === true;
    return statusFilter && start11Filter;
  }).length;
}
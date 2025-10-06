/**
 * Position utilities for mapping and styling
 */

export type PositionKey = 'GK' | 'DEF' | 'MID' | 'FWD';
export type GermanPosition = 'TW' | 'ABW' | 'MF' | 'ANG';

// Mapping from English to German positions
export const positionMapping: Record<PositionKey, GermanPosition> = {
  'GK': 'TW',   // Goalkeeper -> Torwart
  'DEF': 'ABW', // Defender -> Abwehr
  'MID': 'MF',  // Midfielder -> Mittelfeld
  'FWD': 'ANG'  // Forward -> Angriff
};

// Reverse mapping from German to English
export const reversePositionMapping: Record<GermanPosition, PositionKey> = {
  'TW': 'GK',
  'ABW': 'DEF',
  'MF': 'MID',
  'ANG': 'FWD'
};

// Position colors
export const positionColors: Record<GermanPosition, string> = {
  'TW': 'text-white bg-slate-700',      // Weiß
  'ABW': 'text-green-400 bg-green-900', // Grün
  'MF': 'text-yellow-400 bg-yellow-900', // Gelb
  'ANG': 'text-red-400 bg-red-900'      // Rot
};

// Position order for filters
export const positionOrder: GermanPosition[] = ['TW', 'ABW', 'MF', 'ANG'];

/**
 * Get German position from English position
 */
export function getGermanPosition(position: PositionKey): GermanPosition {
  return positionMapping[position] || 'TW';
}

/**
 * Get English position from German position
 */
export function getEnglishPosition(germanPosition: GermanPosition): PositionKey {
  return reversePositionMapping[germanPosition] || 'GK';
}

/**
 * Get position color classes
 */
export function getPositionColorClasses(position: PositionKey | GermanPosition): string {
  // Check if it's already a German position
  if (position in positionColors) {
    return positionColors[position as GermanPosition];
  }
  
  // Otherwise, convert from English to German
  const germanPos = getGermanPosition(position as PositionKey);
  return positionColors[germanPos] || positionColors['TW'];
}

/**
 * Get all German positions in correct order
 */
export function getOrderedGermanPositions(): GermanPosition[] {
  return positionOrder;
}

/**
 * Calculate points per minute
 */
export function calculatePointsPerMinute(totalPoints: number, totalMinutes: number): number {
  if (totalMinutes === 0) return 0;
  return totalPoints / totalMinutes;
}

/**
 * Calculate points per million euros
 */
export function calculatePointsPerMillion(totalPoints: number, marketValue: number): number {
  if (marketValue === 0) return 0;
  return totalPoints / (marketValue / 1000000);
}

/**
 * Team odds mapping for X-Factor calculation
 */
export const teamOddsMapping: Record<string, number> = {
  'Hoffenheim': 3.5,
  'TSG Hoffenheim': 3.5,
  'TSG 1899 Hoffenheim': 3.5,
  'Köln': 1.95,
  '1. FC Köln': 1.95,
  'FC Köln': 1.95,
  'Bremen': 2.9,
  'Werder Bremen': 2.9,
  'SV Werder Bremen': 2.9,
  'St. Pauli': 2.3,
  'FC St. Pauli': 2.3,
  'Leverkusen': 5,
  'Bayer Leverkusen': 5,
  'Bayer 04 Leverkusen': 5,
  'Union Berlin': 1.63,
  '1. FC Union Berlin': 1.63,
  'FC Union Berlin': 1.63,
  'FC Augsburg': 2.5,
  'Augsburg': 2.5,
  'Wolfsburg': 2.65,
  'VfL Wolfsburg': 2.65,
  'Dortmund': 4.1,
  'Borussia Dortmund': 4.1,
  'BVB': 4.1,
  'Leipzig': 1.71,
  'RB Leipzig': 1.71,
  'Frankfurt': 1.46,
  'Eintracht Frankfurt': 1.46,
  'Bayern': 5.75,
  'FC Bayern München': 5.75,
  'Bayern München': 5.75,
  'Hamburg': 2.4,
  'Hamburger SV': 2.4,
  'HSV': 2.4,
  'Mainz': 2.7,
  'FSV Mainz 05': 2.7,
  'Mainz 05': 2.7,
  'Gladbach': 2.8,
  'Borussia Mönchengladbach': 2.8,
  'Mönchengladbach': 2.8,
  'Freiburg': 2.4,
  'SC Freiburg': 2.4
};

// Cache für dynamisch geladene Team-Quoten
let dynamicTeamOdds: Record<string, number> | null = null;
let lastOddsUpdate: number = 0;
const ODDS_CACHE_TTL = 5 * 60 * 1000; // 5 Minuten Cache
let isLoadingOdds = false;

/**
 * Lädt die aktuellen Team-Quoten (dynamisch oder Standard)
 */
async function loadCurrentTeamOdds(): Promise<Record<string, number>> {
  // Prüfe Cache-Gültigkeit
  const now = Date.now();
  if (dynamicTeamOdds && (now - lastOddsUpdate) < ODDS_CACHE_TTL) {
    return dynamicTeamOdds;
  }

  // Verhindere mehrfache gleichzeitige Ladevorgänge
  if (isLoadingOdds) {
    return dynamicTeamOdds ?? teamOddsMapping;
  }

  isLoadingOdds = true;

  try {
    // Versuche, gespeicherte Quoten zu laden (nur im Browser)
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/team-odds');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          dynamicTeamOdds = data.data;
          lastOddsUpdate = now;
          return dynamicTeamOdds;
        }
      }
    }
  } catch (error) {
    console.warn('Fehler beim Laden der dynamischen Team-Quoten:', error);
  } finally {
    isLoadingOdds = false;
  }

  // Fallback auf Standard-Mapping
  return teamOddsMapping;
}

/**
 * Get team odds for X-Factor calculation (synchron mit Cache)
 */
export function getTeamOdds(teamName: string): number {
  // Verwende gecachte dynamische Quoten falls verfügbar
  const currentMapping: Record<string, number> = dynamicTeamOdds || teamOddsMapping;
  
  // Try exact match first
  if (currentMapping[teamName]) {
    return currentMapping[teamName];
  }
  
  // Try partial match for common variations
  const normalizedTeamName = teamName.toLowerCase();
  for (const [key, value] of Object.entries(currentMapping)) {
    if (key.toLowerCase().includes(normalizedTeamName) || normalizedTeamName.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Default fallback
  console.warn(`No odds found for team: ${teamName}`);
  return 1.0;
}

/**
 * Get team odds for X-Factor calculation (asynchron mit API-Aufruf)
 */
export async function getTeamOddsAsync(teamName: string): Promise<number> {
  const currentMapping = await loadCurrentTeamOdds();
  
  // Try exact match first
  if (currentMapping[teamName]) {
    return currentMapping[teamName];
  }
  
  // Try partial match for common variations
  const normalizedTeamName = teamName.toLowerCase();
  for (const [key, value] of Object.entries(currentMapping)) {
    if (key.toLowerCase().includes(normalizedTeamName) || normalizedTeamName.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Default fallback
  console.warn(`No odds found for team: ${teamName}`);
  return 1.0;
}

/**
 * Invalidiert den Team-Quoten Cache (nach Änderungen)
 */
export function invalidateTeamOddsCache(): void {
  dynamicTeamOdds = null;
  lastOddsUpdate = 0;
}

/**
 * Initialisiert die Team-Quoten beim App-Start
 */
export function initializeTeamOdds(): void {
  if (typeof window !== 'undefined' && !dynamicTeamOdds && !isLoadingOdds) {
    loadCurrentTeamOdds().catch(error => {
      console.warn('Fehler beim Initialisieren der Team-Quoten:', error);
    });
  }
}

/**
 * Calculate X-Factor: (Points per Minute) * (Points per Million €) * Team Odds
 */
export function calculateXFactor(totalPoints: number, totalMinutes: number, marketValue: number, teamName: string): number {
  const pointsPerMinute = calculatePointsPerMinute(totalPoints, totalMinutes);
  const pointsPerMillion = calculatePointsPerMillion(totalPoints, marketValue);
  
  // Stelle sicher, dass die Quoten initialisiert sind
  initializeTeamOdds();
  
  const teamOdds = getTeamOdds(teamName);
  
  return pointsPerMinute * pointsPerMillion * teamOdds;
}
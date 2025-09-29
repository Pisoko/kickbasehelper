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
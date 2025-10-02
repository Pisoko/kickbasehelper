/**
 * Position corrections for players that are misclassified by the Kickbase API
 * This mapping corrects known position errors to ensure proper filtering in player selection
 */

import { Player } from './types';

// Mapping of player names to their correct positions
export const POSITION_CORRECTIONS: Record<string, Player['position']> = {
  // Bayern München corrections
  'Laimer': 'DEF',           // Classified as MID but is actually DEF
  'Kimmich': 'MID',          // Sometimes classified as DEF but plays MID
  'Davies': 'DEF',           // Sometimes classified as MID but plays DEF
  
  // Add more corrections as needed when discovered
  // Format: 'PlayerLastName': 'CorrectPosition'
};

/**
 * Corrects a player's position if it's known to be misclassified
 * @param player - The player object to correct
 * @returns The player with corrected position if applicable
 */
export function correctPlayerPosition(player: Player): Player {
  // Extract last name for matching (most reliable identifier)
  const lastName = player.name.split(' ').pop()?.trim();
  
  if (lastName && POSITION_CORRECTIONS[lastName]) {
    const correctedPosition = POSITION_CORRECTIONS[lastName];
    
    // Log the correction for debugging
    console.log(`Position correction: ${player.name} from ${player.position} to ${correctedPosition}`);
    
    return {
      ...player,
      position: correctedPosition
    };
  }
  
  return player;
}

/**
 * Applies position corrections to an array of players
 * @param players - Array of players to correct
 * @returns Array of players with corrected positions
 */
export function correctPlayersPositions(players: Player[]): Player[] {
  return players.map(correctPlayerPosition);
}
import type { Player } from './types';

/**
 * Player Exclusion System
 * 
 * This system allows users to permanently exclude players from:
 * - Player Explorer
 * - Optimization pool
 * - All player-related functionality
 * 
 * Excluded players are stored in localStorage for persistence across sessions.
 */

const EXCLUDED_PLAYERS_KEY = 'kickbase-excluded-players';

export interface ExcludedPlayer {
  id: string;
  name: string;
  verein: string;
  position: string;
  excludedAt: string; // ISO date string
  reason?: string; // Optional reason for exclusion
}

/**
 * Get all excluded players from localStorage
 */
export function getExcludedPlayers(): ExcludedPlayer[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(EXCLUDED_PLAYERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading excluded players:', error);
    return [];
  }
}

/**
 * Save excluded players to localStorage
 */
function saveExcludedPlayers(excludedPlayers: ExcludedPlayer[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(EXCLUDED_PLAYERS_KEY, JSON.stringify(excludedPlayers));
  } catch (error) {
    console.error('Error saving excluded players:', error);
  }
}

/**
 * Add a player to the exclusion list
 */
export function excludePlayer(player: Player, reason?: string): void {
  const excludedPlayers = getExcludedPlayers();
  
  // Check if player is already excluded
  if (excludedPlayers.some(ep => ep.id === player.id)) {
    console.warn(`Player ${player.name} is already excluded`);
    return;
  }
  
  const excludedPlayer: ExcludedPlayer = {
    id: player.id,
    name: player.name,
    verein: player.verein,
    position: player.position,
    excludedAt: new Date().toISOString(),
    reason
  };
  
  excludedPlayers.push(excludedPlayer);
  saveExcludedPlayers(excludedPlayers);
  
  console.info(`Player ${player.name} (${player.verein}) has been excluded from the player pool`);
}

/**
 * Remove a player from the exclusion list
 */
export function includePlayer(playerId: string): void {
  const excludedPlayers = getExcludedPlayers();
  const filteredPlayers = excludedPlayers.filter(ep => ep.id !== playerId);
  
  if (filteredPlayers.length === excludedPlayers.length) {
    console.warn(`Player with ID ${playerId} was not in the exclusion list`);
    return;
  }
  
  saveExcludedPlayers(filteredPlayers);
  
  const excludedPlayer = excludedPlayers.find(ep => ep.id === playerId);
  if (excludedPlayer) {
    console.info(`Player ${excludedPlayer.name} has been included back in the player pool`);
  }
}

/**
 * Check if a player is excluded
 */
export function isPlayerExcluded(playerId: string): boolean {
  const excludedPlayers = getExcludedPlayers();
  return excludedPlayers.some(ep => ep.id === playerId);
}

/**
 * Filter out excluded players from a player array
 */
export function filterExcludedPlayers(players: Player[]): Player[] {
  const excludedPlayers = getExcludedPlayers();
  const excludedIds = new Set(excludedPlayers.map(ep => ep.id));
  
  const filteredPlayers = players.filter(player => !excludedIds.has(player.id));
  
  const excludedCount = players.length - filteredPlayers.length;
  if (excludedCount > 0) {
    console.info(`Filtered out ${excludedCount} excluded players. Remaining: ${filteredPlayers.length} players`);
  }
  
  return filteredPlayers;
}

/**
 * Get excluded players with additional metadata
 */
export function getExcludedPlayersWithStats(): (ExcludedPlayer & { daysSinceExclusion: number })[] {
  const excludedPlayers = getExcludedPlayers();
  const now = new Date();
  
  return excludedPlayers.map(player => ({
    ...player,
    daysSinceExclusion: Math.floor((now.getTime() - new Date(player.excludedAt).getTime()) / (1000 * 60 * 60 * 24))
  }));
}

/**
 * Clear all excluded players (use with caution)
 */
export function clearAllExcludedPlayers(): void {
  if (typeof window === 'undefined') return;
  
  const excludedPlayers = getExcludedPlayers();
  localStorage.removeItem(EXCLUDED_PLAYERS_KEY);
  
  console.info(`Cleared ${excludedPlayers.length} excluded players from the exclusion list`);
}

/**
 * Export excluded players for backup
 */
export function exportExcludedPlayers(): string {
  const excludedPlayers = getExcludedPlayers();
  return JSON.stringify(excludedPlayers, null, 2);
}

/**
 * Import excluded players from backup
 */
export function importExcludedPlayers(jsonData: string): boolean {
  try {
    const importedPlayers = JSON.parse(jsonData) as ExcludedPlayer[];
    
    // Validate the imported data
    if (!Array.isArray(importedPlayers)) {
      throw new Error('Invalid data format: expected array');
    }
    
    for (const player of importedPlayers) {
      if (!player.id || !player.name || !player.verein || !player.position || !player.excludedAt) {
        throw new Error('Invalid player data: missing required fields');
      }
    }
    
    saveExcludedPlayers(importedPlayers);
    console.info(`Successfully imported ${importedPlayers.length} excluded players`);
    return true;
  } catch (error) {
    console.error('Error importing excluded players:', error);
    return false;
  }
}
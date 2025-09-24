import fs from 'node:fs';
import path from 'node:path';

import { FORMATION_LIST } from './constants';
import type { Match, Odds, Player } from './types';

export interface CachedDay {
  updatedAt: string;
  players: Player[];
  matches: Match[];
  odds?: Odds[];
}

const DATA_ROOT = path.join(process.cwd(), 'data');

export function getSeasonFolder(season?: string) {
  if (season) {
    return path.join(DATA_ROOT, season);
  }
  const year = new Date().getFullYear();
  return path.join(DATA_ROOT, String(year));
}

export function getCacheFile(spieltag: number, season?: string) {
  const folder = getSeasonFolder(season);
  return path.join(folder, `spieltag_${spieltag}.json`);
}

export function readCache(spieltag: number, season?: string): CachedDay | null {
  const file = getCacheFile(spieltag, season);
  if (!fs.existsSync(file)) {
    return null;
  }
  const raw = fs.readFileSync(file, 'utf-8');
  return JSON.parse(raw) as CachedDay;
}

export function writeCache(spieltag: number, data: CachedDay, season?: string) {
  const file = getCacheFile(spieltag, season);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

export function cacheAgeDays(spieltag: number, season?: string): number | null {
  const file = getCacheFile(spieltag, season);
  if (!fs.existsSync(file)) {
    return null;
  }
  const stats = fs.statSync(file);
  const diff = Date.now() - stats.mtimeMs;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Function to calculate totalMinutesPlayed from minutes_hist array
export function calculateTotalMinutesPlayed(player: any): number {
  if (!player.minutes_hist || !Array.isArray(player.minutes_hist)) {
    return 0;
  }
  
  // minutes_hist already contains minutes, so we just sum them up
  return player.minutes_hist.reduce((total: number, minutes: number) => total + (minutes || 0), 0);
}

export function validatePlayerData(players: Player[]) {
  if (!Array.isArray(players)) {
    throw new Error('Spielerdaten ungültig');
  }
  const positions = new Set(players.map((p) => p.position));
  const required: Player['position'][] = ['GK', 'DEF', 'MID', 'FWD'];
  for (const pos of required) {
    if (!positions.has(pos)) {
      throw new Error(`Position ${pos} fehlt in den Daten`);
    }
  }
}

/**
 * Validates that players belong only to the 18 official Bundesliga teams for 2025/26 season
 * Filters out any players from teams not in the official roster
 */
export function validateBundesligaTeamMembership(players: Player[]): Player[] {
  // Official 18 Bundesliga teams for 2025/26 season with correct men's team IDs (≤ 55)
  const validBundesligaTeams = new Set([
    'Bayern München',         // ID 2
    'Borussia Dortmund',      // ID 3
    'Eintracht Frankfurt',    // ID 4
    'SC Freiburg',            // ID 5
    'Hamburger SV',           // ID 6 (Promoted)
    'Bayer 04 Leverkusen',    // ID 7
    'VfB Stuttgart',          // ID 9
    'Werder Bremen',          // ID 10
    'VfL Wolfsburg',          // ID 11
    'FC Augsburg',            // ID 13
    'TSG Hoffenheim',         // ID 14
    'Borussia Mönchengladbach', // ID 15
    'FSV Mainz 05',           // ID 18
    '1. FC Köln',             // ID 28 (Promoted)
    'FC St. Pauli',           // ID 39 (Promoted)
    '1. FC Union Berlin',     // ID 40
    'RB Leipzig',             // ID 43
    '1. FC Heidenheim'        // ID 50
  ]);

  // Also accept common short names and variations
  const teamNameVariations = new Map([
    ['Bayern', 'Bayern München'],
    ['Dortmund', 'Borussia Dortmund'],
    ['Frankfurt', 'Eintracht Frankfurt'],
    ['Freiburg', 'SC Freiburg'],
    ['Hamburg', 'Hamburger SV'],  // Fix duplicate: Hamburg -> Hamburger SV
    ['HSV', 'Hamburger SV'],
    ['Leverkusen', 'Bayer 04 Leverkusen'],
    ['Stuttgart', 'VfB Stuttgart'],
    ['Bremen', 'Werder Bremen'],
    ['Wolfsburg', 'VfL Wolfsburg'],
    ['Augsburg', 'FC Augsburg'],
    ['Hoffenheim', 'TSG Hoffenheim'],
    ['Gladbach', 'Borussia Mönchengladbach'],
    ['M\'gladbach', 'Borussia Mönchengladbach'],  // Fix duplicate: M'gladbach -> Borussia Mönchengladbach
    ['Mönchengladbach', 'Borussia Mönchengladbach'],
    ['Mainz', 'FSV Mainz 05'],
    ['Köln', '1. FC Köln'],
    ['St. Pauli', 'FC St. Pauli'],  // Fix duplicate: St. Pauli -> FC St. Pauli
    ['Union Berlin', '1. FC Union Berlin'],
    ['Union', '1. FC Union Berlin'],
    ['Leipzig', 'RB Leipzig'],
    ['Heidenheim', '1. FC Heidenheim']
  ]);

  const validPlayers = players.filter(player => {
    const teamName = player.verein?.trim();
    if (!teamName) {
      console.warn(`Player ${player.name} has no team assigned, excluding from Bundesliga roster`);
      return false;
    }

    // Check if team name is directly in the valid teams set
    if (validBundesligaTeams.has(teamName)) {
      return true;
    }

    // Check if team name is a known variation
    const normalizedTeamName = teamNameVariations.get(teamName);
    if (normalizedTeamName && validBundesligaTeams.has(normalizedTeamName)) {
      return true;
    }

    // Log invalid teams for debugging
    console.warn(`Player ${player.name} belongs to non-Bundesliga team: "${teamName}", excluding from roster`);
    return false;
  }).map(player => ({ ...player })); // Ensure all properties are preserved

  const excludedCount = players.length - validPlayers.length;
  if (excludedCount > 0) {
    console.info(`Filtered out ${excludedCount} players from non-Bundesliga teams. Remaining: ${validPlayers.length} players from official Bundesliga teams.`);
  }

  // Validate that we have players from all 18 teams
  const teamsWithPlayers = new Set(validPlayers.map(p => {
    const teamName = p.verein?.trim();
    return teamNameVariations.get(teamName || '') || teamName;
  }));

  const missingTeams = [...validBundesligaTeams].filter(team => !teamsWithPlayers.has(team));
  if (missingTeams.length > 0) {
    console.warn(`Warning: No players found for the following Bundesliga teams: ${missingTeams.join(', ')}`);
  }

  console.info(`Validation complete: ${validPlayers.length} players from ${teamsWithPlayers.size}/18 Bundesliga teams`);
  return validPlayers;
}

/**
 * Enhanced player data validation that includes team membership validation
 */
export function validatePlayerDataWithTeamCheck(players: Player[]): Player[] {
  // First run basic validation
  validatePlayerData(players);
  
  // Then filter for Bundesliga team membership
  const validPlayers = validateBundesligaTeamMembership(players);
  
  // Run basic validation again on filtered data
  validatePlayerData(validPlayers);
  
  return validPlayers;
}

export const AVAILABLE_FORMATIONS = FORMATION_LIST;

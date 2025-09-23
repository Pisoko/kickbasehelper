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

export function validatePlayerData(players: Player[]) {
  if (!Array.isArray(players)) {
    throw new Error('Spielerdaten ungültig');
  }
  const positions = new Set(players.map((p) => p.position));
  const required = ['GK', 'DEF', 'MID', 'FWD'];
  for (const pos of required) {
    if (!positions.has(pos as typeof pos)) {
      throw new Error(`Position ${pos} fehlt in den Daten`);
    }
  }
}

export const AVAILABLE_FORMATIONS = FORMATION_LIST;

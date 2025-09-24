// Mapping von Kurznamen zu offiziellen Vereinsnamen der Bundesliga Saison 2025/26
export const TEAM_NAME_MAPPING: Record<string, string> = {
  'Augsburg': 'FC Augsburg',
  'Bayern': 'FC Bayern München',
  'Bremen': 'SV Werder Bremen',
  'Dortmund': 'Borussia Dortmund',
  'Frankfurt': 'Eintracht Frankfurt',
  'Freiburg': 'SC Freiburg',
  'Hamburg': 'Hamburger SV',
  'Heidenheim': '1. FC Heidenheim 1846',
  'Hoffenheim': 'TSG 1899 Hoffenheim',
  'Köln': '1. FC Köln',
  'Leipzig': 'RB Leipzig',
  'Leverkusen': 'Bayer 04 Leverkusen',
  'M\'gladbach': 'Borussia Mönchengladbach',
  'Mainz': '1. FSV Mainz 05',
  'St. Pauli': 'FC St. Pauli',
  'Stuttgart': 'VfB Stuttgart',
  'Union Berlin': '1. FC Union Berlin',
  'Wolfsburg': 'VfL Wolfsburg'
};

/**
 * Konvertiert einen Kurznamen zu dem offiziellen Vereinsnamen
 * @param shortName Der Kurzname des Vereins (z.B. "Bayern")
 * @returns Der offizielle Vereinsname (z.B. "FC Bayern München")
 */
export function getFullTeamName(shortName: string): string {
  return TEAM_NAME_MAPPING[shortName] || shortName;
}

/**
 * Gibt alle verfügbaren Kurznamen zurück
 * @returns Array aller Kurznamen
 */
export function getAvailableShortNames(): string[] {
  return Object.keys(TEAM_NAME_MAPPING);
}

/**
 * Gibt alle verfügbaren offiziellen Vereinsnamen zurück
 * @returns Array aller offiziellen Vereinsnamen
 */
export function getAvailableFullNames(): string[] {
  return Object.values(TEAM_NAME_MAPPING);
}
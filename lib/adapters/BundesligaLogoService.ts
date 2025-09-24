/**
 * Service für die Integration der offiziellen Bundesliga-Vereinslogos
 * Basiert auf den DFL-CLU-IDs von bundesliga.com
 */

// Mapping zwischen Vereins-Kurznamen und DFL-CLU-IDs
const TEAM_LOGO_MAPPING: Record<string, string> = {
  'Augsburg': 'DFL-CLU-000010',        // FC Augsburg
  'Bayern': 'DFL-CLU-00000G',          // FC Bayern München
  'Bremen': 'DFL-CLU-00000E',          // SV Werder Bremen
  'Dortmund': 'DFL-CLU-000007',        // Borussia Dortmund
  'Frankfurt': 'DFL-CLU-00000F',       // Eintracht Frankfurt
  'Freiburg': 'DFL-CLU-00000A',        // SC Freiburg
  'Hamburg': 'DFL-CLU-00000C',         // Hamburger SV
  'Heidenheim': 'DFL-CLU-000018',      // 1. FC Heidenheim 1846
  'Hoffenheim': 'DFL-CLU-000002',      // TSG 1899 Hoffenheim
  'Köln': 'DFL-CLU-000008',            // 1. FC Köln
  'Leipzig': 'DFL-CLU-000017',         // RB Leipzig
  'Leverkusen': 'DFL-CLU-00000B',      // Bayer 04 Leverkusen
  'M\'gladbach': 'DFL-CLU-000004',     // Borussia Mönchengladbach
  'Mainz': 'DFL-CLU-000006',           // 1. FSV Mainz 05
  'St. Pauli': 'DFL-CLU-00000H',       // FC St. Pauli
  'Stuttgart': 'DFL-CLU-00000D',       // VfB Stuttgart
  'Union Berlin': 'DFL-CLU-00000V',    // 1. FC Union Berlin
  'Wolfsburg': 'DFL-CLU-000003'        // VfL Wolfsburg
};

/**
 * Basis-URL für Bundesliga-Logos
 */
const BUNDESLIGA_LOGO_BASE_URL = 'https://www.bundesliga.com/assets/clublogo/';

/**
 * Generiert die vollständige Logo-URL für einen Verein
 * @param teamShortName Der Kurzname des Vereins (z.B. "Bayern", "Dortmund")
 * @returns Die vollständige URL zum SVG-Logo oder null wenn nicht gefunden
 */
export function getBundesligaLogoUrl(teamShortName: string): string | null {
  const dflId = TEAM_LOGO_MAPPING[teamShortName];
  if (!dflId) {
    console.warn(`Kein Logo gefunden für Team: ${teamShortName}`);
    return null;
  }
  
  return `${BUNDESLIGA_LOGO_BASE_URL}${dflId}.svg`;
}

/**
 * Überprüft ob für einen Verein ein Logo verfügbar ist
 * @param teamShortName Der Kurzname des Vereins
 * @returns true wenn ein Logo verfügbar ist
 */
export function hasLogo(teamShortName: string): boolean {
  return teamShortName in TEAM_LOGO_MAPPING;
}

/**
 * Gibt alle verfügbaren Team-Kurznamen mit Logos zurück
 * @returns Array aller Team-Kurznamen für die Logos verfügbar sind
 */
export function getAvailableTeamsWithLogos(): string[] {
  return Object.keys(TEAM_LOGO_MAPPING);
}

/**
 * Gibt das DFL-CLU-ID für einen Verein zurück
 * @param teamShortName Der Kurzname des Vereins
 * @returns Die DFL-CLU-ID oder null wenn nicht gefunden
 */
export function getDflId(teamShortName: string): string | null {
  return TEAM_LOGO_MAPPING[teamShortName] || null;
}

/**
 * Erstellt einen Fallback-Text für Vereine ohne Logo
 * @param teamShortName Der Kurzname des Vereins
 * @returns Kurzer Text für die Anzeige (max. 3 Zeichen)
 */
export function getLogoFallbackText(teamShortName: string): string {
  // Verwende die ersten 3 Buchstaben des Vereinsnamens
  return teamShortName.substring(0, 3).toUpperCase();
}
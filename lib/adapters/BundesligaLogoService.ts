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

// Mapping zwischen vollständigen Teamnamen und Kurznamen
const FULL_NAME_TO_SHORT_NAME: Record<string, string> = {
  // Bayern München Varianten
  'FC Bayern München': 'Bayern',
  'Bayern München': 'Bayern',
  
  // Borussia Dortmund Varianten
  'Borussia Dortmund': 'Dortmund',
  'BVB': 'Dortmund',
  
  // RB Leipzig Varianten
  'RB Leipzig': 'Leipzig',
  
  // Bayer Leverkusen Varianten
  'Bayer 04 Leverkusen': 'Leverkusen',
  'Bayer Leverkusen': 'Leverkusen',
  
  // Eintracht Frankfurt Varianten
  'Eintracht Frankfurt': 'Frankfurt',
  
  // SC Freiburg Varianten
  'SC Freiburg': 'Freiburg',
  
  // Union Berlin Varianten
  '1. FC Union Berlin': 'Union Berlin',
  'FC Union Berlin': 'Union Berlin',
  'Union Berlin': 'Union Berlin',
  
  // Borussia Mönchengladbach Varianten
  'Borussia Mönchengladbach': 'M\'gladbach',
  'Borussia M\'gladbach': 'M\'gladbach',
  
  // VfL Wolfsburg Varianten
  'VfL Wolfsburg': 'Wolfsburg',
  
  // FC Augsburg Varianten
  'FC Augsburg': 'Augsburg',
  
  // TSG Hoffenheim Varianten
  'TSG 1899 Hoffenheim': 'Hoffenheim',
  'TSG Hoffenheim': 'Hoffenheim',
  
  // VfB Stuttgart Varianten
  'VfB Stuttgart': 'Stuttgart',
  
  // Werder Bremen Varianten
  'SV Werder Bremen': 'Bremen',
  'Werder Bremen': 'Bremen',
  
  // FSV Mainz 05 Varianten
  '1. FSV Mainz 05': 'Mainz',
  'FSV Mainz 05': 'Mainz',
  'Mainz 05': 'Mainz',
  
  // FC Heidenheim Varianten
  '1. FC Heidenheim 1846': 'Heidenheim',
  '1. FC Heidenheim': 'Heidenheim',
  'FC Heidenheim': 'Heidenheim',
  
  // FC St. Pauli Varianten
  'FC St. Pauli': 'St. Pauli',
  
  // 1. FC Köln Varianten
  '1. FC Köln': 'Köln',
  'FC Köln': 'Köln',
  
  // Hamburger SV Varianten
  'Hamburger SV': 'Hamburg',
  'HSV': 'Hamburg'
};

/**
 * Basis-URL für Bundesliga-Logos
 */
const BUNDESLIGA_LOGO_BASE_URL = 'https://www.bundesliga.com/assets/clublogo/';

/**
 * Konvertiert einen vollständigen Teamnamen zu einem Kurznamen
 * @param fullTeamName Der vollständige Teamname (z.B. "FC Bayern München")
 * @returns Der Kurzname (z.B. "Bayern") oder der ursprüngliche Name falls keine Zuordnung gefunden wird
 */
export function getShortTeamName(fullTeamName: string): string {
  return FULL_NAME_TO_SHORT_NAME[fullTeamName] || fullTeamName;
}

/**
 * Generiert die vollständige Logo-URL für einen Verein
 * @param teamName Der Team-Name (kann vollständig oder kurz sein)
 * @returns Die vollständige URL zum SVG-Logo oder null wenn nicht gefunden
 */
export function getBundesligaLogoUrl(teamName: string): string | null {
  // Erst versuchen, den Namen als Kurznamen zu verwenden
  let shortName = teamName;
  
  // Falls es ein vollständiger Name ist, zu Kurzname konvertieren
  if (FULL_NAME_TO_SHORT_NAME[teamName]) {
    shortName = FULL_NAME_TO_SHORT_NAME[teamName];
  }
  
  const dflId = TEAM_LOGO_MAPPING[shortName];
  if (!dflId) {
    console.warn(`Kein Logo gefunden für Team: ${teamName} (Kurzname: ${shortName})`);
    return null;
  }
  
  return `${BUNDESLIGA_LOGO_BASE_URL}${dflId}.svg`;
}

/**
 * Überprüft ob für einen Verein ein Logo verfügbar ist
 * @param teamName Der Team-Name (kann vollständig oder kurz sein)
 * @returns true wenn ein Logo verfügbar ist, false sonst
 */
export function hasLogo(teamName: string): boolean {
  const shortName = FULL_NAME_TO_SHORT_NAME[teamName] || teamName;
  return shortName in TEAM_LOGO_MAPPING;
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
 * @param teamName Der Team-Name (kann vollständig oder kurz sein)
 * @returns Die DFL-CLU-ID oder null wenn nicht gefunden
 */
export function getDflId(teamName: string): string | null {
  const shortName = FULL_NAME_TO_SHORT_NAME[teamName] || teamName;
  return TEAM_LOGO_MAPPING[shortName] || null;
}

/**
 * Erstellt einen Fallback-Text für Vereine ohne Logo
 * @param teamName Der Team-Name (kann vollständig oder kurz sein)
 * @returns Kurzer Text für die Anzeige (max. 3 Zeichen)
 */
export function getLogoFallbackText(teamName: string): string {
  const shortName = FULL_NAME_TO_SHORT_NAME[teamName] || teamName;
  return shortName.substring(0, 3).toUpperCase();
}
/**
 * Zentrale Team-Mapping-Konfiguration für die 2025/26 Bundesliga-Saison
 * 
 * Diese Datei enthält alle Mappings zwischen:
 * - Kickbase Team-IDs (Legacy IDs für API-Kompatibilität)
 * - DFL-CLU-IDs (für offizielle Bundesliga-Logos)
 * - Team-Namen (vollständige und kurze Namen)
 */

export interface TeamInfo {
  kickbaseId: string;
  dflId: string;
  fullName: string;
  shortName: string;
  isActive: boolean; // Aktuell in der Bundesliga 2025/26
}

/**
 * Vollständige Team-Mapping-Tabelle für die 2025/26 Bundesliga-Saison
 */
export const TEAM_MAPPING: Record<string, TeamInfo> = {
  // Aktuelle Bundesliga-Teams 2025/26
  '2': {
    kickbaseId: '2',
    dflId: 'DFL-CLU-00000G',
    fullName: 'Bayern München',
    shortName: 'Bayern',
    isActive: true
  },
  '3': {
    kickbaseId: '3',
    dflId: 'DFL-CLU-000007',
    fullName: 'Borussia Dortmund',
    shortName: 'Dortmund',
    isActive: true
  },
  '4': {
    kickbaseId: '4',
    dflId: 'DFL-CLU-00000F',
    fullName: 'Eintracht Frankfurt',
    shortName: 'Frankfurt',
    isActive: true
  },
  '5': {
    kickbaseId: '5',
    dflId: 'DFL-CLU-00000A',
    fullName: 'SC Freiburg',
    shortName: 'Freiburg',
    isActive: true
  },
  '6': {
    kickbaseId: '6',
    dflId: 'DFL-CLU-00000C',
    fullName: 'Hamburger SV',
    shortName: 'Hamburg',
    isActive: true
  },
  '7': {
    kickbaseId: '7',
    dflId: 'DFL-CLU-00000B',
    fullName: 'Bayer 04 Leverkusen',
    shortName: 'Leverkusen',
    isActive: true
  },
  '9': {
    kickbaseId: '9',
    dflId: 'DFL-CLU-00000D',
    fullName: 'VfB Stuttgart',
    shortName: 'Stuttgart',
    isActive: true
  },
  '10': {
    kickbaseId: '10',
    dflId: 'DFL-CLU-00000E',
    fullName: 'Werder Bremen',
    shortName: 'Bremen',
    isActive: true
  },
  '11': {
    kickbaseId: '11',
    dflId: 'DFL-CLU-000003',
    fullName: 'VfL Wolfsburg',
    shortName: 'Wolfsburg',
    isActive: true
  },
  '12': {
    kickbaseId: '12',
    dflId: 'DFL-CLU-000002',
    fullName: 'TSG Hoffenheim',
    shortName: 'Hoffenheim',
    isActive: true
  },
  '13': {
    kickbaseId: '13',
    dflId: 'DFL-CLU-000010',
    fullName: 'FC Augsburg',
    shortName: 'Augsburg',
    isActive: true
  },
  '15': {
    kickbaseId: '15',
    dflId: 'DFL-CLU-000004',
    fullName: 'Borussia Mönchengladbach',
    shortName: 'M\'gladbach',
    isActive: true
  },
  '18': {
    kickbaseId: '18',
    dflId: 'DFL-CLU-000006',
    fullName: 'FSV Mainz 05',
    shortName: 'Mainz',
    isActive: true
  },
  '28': {
    kickbaseId: '28',
    dflId: 'DFL-CLU-000008',
    fullName: '1. FC Köln',
    shortName: 'Köln',
    isActive: true
  },
  '39': {
    kickbaseId: '39',
    dflId: 'DFL-CLU-00000H',
    fullName: 'FC St. Pauli',
    shortName: 'St. Pauli',
    isActive: true
  },
  '40': {
    kickbaseId: '40',
    dflId: 'DFL-CLU-00000V',
    fullName: '1. FC Union Berlin',
    shortName: 'Union Berlin',
    isActive: true
  },
  '43': {
    kickbaseId: '43',
    dflId: 'DFL-CLU-000017',
    fullName: 'RB Leipzig',
    shortName: 'Leipzig',
    isActive: true
  },
  '50': {
    kickbaseId: '50',
    dflId: 'DFL-CLU-000018',
    fullName: '1. FC Heidenheim',
    shortName: 'Heidenheim',
    isActive: true
  },
  
  // Inaktive Teams (abgestiegen oder nicht mehr in der Bundesliga)
  '8': {
    kickbaseId: '8',
    dflId: 'DFL-CLU-000009',
    fullName: 'FC Schalke 04',
    shortName: 'Schalke',
    isActive: false
  },
  '14': {
    kickbaseId: '14',
    dflId: 'DFL-CLU-000005',
    fullName: 'VfL Bochum',
    shortName: 'Bochum',
    isActive: false
  }

} as const;

/**
 * Zusätzliche Team-Namen-Mappings für alternative Schreibweisen
 * Mappt alternative Namen auf die fullName-Werte aus TEAM_MAPPING
 */
export const TEAM_NAME_MAPPING: Record<string, string> = {
  // Kurze Namen zu vollständigen Namen
  'Augsburg': 'FC Augsburg',
  'Bayern': 'Bayern München',
  'Bremen': 'Werder Bremen',
  'Dortmund': 'Borussia Dortmund',
  'Frankfurt': 'Eintracht Frankfurt',
  'Freiburg': 'SC Freiburg',
  'Hamburg': 'Hamburger SV',
  'Heidenheim': '1. FC Heidenheim',
  'Hoffenheim': 'TSG Hoffenheim',
  'Köln': '1. FC Köln',
  'Leipzig': 'RB Leipzig',
  'Leverkusen': 'Bayer 04 Leverkusen',
  'M\'gladbach': 'Borussia Mönchengladbach',
  'Mainz': 'FSV Mainz 05',
  'St. Pauli': 'FC St. Pauli',
  'Stuttgart': 'VfB Stuttgart',
  'Union Berlin': '1. FC Union Berlin',
  'Wolfsburg': 'VfL Wolfsburg',
  
  // Alternative Schreibweisen aus der API
  'Bayer Leverkusen': 'Bayer 04 Leverkusen',
  'FC Bayern München': 'Bayern München',
  'SV Werder Bremen': 'Werder Bremen',
  'TSG 1899 Hoffenheim': 'TSG Hoffenheim',
  '1. FSV Mainz 05': 'FSV Mainz 05',
  'FC Köln': '1. FC Köln',
  '1. FC Heidenheim 1846': '1. FC Heidenheim',
  
  // Weitere mögliche Varianten
  'BVB': 'Borussia Dortmund',
  'HSV': 'Hamburger SV',
  'SGE': 'Eintracht Frankfurt',
  'FCB': 'Bayern München',
  
  // API-spezifische Team-Namen (z.B. "Team 14" für TSG Hoffenheim)
  'Team 14': 'TSG Hoffenheim'
};

/**
 * Holt Team-Informationen basierend auf der Kickbase-ID
 * @param kickbaseId Die Kickbase Team-ID (string oder number)
 * @returns TeamInfo-Objekt oder undefined wenn nicht gefunden
 */
export function getTeamByKickbaseId(kickbaseId: string | number): TeamInfo | undefined {
  // Konvertiere zu String und entferne Leerzeichen am Anfang und Ende der ID
  const cleanId = String(kickbaseId).trim();
  return TEAM_MAPPING[cleanId];
}

/**
 * Holt Team-Informationen basierend auf dem vollständigen Team-Namen
 * @param fullName Der vollständige Team-Name (z.B. "Bayern München")
 * @returns TeamInfo-Objekt oder undefined wenn nicht gefunden
 */
export function getTeamByFullName(fullName: string): TeamInfo | undefined {
  return Object.values(TEAM_MAPPING).find(team => team.fullName === fullName);
}

/**
 * Holt Team-Informationen basierend auf dem kurzen Team-Namen
 * @param shortName Der kurze Team-Name (z.B. "Bayern")
 * @returns TeamInfo-Objekt oder undefined wenn nicht gefunden
 */
export function getTeamByShortName(shortName: string): TeamInfo | undefined {
  return Object.values(TEAM_MAPPING).find(team => team.shortName === shortName);
}

/**
 * Holt die DFL-ID für ein Team basierend auf der Kickbase-ID
 * @param kickbaseId Die Kickbase Team-ID (string oder number)
 * @returns DFL-ID oder undefined wenn nicht gefunden
 */
export function getDflIdByKickbaseId(kickbaseId: string | number): string | undefined {
  const cleanId = String(kickbaseId).trim();
  return TEAM_MAPPING[cleanId]?.dflId;
}

/**
 * Holt die DFL-ID für ein Team basierend auf dem Team-Namen
 * @param teamName Der Team-Name (vollständig oder kurz)
 * @returns DFL-ID oder undefined wenn nicht gefunden
 */
export function getDflIdByTeamName(teamName: string): string | undefined {
  // Versuche zuerst vollständigen Namen
  let team = getTeamByFullName(teamName);
  if (team) return team.dflId;
  
  // Dann kurzen Namen
  team = getTeamByShortName(teamName);
  if (team) return team.dflId;
  
  // Versuche alternative Namen aus TEAM_NAME_MAPPING
  const mappedName = TEAM_NAME_MAPPING[teamName];
  if (mappedName) {
    team = getTeamByFullName(mappedName);
    if (team) return team.dflId;
  }
  
  return undefined;
}

/**
 * Generiert die Bundesliga-Logo-URL basierend auf der DFL-ID
 * @param dflId Die DFL-CLU-ID
 * @returns Logo-URL
 */
export function getBundesligaLogoUrlByDflId(dflId: string): string {
  return `https://www.bundesliga.com/assets/clublogo/${dflId}.svg`;
}

/**
 * Generiert die Bundesliga-Logo-URL basierend auf der Kickbase-ID
 * @param kickbaseId Die Kickbase Team-ID (string oder number)
 * @returns Logo-URL oder undefined wenn Team nicht gefunden
 */
export function getBundesligaLogoUrlByKickbaseId(kickbaseId: string | number): string | undefined {
  const dflId = getDflIdByKickbaseId(kickbaseId);
  return dflId ? getBundesligaLogoUrlByDflId(dflId) : undefined;
}

/**
 * Generiert die Bundesliga-Logo-URL basierend auf dem Team-Namen
 * @param teamName Der Team-Name (vollständig oder kurz)
 * @returns Logo-URL oder undefined wenn Team nicht gefunden
 */
export function getBundesligaLogoUrlByTeamName(teamName: string): string | undefined {
  const dflId = getDflIdByTeamName(teamName);
  return dflId ? getBundesligaLogoUrlByDflId(dflId) : undefined;
}

/**
 * Prüft ob ein Team ein Logo hat (basierend auf Kickbase-ID)
 * @param kickbaseId Die Kickbase Team-ID (string oder number)
 * @returns true wenn Logo verfügbar ist
 */
export function hasLogoByKickbaseId(kickbaseId: string | number): boolean {
  return !!getDflIdByKickbaseId(kickbaseId);
}

/**
 * Prüft ob ein Team ein Logo hat (basierend auf Team-Namen)
 * @param teamName Der Team-Name (vollständig oder kurz)
 * @returns true wenn Logo verfügbar ist
 */
export function hasLogoByTeamName(teamName: string): boolean {
  return !!getDflIdByTeamName(teamName);
}

/**
 * Holt alle aktiven Teams (aktuell in der Bundesliga)
 * @returns Array aller aktiven TeamInfo-Objekte
 */
export function getActiveTeams(): TeamInfo[] {
  return Object.values(TEAM_MAPPING).filter(team => team.isActive);
}

/**
 * Holt alle Teams mit verfügbaren Logos
 * @returns Array aller TeamInfo-Objekte mit Logos
 */
export function getTeamsWithLogos(): TeamInfo[] {
  return Object.values(TEAM_MAPPING);
}

// Legacy-Funktionen für Rückwärtskompatibilität

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
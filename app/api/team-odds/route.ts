import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const TEAM_ODDS_FILE = path.join(process.cwd(), 'data', 'team-odds.json');

interface TeamOddsData {
  teamOdds: Record<string, number>;
  updatedAt: string;
  version: number;
}

/**
 * GET /api/team-odds - Abrufen der aktuellen Team-Quoten
 */
export async function GET() {
  try {
    // Versuche, gespeicherte Team-Quoten zu laden
    try {
      const data = await fs.readFile(TEAM_ODDS_FILE, 'utf-8');
      const teamOddsData: TeamOddsData = JSON.parse(data);
      
      return NextResponse.json({
        success: true,
        data: teamOddsData.teamOdds,
        updatedAt: teamOddsData.updatedAt,
        version: teamOddsData.version
      });
    } catch (fileError) {
      // Datei existiert nicht, verwende Standard-Mapping
      const { teamOddsMapping } = await import('../../../lib/positionUtils');
      
      return NextResponse.json({
        success: true,
        data: teamOddsMapping,
        updatedAt: new Date().toISOString(),
        version: 1,
        source: 'default'
      });
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Team-Quoten:', error);
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Abrufen der Team-Quoten'
    }, { status: 500 });
  }
}

/**
 * POST /api/team-odds - Speichern der Team-Quoten
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamOdds } = body;

    if (!teamOdds || typeof teamOdds !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Ungültige Team-Quoten Daten'
      }, { status: 400 });
    }

    // Validiere die Quoten-Werte
    for (const [teamName, odds] of Object.entries(teamOdds)) {
      if (typeof odds !== 'number' || odds <= 0 || odds > 10) {
        return NextResponse.json({
          success: false,
          error: `Ungültiger Quoten-Wert für ${teamName}: ${odds}`
        }, { status: 400 });
      }
    }

    // Lade aktuelle Version (falls vorhanden)
    let currentVersion = 1;
    try {
      const existingData = await fs.readFile(TEAM_ODDS_FILE, 'utf-8');
      const existing: TeamOddsData = JSON.parse(existingData);
      currentVersion = existing.version + 1;
    } catch {
      // Datei existiert nicht, verwende Version 1
    }

    // Erstelle neue Team-Quoten Daten
    const teamOddsData: TeamOddsData = {
      teamOdds: teamOdds as Record<string, number>,
      updatedAt: new Date().toISOString(),
      version: currentVersion
    };

    // Stelle sicher, dass das data-Verzeichnis existiert
    const dataDir = path.dirname(TEAM_ODDS_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    // Speichere die Daten
    await fs.writeFile(TEAM_ODDS_FILE, JSON.stringify(teamOddsData, null, 2));

    // Aktualisiere das Runtime-Mapping (für sofortige Wirkung)
    await updateRuntimeTeamOdds(teamOdds as Record<string, number>);

    console.log(`Team-Quoten erfolgreich gespeichert (Version ${currentVersion})`);

    return NextResponse.json({
      success: true,
      message: 'Team-Quoten erfolgreich gespeichert',
      version: currentVersion,
      updatedAt: teamOddsData.updatedAt
    });

  } catch (error) {
    console.error('Fehler beim Speichern der Team-Quoten:', error);
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Speichern der Team-Quoten'
    }, { status: 500 });
  }
}

/**
 * PUT /api/team-odds - Zurücksetzen auf Standard-Quoten
 */
export async function PUT() {
  try {
    // Lade Standard-Mapping
    const { teamOddsMapping } = await import('../../../lib/positionUtils');

    // Lade aktuelle Version
    let currentVersion = 1;
    try {
      const existingData = await fs.readFile(TEAM_ODDS_FILE, 'utf-8');
      const existing: TeamOddsData = JSON.parse(existingData);
      currentVersion = existing.version + 1;
    } catch {
      // Datei existiert nicht
    }

    const teamOddsData: TeamOddsData = {
      teamOdds: teamOddsMapping,
      updatedAt: new Date().toISOString(),
      version: currentVersion
    };

    // Speichere Standard-Quoten
    await fs.writeFile(TEAM_ODDS_FILE, JSON.stringify(teamOddsData, null, 2));

    // Aktualisiere Runtime-Mapping
    await updateRuntimeTeamOdds(teamOddsMapping);

    return NextResponse.json({
      success: true,
      message: 'Team-Quoten auf Standard zurückgesetzt',
      data: teamOddsMapping,
      version: currentVersion,
      updatedAt: teamOddsData.updatedAt
    });

  } catch (error) {
    console.error('Fehler beim Zurücksetzen der Team-Quoten:', error);
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Zurücksetzen der Team-Quoten'
    }, { status: 500 });
  }
}

/**
 * Aktualisiert das Runtime Team-Odds Mapping für sofortige Wirkung
 */
async function updateRuntimeTeamOdds(newOdds: Record<string, number>) {
  try {
    // Importiere die Cache-Invalidierung und Force-Reload Funktionen
    const { invalidateTeamOddsCache, forceReloadTeamOdds } = await import('../../../lib/positionUtils');
    
    // Invalidiere den Cache und lade neue Daten sofort
    invalidateTeamOddsCache();
    await forceReloadTeamOdds();
    
    console.log('Runtime Team-Quoten aktualisiert und neu geladen:', Object.keys(newOdds).length, 'Teams');
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Runtime Team-Quoten:', error);
  }
}
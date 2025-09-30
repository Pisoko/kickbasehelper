import { NextRequest, NextResponse } from 'next/server';
import { BuildService } from '../../../lib/services/BuildService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'info';

    switch (action) {
      case 'info':
        // Aktuelle Build-Information abrufen
        const buildInfo = BuildService.getCurrentBuildInfo();
        return NextResponse.json({
          success: true,
          data: buildInfo
        });

      case 'changelog':
        // Changelog abrufen
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const changelog = BuildService.getChangelog().slice(0, limit);
        return NextResponse.json({
          success: true,
          data: changelog
        });

      case 'update':
        // Build-Information aktualisieren (nur in Development)
        if (process.env.NODE_ENV === 'development') {
          const updatedBuildInfo = BuildService.updateBuildInfo();
          return NextResponse.json({
            success: true,
            message: 'Build-Information aktualisiert',
            data: updatedBuildInfo
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Build-Update nur in Development-Modus verfügbar'
          }, { status: 403 });
        }

      case 'check':
        // Prüfen, ob neuer Build verfügbar ist
        const isNewBuildAvailable = BuildService.isNewBuildAvailable();
        const currentBuild = BuildService.getCurrentBuildInfo();
        return NextResponse.json({
          success: true,
          data: {
            currentBuild: currentBuild.buildNumber,
            latestBuild: BuildService.generateNewBuildNumber(),
            isNewBuildAvailable,
            message: isNewBuildAvailable 
              ? 'Neuer Build verfügbar' 
              : 'Build ist aktuell'
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Unbekannte Aktion. Verfügbare Aktionen: info, changelog, update, check'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Fehler in Build-Info API:', error);
    return NextResponse.json({
      success: false,
      error: 'Interner Server-Fehler',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Build-Information aktualisieren (nur in Development)
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({
        success: false,
        error: 'Build-Update nur in Development-Modus verfügbar'
      }, { status: 403 });
    }

    const updatedBuildInfo = BuildService.updateBuildInfo();
    
    return NextResponse.json({
      success: true,
      message: 'Build-Information erfolgreich aktualisiert',
      data: updatedBuildInfo
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Build-Info:', error);
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Aktualisieren der Build-Information',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}
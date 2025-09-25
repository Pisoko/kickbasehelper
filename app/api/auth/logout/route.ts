import { NextResponse } from 'next/server';
import { kickbaseAuth } from '../../../../lib/adapters/KickbaseAuthService';

export async function POST() {
  try {
    kickbaseAuth.clearAuth();
    
    return NextResponse.json({
      success: true,
      message: 'Erfolgreich abgemeldet'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { 
        error: 'Abmeldung fehlgeschlagen', 
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
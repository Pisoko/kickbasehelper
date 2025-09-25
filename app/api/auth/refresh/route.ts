import { NextResponse } from 'next/server';
import { kickbaseAuth } from '../../../../lib/adapters/KickbaseAuthService';

export async function POST() {
  try {
    const success = await kickbaseAuth.refreshToken();
    
    if (success) {
      const isTokenValid = kickbaseAuth.isTokenValid();
      let userInfo = null;
      let expiresAt = null;

      if (isTokenValid) {
        try {
          const tokenClaims = kickbaseAuth.getTokenClaims();
          userInfo = {
            leagues: kickbaseAuth.getLeagueIds()
          };
          expiresAt = tokenClaims?.exp ? new Date(tokenClaims.exp * 1000).toISOString() : null;
        } catch (error) {
          console.warn('Error getting token claims:', error);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Token erfolgreich erneuert',
        authStatus: {
          isAuthenticated: true,
          tokenValid: isTokenValid,
          expiresAt,
          userInfo
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Token-Erneuerung fehlgeschlagen' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { 
        error: 'Token-Erneuerung fehlgeschlagen', 
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
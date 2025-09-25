import { NextRequest, NextResponse } from 'next/server';
import { kickbaseAuth } from '../../../../lib/adapters/KickbaseAuthService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    console.log('Attempting authentication for:', email);
    const success = await kickbaseAuth.authenticate(email, password);

    if (success) {
      // Get updated auth status
      const isTokenValid = kickbaseAuth.isTokenValid();
      let userInfo = null;
      let expiresAt = null;

      console.log('Authentication successful, token valid:', isTokenValid);

      if (isTokenValid) {
        try {
          const tokenClaims = kickbaseAuth.getTokenClaims();
          userInfo = {
            email: email,
            leagues: kickbaseAuth.getLeagueIds()
          };
          expiresAt = tokenClaims?.exp ? new Date(tokenClaims.exp * 1000).toISOString() : null;
        } catch (error) {
          console.warn('Error getting token claims:', error);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Erfolgreich angemeldet',
        authStatus: {
          isAuthenticated: true,
          tokenValid: isTokenValid,
          expiresAt,
          userInfo
        }
      });
    } else {
      console.log('Authentication failed for:', email);
      return NextResponse.json(
        { 
          error: 'Ungültige Anmeldedaten',
          details: 'Invalid credentials or Kickbase API unavailable'
        },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        error: 'Anmeldung fehlgeschlagen', 
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
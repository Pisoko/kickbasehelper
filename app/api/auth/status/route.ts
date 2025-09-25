import { NextResponse } from 'next/server';
import { kickbaseAuth } from '../../../../lib/adapters/KickbaseAuthService';

export async function GET() {
  try {
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
      isAuthenticated: isTokenValid,
      tokenValid: isTokenValid,
      expiresAt,
      userInfo
    });

  } catch (error) {
    console.error('Auth status check error:', error);
    return NextResponse.json({
      isAuthenticated: false,
      tokenValid: false,
      expiresAt: null,
      userInfo: null,
      error: 'Failed to check authentication status'
    });
  }
}
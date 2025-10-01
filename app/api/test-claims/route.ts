import { NextRequest, NextResponse } from 'next/server';
import { kickbaseAuth } from '@/lib/adapters/KickbaseAuthService';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing Updated Token Claims');
    
    // Test the updated async methods
    const claims = await kickbaseAuth.getTokenClaims();
    const userId = await kickbaseAuth.getUserId();
    const leagueIds = await kickbaseAuth.getLeagueIds();
    
    return NextResponse.json({
      success: true,
      tokenInfo: {
        hasClaims: !!claims,
        userId: userId,
        leagueIds: leagueIds,
        claimsData: claims ? {
          name: claims['kb.name'],
          uid: claims['kb.uid'],
          role: claims['kb.r'],
          access: claims['kb.a'],
          projects: claims['kb.p'],
          country: claims['kb.cc'],
          iat: claims.iat,
          exp: claims.exp,
          iss: claims.iss,
          aud: claims.aud
        } : null
      }
    });
  } catch (error) {
    console.error('❌ Claims test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
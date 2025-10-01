import { NextRequest, NextResponse } from 'next/server';
import { kickbaseAuth } from '@/lib/adapters/KickbaseAuthService';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Testing Token Refresh System');
    
    // Clear current auth to force refresh
    kickbaseAuth.clearAuth();
    console.log('Auth cleared');
    
    // Test automatic authentication with stored credentials
    const email = process.env.KICKBASE_EMAIL;
    const password = process.env.KICKBASE_PASSWORD;
    
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'No stored credentials available',
        environment: {
          hasEmail: !!email,
          hasPassword: !!password
        }
      }, { status: 400 });
    }
    
    console.log('Attempting authentication with stored credentials');
    const authSuccess = await kickbaseAuth.authenticate(email, password);
    console.log('Authentication result:', authSuccess);
    
    if (authSuccess) {
      const token = await kickbaseAuth.getValidToken();
      const claims = await kickbaseAuth.getTokenClaims();
      const userId = kickbaseAuth.getUserId();
      
      return NextResponse.json({
        success: true,
        authentication: {
          authSuccess: true,
          hasNewToken: !!token,
          tokenLength: token?.length || 0,
          tokenStart: token?.substring(0, 20) || null,
          hasClaims: !!claims,
          userId: userId,
          tokenExpiry: claims?.exp ? new Date(claims.exp * 1000).toISOString() : null
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        authentication: {
          authSuccess: false,
          hasNewToken: false,
          tokenLength: 0,
          tokenStart: null,
          hasClaims: false,
          userId: null,
          tokenExpiry: null
        }
      }, { status: 401 });
    }
  } catch (error) {
    console.error('❌ Token refresh test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
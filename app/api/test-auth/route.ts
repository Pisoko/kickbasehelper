import { NextRequest, NextResponse } from 'next/server';
import { kickbaseAuth } from '@/lib/adapters/KickbaseAuthService';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 Testing Token Management System');
    
    // Test 1: Check if we have valid token
    const isValid = kickbaseAuth.isTokenValid();
    console.log('Token valid:', isValid);
    
    // Test 2: Get valid token (should auto-refresh if needed)
    const token = await kickbaseAuth.getValidToken();
    console.log('Token obtained:', !!token);
    console.log('Token length:', token?.length || 0);
    console.log('Token start:', token?.substring(0, 20) || 'none');
    
    // Test 3: Get auth headers
    const headers = await kickbaseAuth.getAuthHeaders();
    console.log('Auth headers:', Object.keys(headers));
    
    // Test 4: Get token claims if available
    const claims = await kickbaseAuth.getTokenClaims();
    console.log('Token claims:', claims ? 'available' : 'none');
    
    // Test 5: Check user ID
    const userId = kickbaseAuth.getUserId();
    console.log('User ID:', userId || 'none');
    
    return NextResponse.json({
      success: true,
      tokenManagement: {
        isTokenValid: isValid,
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenStart: token?.substring(0, 20) || null,
        hasAuthHeaders: Object.keys(headers).length > 0,
        hasClaims: !!claims,
        userId: userId,
        authHeaderKeys: Object.keys(headers),
        environment: {
          hasApiKey: !!process.env.KICKBASE_KEY,
          hasEmail: !!process.env.KICKBASE_EMAIL,
          hasPassword: !!process.env.KICKBASE_PASSWORD,
          nodeEnv: process.env.NODE_ENV
        }
      }
    });
  } catch (error) {
    console.error('❌ Token management test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tokenManagement: {
        isTokenValid: false,
        hasToken: false,
        tokenLength: 0,
        tokenStart: null,
        hasAuthHeaders: false,
        hasClaims: false,
        userId: null,
        authHeaderKeys: [],
        environment: {
          hasApiKey: !!process.env.KICKBASE_KEY,
          hasEmail: !!process.env.KICKBASE_EMAIL,
          hasPassword: !!process.env.KICKBASE_PASSWORD,
          nodeEnv: process.env.NODE_ENV
        }
      }
    }, { status: 500 });
  }
}
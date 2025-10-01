import { NextRequest, NextResponse } from 'next/server';
import { kickbaseAuth } from '@/lib/adapters/KickbaseAuthService';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugging Token Structure');
    
    // Get the raw token
    const token = await kickbaseAuth.getValidToken();
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'No token available'
      });
    }
    
    // Manual token decoding
    const parts = token.split('.');
    console.log('Token parts count:', parts.length);
    
    if (parts.length !== 3) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JWT format',
        partsCount: parts.length
      });
    }
    
    try {
      // Decode header
      const headerDecoded = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      console.log('Header:', headerDecoded);
      
      // Decode payload
      const payloadDecoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      console.log('Payload:', payloadDecoded);
      
      return NextResponse.json({
        success: true,
        tokenStructure: {
          partsCount: parts.length,
          header: headerDecoded,
          payload: payloadDecoded,
          hasUid: !!payloadDecoded.uid,
          hasKblid: !!payloadDecoded.kblid,
          hasExp: !!payloadDecoded.exp,
          hasIat: !!payloadDecoded.iat,
          tokenLength: token.length,
          tokenStart: token.substring(0, 50)
        }
      });
    } catch (decodeError) {
      console.error('Decode error:', decodeError);
      
      // Try with atob as fallback
      try {
        const payloadAtob = JSON.parse(atob(parts[1]));
        return NextResponse.json({
          success: true,
          method: 'atob',
          payload: payloadAtob
        });
      } catch (atobError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to decode with both Buffer and atob',
          decodeError: decodeError instanceof Error ? decodeError.message : 'Unknown decode error',
          atobError: atobError instanceof Error ? atobError.message : 'Unknown atob error'
        });
      }
    }
  } catch (error) {
    console.error('❌ Token debug failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { kickbaseAuth } from '@/lib/adapters/KickbaseAuthService';

export async function GET(request: NextRequest) {
  try {
    const token = await kickbaseAuth.getValidToken();
    
    return NextResponse.json({
      success: true,
      token: token
    });
  } catch (error) {
    console.error('❌ Failed to get token:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
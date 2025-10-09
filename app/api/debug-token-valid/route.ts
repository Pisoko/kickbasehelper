import { NextResponse } from 'next/server';
import { kickbaseAuth } from '../../../lib/adapters/KickbaseAuthService';

export async function GET() {
  try {
    const logs: string[] = [];
    
    // Override console.log temporarily to capture logs
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    
    logs.push('🔍 Starting token validation debug');
    
    const isValid = kickbaseAuth.isTokenValid();
    logs.push(`🔍 isTokenValid result: ${isValid}`);
    
    // Restore original console.log
    console.log = originalLog;
    
    return NextResponse.json({
      success: true,
      isTokenValid: isValid,
      timestamp: new Date().toISOString(),
      logs: logs
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
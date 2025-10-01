import { NextRequest, NextResponse } from 'next/server';
import { enhancedKickbaseClient } from '../../../lib/adapters/EnhancedKickbaseClient';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing leagues selection endpoint...');
    
    const leaguesData = await enhancedKickbaseClient.getLeagueSelection();
    
    return NextResponse.json({
      success: true,
      data: leaguesData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Leagues test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
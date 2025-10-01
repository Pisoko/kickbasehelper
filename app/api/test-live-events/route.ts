import { NextRequest, NextResponse } from 'next/server';
import { enhancedKickbaseClient } from '../../../lib/adapters/EnhancedKickbaseClient';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing live events endpoint...');
    
    const liveEventsData = await enhancedKickbaseClient.getLiveEventTypes();
    
    return NextResponse.json({
      success: true,
      data: liveEventsData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Live events test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
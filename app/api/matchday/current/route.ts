import { NextRequest, NextResponse } from 'next/server';
import { matchdayService } from '@/lib/services/MatchdayService';

export async function GET(request: NextRequest) {
  try {
    // Get current matchday state
    const state = await matchdayService.getCurrentMatchdayState();
    
    return NextResponse.json({
      currentMatchday: state.currentMatchday,
      lastChecked: state.lastChecked,
      lastUpdate: state.lastUpdate,
      totalMatchdays: state.totalMatchdays
    });
  } catch (error) {
    console.error('Error fetching current matchday:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch current matchday',
        currentMatchday: 5 // Fallback
      },
      { status: 500 }
    );
  }
}
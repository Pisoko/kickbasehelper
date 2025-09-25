import { NextRequest, NextResponse } from 'next/server';
import { enhancedKickbaseClient } from '../../../lib/adapters/EnhancedKickbaseClient';
import { kickbaseAuth } from '../../../lib/adapters/KickbaseAuthService';

interface MarketValueData {
  playerId: string;
  playerName: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

// In-memory cache for market value history
const marketValueHistory = new Map<string, { value: number; timestamp: number }[]>();

function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const threshold = 0.01; // 1% threshold for stability
  const changePercent = Math.abs((current - previous) / previous);
  
  if (changePercent < threshold) return 'stable';
  return current > previous ? 'up' : 'down';
}

function updateMarketValueHistory(playerId: string, value: number) {
  const history = marketValueHistory.get(playerId) || [];
  const now = Date.now();
  
  // Add new value
  history.push({ value, timestamp: now });
  
  // Keep only last 24 hours of data (assuming updates every 5 minutes = 288 entries max)
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const filteredHistory = history.filter(entry => entry.timestamp > oneDayAgo);
  
  marketValueHistory.set(playerId, filteredHistory);
  
  return filteredHistory;
}

function getPreviousValue(playerId: string): number | null {
  const history = marketValueHistory.get(playerId) || [];
  if (history.length < 2) return null;
  
  // Get the second-to-last value
  return history[history.length - 2].value;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerIds = [] } = body;

    // Check authentication
    if (!kickbaseAuth.isTokenValid()) {
      try {
        await kickbaseAuth.refreshToken();
      } catch (authError) {
        console.error('Authentication failed:', authError);
        return NextResponse.json(
          { error: 'Authentication failed', details: authError },
          { status: 401 }
        );
      }
    }

    const marketValues: MarketValueData[] = [];
    const now = new Date().toISOString();

    // If no specific player IDs provided, use a default set
    let targetPlayerIds: string[] = playerIds;
    if (targetPlayerIds.length === 0) {
      // Use some default player IDs for demonstration
      targetPlayerIds = [
        'player_1', 'player_2', 'player_3', 'player_4', 'player_5'
      ];
    }

    // Process players in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < targetPlayerIds.length; i += batchSize) {
      const batch = targetPlayerIds.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (playerId: string) => {
        try {
          const playerDetails = await enhancedKickbaseClient.getPlayerDetails(playerId);
          const marketValue = await enhancedKickbaseClient.getPlayerMarketValue(playerId);
          
          if (playerDetails && marketValue) {
            const currentValue = marketValue.marketValue || playerDetails.marketValue || 0;
            
            // Update history and get previous value
            updateMarketValueHistory(playerId, currentValue);
            const previousValue = getPreviousValue(playerId) || currentValue;
            
            const change = currentValue - previousValue;
            const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;
            const trend = calculateTrend(currentValue, previousValue);
            
            marketValues.push({
              playerId,
              playerName: playerDetails.name,
              currentValue,
              previousValue,
              change,
              changePercent,
              trend,
              lastUpdated: now,
            });
          }
        } catch (error) {
          console.error(`Error processing player ${playerId}:`, error);
          // Continue with other players even if one fails
        }
      }));
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < targetPlayerIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      marketValues,
      timestamp: now,
      totalPlayers: marketValues.length,
    });

  } catch (error) {
    console.error('Market values API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch market values', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Market Values API',
    description: 'Use POST method to fetch market value data',
    endpoints: {
      'POST /api/market-values': {
        description: 'Fetch real-time market values for players',
        body: {
          playerIds: 'string[] (optional) - Array of player IDs. If empty, fetches top 20 players'
        },
        response: {
          success: 'boolean',
          marketValues: 'MarketValueData[]',
          timestamp: 'string',
          totalPlayers: 'number'
        }
      }
    },
    example: {
      playerIds: ['player1', 'player2']
    }
  });
}
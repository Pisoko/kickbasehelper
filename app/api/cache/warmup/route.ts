import { NextRequest, NextResponse } from 'next/server';
import { startupCacheService } from '@/lib/services/StartupCacheService';
import pino from 'pino';

const logger = pino({ 
  name: 'CacheWarmupAPI',
  level: 'warn' // Minimized log level
});

/**
 * GET /api/cache/warmup - Get warmup progress
 */
export async function GET() {
  try {
    const progress = startupCacheService.getWarmupProgress();
    const recommendation = await startupCacheService.isWarmupRecommended();
    
    return NextResponse.json({
      success: true,
      progress,
      recommendation
    });
  } catch (error) {
    logger.error('Failed to get warmup progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get warmup progress' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache/warmup - Start cache warmup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    const config = {
      includeAllPlayers: body.includeAllPlayers ?? true,
      includePlayerDetails: body.includePlayerDetails ?? true,
      includeTeamLogos: body.includeTeamLogos ?? true,
      currentSpieltag: body.currentSpieltag
    };

    logger.warn('Starting cache warmup with config:', config);
    
    const result = await startupCacheService.startWarmup(config);
    
    logger.warn('Cache warmup completed:', {
      success: result.success,
      duration: result.duration,
      totalCached: Object.values(result.results).reduce((sum, count) => sum + count, 0),
      errors: result.errors.length
    });
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Cache warmup failed:', error);
    return NextResponse.json(
      { success: false, error: 'Cache warmup failed' },
      { status: 500 }
    );
  }
}
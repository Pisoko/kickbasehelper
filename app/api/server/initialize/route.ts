import { NextRequest, NextResponse } from 'next/server';
import { startupCacheService } from '@/lib/services/StartupCacheService';

/**
 * Server initialization endpoint for deployments
 * Validates token and optionally warms up caches
 * 
 * Usage:
 * - GET /api/server/initialize - Basic token validation
 * - GET /api/server/initialize?warmup=true - Token validation + cache warmup
 * - GET /api/server/initialize?warmup=true&comprehensive=true - Full initialization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warmupCache = searchParams.get('warmup') === 'true';
    const comprehensive = searchParams.get('comprehensive') === 'true';
    const currentSpieltag = searchParams.get('spieltag') ? parseInt(searchParams.get('spieltag')!) : undefined;

    console.log('🚀 Server initialization requested');
    console.log('- Warmup cache:', warmupCache);
    console.log('- Comprehensive:', comprehensive);
    console.log('- Current Spieltag:', currentSpieltag);

    const initOptions = {
      validateToken: true, // Always validate token
      warmupCache,
      warmupConfig: comprehensive ? {
        includeAllPlayers: true,
        includePlayerDetails: true,
        includeTeamLogos: true,
        includeComprehensivePlayerData: true,
        currentSpieltag
      } : {
        includeAllPlayers: true,
        includeTeamLogos: true,
        currentSpieltag
      }
    };

    const results = await startupCacheService.initializeServer(initOptions);

    if (results.success) {
      console.log('✅ Server initialization completed successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Server initialized successfully',
        results: {
          tokenValidation: results.tokenValidation,
          cacheWarmup: results.cacheWarmup,
          errors: results.errors
        },
        recommendations: {
          tokenValid: results.tokenValidation?.tokenValid || false,
          tokenRenewed: results.tokenValidation?.tokenRenewed || false,
          expiresAt: results.tokenValidation?.expiresAt,
          cacheWarmed: !!results.cacheWarmup
        }
      });
    } else {
      console.error('❌ Server initialization failed');
      
      return NextResponse.json({
        success: false,
        message: 'Server initialization failed',
        results: {
          tokenValidation: results.tokenValidation,
          cacheWarmup: results.cacheWarmup,
          errors: results.errors
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Server initialization error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Server initialization error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST endpoint for forced server reinitialization
 * Useful for manual deployment triggers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    console.log('🔄 Forced server reinitialization requested');
    
    const initOptions = {
      validateToken: true,
      warmupCache: body.warmupCache !== false,
      warmupConfig: {
        includeAllPlayers: body.includeAllPlayers !== false,
        includePlayerDetails: body.includePlayerDetails === true,
        includeTeamLogos: body.includeTeamLogos !== false,
        includeComprehensivePlayerData: body.includeComprehensivePlayerData === true,
        currentSpieltag: body.currentSpieltag
      }
    };

    const results = await startupCacheService.initializeServer(initOptions);

    return NextResponse.json({
      success: results.success,
      message: results.success ? 'Server reinitialized successfully' : 'Server reinitialization failed',
      results: {
        tokenValidation: results.tokenValidation,
        cacheWarmup: results.cacheWarmup,
        errors: results.errors
      },
      timestamp: new Date().toISOString()
    }, { status: results.success ? 200 : 500 });
  } catch (error) {
    console.error('❌ Server reinitialization error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Server reinitialization error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
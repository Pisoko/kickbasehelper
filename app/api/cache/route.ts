import { NextRequest, NextResponse } from 'next/server';
import { kickbaseDataCache } from '@/lib/services/KickbaseDataCacheService';
import { imageCacheService } from '@/lib/services/ImageCacheService';
import { teamLogoCache } from '@/lib/services/TeamLogoCacheService';
import { cacheWarmupService } from '@/lib/services/CacheWarmupService';

/**
 * GET /api/cache - Get cache status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        return await getCacheStatus();
      
      case 'health':
        return await getCacheHealth();
      
      case 'stats':
        return await getCacheStats();
      
      case 'recommendations':
        return await getWarmupRecommendations();
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: status, health, stats, recommendations' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cache API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache - Perform cache operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'warmup':
        return await performWarmup(params);
      
      case 'clear':
        return await clearCache(params);
      
      case 'cleanup':
        return await cleanupCache();
      
      case 'preload':
        return await preloadAssets(params);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: warmup, clear, cleanup, preload' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cache API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cache - Clear specific cache entries
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const key = searchParams.get('key');

    if (!type) {
      return NextResponse.json(
        { error: 'Cache type is required' },
        { status: 400 }
      );
    }

    let result = false;

    switch (type) {
      case 'data':
        if (key) {
          await kickbaseDataCache.delete(key);
          result = true;
        }
        break;
      
      case 'image':
        if (key) {
          await imageCacheService.delete(key);
          result = true;
        }
        break;
      
      case 'logo':
        if (key) {
          await teamLogoCache.delete(key);
          result = true;
        }
        break;
      
      case 'all':
        await kickbaseDataCache.clear();
        await imageCacheService.clear();
        await teamLogoCache.clear();
        result = true;
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid cache type. Use: data, image, logo, all' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result,
      message: result ? 'Cache cleared successfully' : 'Failed to clear cache'
    });

  } catch (error) {
    console.error('Cache delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions

async function getCacheStatus() {
  const dataStats = kickbaseDataCache.getStats();
  const imageStats = imageCacheService.getStats();
  const logoStats = await teamLogoCache.getLogoStats();

  return NextResponse.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    caches: {
      data: {
        entries: dataStats.totalEntries,
        memorySize: dataStats.memorySize,
        diskSize: dataStats.diskSize
      },
      images: {
        entries: imageStats.totalEntries,
        memorySize: imageStats.memorySize,
        diskSize: imageStats.diskSize
      },
      logos: {
        entries: logoStats.totalLogos,
        totalSize: logoStats.totalSize,
        formats: logoStats.formats
      }
    }
  });
}

async function getCacheHealth() {
  const dataHealth = await kickbaseDataCache.getCacheHealth();
  const imageStats = imageCacheService.getStats();
  const logoStats = await teamLogoCache.getLogoStats();

  // Overall health assessment
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const issues: string[] = [];

  if (dataHealth.status !== 'healthy') {
    overallStatus = dataHealth.status;
    issues.push(...dataHealth.issues);
  }

  if (imageStats.totalEntries === 0) {
    issues.push('No cached images');
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  }

  if (logoStats.totalLogos < 10) {
    issues.push('Few team logos cached');
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  }

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    issues,
    details: {
      data: dataHealth,
      images: { status: imageStats.totalEntries > 0 ? 'healthy' : 'empty' },
      logos: { status: logoStats.totalLogos > 10 ? 'healthy' : 'incomplete' }
    }
  });
}

async function getCacheStats() {
  const dataStats = kickbaseDataCache.getStats();
  const imageStats = imageCacheService.getImageCacheStats();
  const logoStats = await teamLogoCache.getLogoStats();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    data: dataStats,
    images: imageStats,
    logos: logoStats,
    summary: {
      totalEntries: dataStats.totalEntries + imageStats.totalImages + logoStats.totalLogos,
      totalSizeMB: (imageStats.totalSizeMB + (logoStats.totalSize / 1024 / 1024)),
      cacheTypes: 3
    }
  });
}

async function getWarmupRecommendations() {
  const recommendations = await cacheWarmupService.getWarmupRecommendations();
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    ...recommendations
  });
}

async function performWarmup(params: any) {
  const config = {
    includePlayerImages: params.includePlayerImages ?? true,
    includeTeamLogos: params.includeTeamLogos ?? true,
    includeKickbaseData: params.includeKickbaseData ?? true,
    spieltag: params.spieltag ?? 5,
    playerIds: params.playerIds,
    teamIds: params.teamIds
  };

  const result = await cacheWarmupService.warmupCache(config);
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    ...result
  });
}

async function clearCache(params: any) {
  const { type = 'all', spieltag } = params;
  let cleared = 0;

  try {
    switch (type) {
      case 'data':
        if (spieltag) {
          await kickbaseDataCache.invalidateSpieltagCache(spieltag);
        } else {
          await kickbaseDataCache.clear();
        }
        cleared++;
        break;
      
      case 'images':
        await imageCacheService.clear();
        cleared++;
        break;
      
      case 'logos':
        await teamLogoCache.clear();
        cleared++;
        break;
      
      case 'all':
        await kickbaseDataCache.clear();
        await imageCacheService.clear();
        await teamLogoCache.clear();
        cleared = 3;
        break;
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${cleared} cache(s)`,
      type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear cache', details: error },
      { status: 500 }
    );
  }
}

async function cleanupCache() {
  try {
    await imageCacheService.cleanupExpiredImages();
    await teamLogoCache.cleanupOrphanedFiles();
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleanup completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Cache cleanup failed', details: error },
      { status: 500 }
    );
  }
}

async function preloadAssets(params: any) {
  const { type = 'all' } = params;
  
  try {
    switch (type) {
      case 'logos':
        await teamLogoCache.preloadBundesligaLogos();
        break;
      
      case 'current':
        await cacheWarmupService.warmupCurrentMatchday();
        break;
      
      case 'next':
        await cacheWarmupService.warmupNextMatchday();
        break;
      
      case 'all':
        await cacheWarmupService.scheduledWarmup();
        break;
    }

    return NextResponse.json({
      success: true,
      message: `Preloaded ${type} assets`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Asset preload failed', details: error },
      { status: 500 }
    );
  }
}
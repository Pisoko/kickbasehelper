import pino from 'pino';
import { kickbaseDataCache } from './KickbaseDataCacheService';
import { imageCacheService } from './ImageCacheService';
import { teamLogoCache } from './TeamLogoCacheService';

const logger = pino({ name: 'CacheWarmupService' });

export interface WarmupConfig {
  includePlayerImages: boolean;
  includeTeamLogos: boolean;
  includeKickbaseData: boolean;
  spieltag?: number;
  playerIds?: string[];
  teamIds?: string[];
}

export interface WarmupResult {
  success: boolean;
  duration: number;
  results: {
    playerImages: { success: number; failed: number };
    teamLogos: { success: number; failed: number };
    kickbaseData: { success: number; failed: number };
  };
  errors: string[];
}

export class CacheWarmupService {
  /**
   * Perform comprehensive cache warmup
   */
  async warmupCache(config: WarmupConfig): Promise<WarmupResult> {
    const startTime = Date.now();
    logger.info('Starting comprehensive cache warmup', config);

    const result: WarmupResult = {
      success: true,
      duration: 0,
      results: {
        playerImages: { success: 0, failed: 0 },
        teamLogos: { success: 0, failed: 0 },
        kickbaseData: { success: 0, failed: 0 }
      },
      errors: []
    };

    try {
      // Initialize cache services
      await this.initializeCacheServices();

      // Warm up team logos
      if (config.includeTeamLogos) {
        logger.info('Warming up team logos...');
        const logoResult = await this.warmupTeamLogos(config.teamIds);
        result.results.teamLogos = logoResult;
      }

      // Warm up Kickbase data
      if (config.includeKickbaseData && config.spieltag) {
        logger.info(`Warming up Kickbase data for Spieltag ${config.spieltag}...`);
        const dataResult = await this.warmupKickbaseData(config.spieltag);
        result.results.kickbaseData = dataResult;
      }

      // Warm up player images
      if (config.includePlayerImages) {
        logger.info('Warming up player images...');
        const imageResult = await this.warmupPlayerImages(config.playerIds);
        result.results.playerImages = imageResult;
      }

      result.duration = Date.now() - startTime;
      
      const totalSuccess = result.results.playerImages.success + 
                          result.results.teamLogos.success + 
                          result.results.kickbaseData.success;
      const totalFailed = result.results.playerImages.failed + 
                         result.results.teamLogos.failed + 
                         result.results.kickbaseData.failed;

      logger.info(`Cache warmup completed in ${result.duration}ms: ${totalSuccess} success, ${totalFailed} failed`);

    } catch (error) {
      result.success = false;
      result.errors.push(`Warmup failed: ${error}`);
      logger.error('Cache warmup failed:', error);
    }

    return result;
  }

  /**
   * Initialize all cache services
   */
  private async initializeCacheServices(): Promise<void> {
    try {
      await teamLogoCache.initialize();
      logger.debug('Cache services initialized');
    } catch (error) {
      logger.error('Failed to initialize cache services:', error);
      throw error;
    }
  }

  /**
   * Warm up team logos
   */
  private async warmupTeamLogos(teamIds?: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      if (teamIds && teamIds.length > 0) {
        // Warm up specific teams
        for (const teamId of teamIds) {
          try {
            // This would need actual team data - for now we'll simulate
            const result = await teamLogoCache.cacheTeamLogo(
              teamId,
              `Team ${teamId}`,
              `https://example.com/logos/${teamId}.png`
            );
            if (result) success++;
            else failed++;
          } catch (error) {
            failed++;
            logger.warn(`Failed to warm up logo for team ${teamId}:`, error);
          }
        }
      } else {
        // Warm up all Bundesliga teams
        await teamLogoCache.preloadBundesligaLogos();
        success = 18; // Approximate number of Bundesliga teams
      }
    } catch (error) {
      logger.error('Team logo warmup failed:', error);
      failed++;
    }

    return { success, failed };
  }

  /**
   * Warm up Kickbase data
   */
  private async warmupKickbaseData(spieltag: number): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      // Warm up data cache
      await kickbaseDataCache.warmupCache(spieltag);
      success = 1; // Simplified - in reality this would return actual counts

      // TODO: Integrate with actual Kickbase API to fetch and cache:
      // - Player data for the spieltag
      // - Match data for the spieltag
      // - Team data
      // - League configurations

    } catch (error) {
      logger.error('Kickbase data warmup failed:', error);
      failed = 1;
    }

    return { success, failed };
  }

  /**
   * Warm up player images
   */
  private async warmupPlayerImages(playerIds?: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      if (playerIds && playerIds.length > 0) {
        // Warm up specific player images
        for (const playerId of playerIds) {
          try {
            const imageUrl = `https://kickbase.b-cdn.net/pool/playeravatar/${playerId}.jpg`;
            const result = await imageCacheService.cachePlayerImage(playerId, imageUrl);
            if (result) success++;
            else failed++;
            
            // Small delay to avoid overwhelming the CDN
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (error) {
            failed++;
            logger.warn(`Failed to warm up image for player ${playerId}:`, error);
          }
        }
      } else {
        // TODO: Get popular/active player IDs from current spieltag
        logger.info('No specific player IDs provided for image warmup');
      }
    } catch (error) {
      logger.error('Player image warmup failed:', error);
      failed++;
    }

    return { success, failed };
  }

  /**
   * Warm up cache for current matchday
   */
  async warmupCurrentMatchday(): Promise<WarmupResult> {
    // Get current spieltag from season config (from workspace rules)
    const currentSpieltag = 5; // From workspace rules: current_matchday: 5

    return await this.warmupCache({
      includePlayerImages: true,
      includeTeamLogos: true,
      includeKickbaseData: true,
      spieltag: currentSpieltag
    });
  }

  /**
   * Warm up cache for next matchday
   */
  async warmupNextMatchday(): Promise<WarmupResult> {
    // Next spieltag (current + 1)
    const nextSpieltag = 6; // current_matchday + 1

    return await this.warmupCache({
      includePlayerImages: true,
      includeTeamLogos: true,
      includeKickbaseData: true,
      spieltag: nextSpieltag
    });
  }

  /**
   * Scheduled warmup (can be called by cron job)
   */
  async scheduledWarmup(): Promise<void> {
    logger.info('Starting scheduled cache warmup');

    try {
      // Warm up current and next matchday
      const currentResult = await this.warmupCurrentMatchday();
      const nextResult = await this.warmupNextMatchday();

      logger.info('Scheduled warmup completed', {
        current: currentResult.results,
        next: nextResult.results
      });

    } catch (error) {
      logger.error('Scheduled warmup failed:', error);
    }
  }

  /**
   * Get warmup recommendations based on current cache state
   */
  async getWarmupRecommendations(): Promise<{
    recommended: boolean;
    reasons: string[];
    config: WarmupConfig;
  }> {
    const recommendations = {
      recommended: false,
      reasons: [] as string[],
      config: {
        includePlayerImages: false,
        includeTeamLogos: false,
        includeKickbaseData: false,
        spieltag: 5
      } as WarmupConfig
    };

    try {
      // Check cache health
      const dataHealth = await kickbaseDataCache.getCacheHealth();
      const imageStats = imageCacheService.getStats();
      const logoStats = await teamLogoCache.getLogoStats();

      // Analyze and make recommendations
      if (dataHealth.status !== 'healthy') {
        recommendations.recommended = true;
        recommendations.reasons.push('Kickbase data cache is not healthy');
        recommendations.config.includeKickbaseData = true;
      }

      if (imageStats.totalEntries < 50) {
        recommendations.recommended = true;
        recommendations.reasons.push('Player image cache has few entries');
        recommendations.config.includePlayerImages = true;
      }

      if (logoStats.totalLogos < 18) {
        recommendations.recommended = true;
        recommendations.reasons.push('Team logo cache incomplete');
        recommendations.config.includeTeamLogos = true;
      }

      // Always recommend current spieltag
      recommendations.config.spieltag = 5;

    } catch (error) {
      logger.error('Failed to generate warmup recommendations:', error);
      recommendations.recommended = true;
      recommendations.reasons.push('Unable to assess cache state');
    }

    return recommendations;
  }
}

// Singleton instance
export const cacheWarmupService = new CacheWarmupService();
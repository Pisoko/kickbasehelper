import { startupCacheService } from '@/lib/services/StartupCacheService';
import pino from 'pino';

const logger = pino({ 
  name: 'StartupCacheWarmup',
  level: 'warn' // Minimized log level
});

let warmupStarted = false;

/**
 * Initialize cache warmup on server startup
 * This runs automatically when the module is imported
 */
export async function initializeCacheWarmup() {
  if (warmupStarted) {
    return;
  }
  
  warmupStarted = true;
  
  try {
    // Check if warmup is recommended
    const recommendation = await startupCacheService.isWarmupRecommended();
    
    if (recommendation.recommended) {
      logger.warn('Starting automatic cache warmup on server startup');
      logger.warn('Warmup reasons:', recommendation.reasons);
      
      // Start warmup in background (non-blocking)
      startupCacheService.startWarmup({
        includeAllPlayers: true,
        includePlayerDetails: true,
        includeTeamLogos: true
      }).then(result => {
        if (result.success) {
          logger.warn('Startup cache warmup completed successfully', {
            duration: result.duration,
            totalCached: Object.values(result.results).reduce((sum, count) => sum + count, 0)
          });
        } else {
          logger.error('Startup cache warmup failed', {
            errors: result.errors
          });
        }
      }).catch(error => {
        logger.error('Startup cache warmup error:', error);
      });
    } else {
      logger.warn('Cache warmup not needed - cache is already populated');
    }
  } catch (error) {
    logger.error('Failed to initialize cache warmup:', error);
  }
}

// Auto-initialize when in production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_STARTUP_WARMUP === 'true') {
  // Delay initialization to allow other services to start
  setTimeout(() => {
    initializeCacheWarmup();
  }, 5000); // 5 second delay
}
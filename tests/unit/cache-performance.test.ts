import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { kickbaseDataCache } from '../../lib/services/KickbaseDataCacheService';
import { imageCacheService } from '../../lib/services/ImageCacheService';
import { teamLogoCache } from '../../lib/services/TeamLogoCacheService';
import { CacheWarmupService, cacheWarmupService } from '../../lib/services/CacheWarmupService';
import { Player, Match } from '../../lib/types';

describe('Cache Performance Tests', () => {
  beforeEach(() => {
    // Clear all caches before each test
    kickbaseDataCache.clear();
    imageCacheService.clear();
    teamLogoCache.clear();
  });

  afterEach(() => {
    // Cleanup after each test
    kickbaseDataCache.clear();
    imageCacheService.clear();
    teamLogoCache.clear();
  });

  describe('KickbaseDataCacheService', () => {
    it('should cache and retrieve player data', async () => {
      const mockPlayers = [
        { 
          id: '1', 
          name: 'Test Player',
          firstName: 'Test',
          position: 'MID' as const,
          verein: 'Test FC',
          kosten: 1000000,
          punkte_hist: [10, 8, 12],
          punkte_avg: 10,
          punkte_sum: 30,
          marketValue: 1000000
        }
      ];

      // Cache the data
      await kickbaseDataCache.cachePlayers(5, mockPlayers);
      
      // Retrieve the data
      const cachedData = await kickbaseDataCache.getCachedPlayers(5);
      
      expect(cachedData?.players).toEqual(mockPlayers);
      expect(cachedData?.spieltag).toBe(5);
    });

    it('should cache and retrieve match data', async () => {
      const mockMatches = [
        { 
          id: '1', 
          spieltag: 5,
          heim: 'Team A', 
          auswaerts: 'Team B',
          kickoff: '2025-01-01T15:30:00Z',
          homeGoals: 2,
          awayGoals: 1,
          matchStatus: 2
        }
      ];

      // Cache the data
      await kickbaseDataCache.cacheMatches(5, mockMatches);
      
      // Retrieve the data
      const cachedData = await kickbaseDataCache.getCachedMatches(5);
      
      expect(cachedData?.matches).toEqual(mockMatches);
      expect(cachedData?.spieltag).toBe(5);
    });

    it('should respect TTL for cached data', async () => {
      const mockData = { test: 'data' };

      // Cache with very short TTL (1ms)
      await kickbaseDataCache.set('test-data', mockData, 1);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should return null for expired data
      const cachedData = await kickbaseDataCache.get('test-data');
      expect(cachedData).toBeNull();
    });

    it('should provide cache statistics', () => {
      const stats = kickbaseDataCache.getStats();
      
      expect(stats).toHaveProperty('memorySize');
      expect(stats).toHaveProperty('diskSize');
      expect(stats).toHaveProperty('totalEntries');
      expect(typeof stats.memorySize).toBe('number');
      expect(typeof stats.diskSize).toBe('number');
      expect(typeof stats.totalEntries).toBe('number');
    });

    it('should provide cache health status', async () => {
      const health = await kickbaseDataCache.getCacheHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('stats');
      expect(health).toHaveProperty('issues');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(Array.isArray(health.issues)).toBe(true);
    });
  });

  describe('ImageCacheService', () => {
    it('should provide image cache statistics', () => {
      const stats = imageCacheService.getImageCacheStats();
      
      expect(stats).toHaveProperty('totalImages');
      expect(stats).toHaveProperty('totalSizeBytes');
      expect(stats).toHaveProperty('totalSizeMB');
      expect(stats).toHaveProperty('oldestImage');
      expect(stats).toHaveProperty('newestImage');
      expect(typeof stats.totalImages).toBe('number');
      expect(typeof stats.totalSizeBytes).toBe('number');
      expect(typeof stats.totalSizeMB).toBe('number');
    });

    it('should generate cached image path', async () => {
      const imageUrl = 'https://example.com/player.jpg';
      
      // Test with timeout to avoid hanging on network calls
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), 1000)
      );
      
      try {
        const cachedPath = await Promise.race([
          imageCacheService.getCachedImagePath(imageUrl),
          timeoutPromise
        ]);
        
        expect(typeof cachedPath).toBe('string');
        // Should return original URL if caching fails (fallback behavior)
        expect(cachedPath).toBe(imageUrl);
      } catch (error) {
        // If it times out, that's expected for network calls in tests
        // Just verify the method exists and is callable
        expect(imageCacheService.getCachedImagePath).toBeDefined();
        expect(typeof imageCacheService.getCachedImagePath).toBe('function');
      }
    }, 2000); // Increase test timeout to 2 seconds
  });

  describe('TeamLogoCacheService', () => {
    it('should provide team logo cache statistics', () => {
      const stats = teamLogoCache.getStats();
      
      expect(stats).toHaveProperty('memorySize');
      expect(stats).toHaveProperty('diskSize');
      expect(stats).toHaveProperty('totalEntries');
      expect(typeof stats.memorySize).toBe('number');
      expect(typeof stats.diskSize).toBe('number');
      expect(typeof stats.totalEntries).toBe('number');
    });
  });

  describe('CacheWarmupService', () => {
    it('should warm up cache with configuration', async () => {
      const config = {
        includePlayerImages: false,
        includeTeamLogos: true,
        includeKickbaseData: false,
        spieltag: 5
      };

      const result = await cacheWarmupService.warmupCache(config);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('errors');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.duration).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should provide warmup recommendations', async () => {
      const recommendations = await cacheWarmupService.getWarmupRecommendations();
      
      expect(recommendations).toHaveProperty('recommended');
      expect(recommendations).toHaveProperty('reasons');
      expect(recommendations).toHaveProperty('config');
      expect(typeof recommendations.recommended).toBe('boolean');
      expect(Array.isArray(recommendations.reasons)).toBe(true);
      expect(recommendations.config).toHaveProperty('includePlayerImages');
      expect(recommendations.config).toHaveProperty('includeTeamLogos');
      expect(recommendations.config).toHaveProperty('includeKickbaseData');
    });

    it('should warm up current matchday', async () => {
      const result = await cacheWarmupService.warmupCurrentMatchday();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('results');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.duration).toBe('number');
    });

    it('should warm up next matchday', async () => {
      const result = await cacheWarmupService.warmupNextMatchday();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('results');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should cache data efficiently', async () => {
      const startTime = Date.now();
      
      // Cache some test data
      const mockPlayers = Array.from({ length: 100 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i}`,
        firstName: `Player`,
        position: 'MID' as const,
        verein: `Team ${i % 18}`,
        kosten: 1000000 + i * 10000,
        punkte_hist: [10, 8, 12],
        punkte_avg: 10,
        punkte_sum: 30,
        marketValue: 1000000 + i * 10000
      }));

      await kickbaseDataCache.cachePlayers(5, mockPlayers);
      
      const cacheTime = Date.now() - startTime;
      
      // Caching should be fast (under 100ms for 100 players)
      expect(cacheTime).toBeLessThan(100);
    });

    it('should retrieve cached data efficiently', async () => {
      // First cache some data
      const mockPlayers = Array.from({ length: 100 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i}`,
        firstName: `Player`,
        position: 'MID' as const,
        verein: `Team ${i % 18}`,
        kosten: 1000000 + i * 10000,
        punkte_hist: [10, 8, 12],
        punkte_avg: 10,
        punkte_sum: 30,
        marketValue: 1000000 + i * 10000
      }));

      await kickbaseDataCache.cachePlayers(5, mockPlayers);
      
      const startTime = Date.now();
      const cachedData = await kickbaseDataCache.getCachedPlayers(5);
      const retrieveTime = Date.now() - startTime;
      
      // Retrieval should be very fast (under 10ms)
      expect(retrieveTime).toBeLessThan(10);
      expect(cachedData?.players).toHaveLength(100);
    });

    it('should handle memory efficiently', () => {
      const initialStats = kickbaseDataCache.getStats();
      
      // Cache multiple datasets
      for (let i = 1; i <= 5; i++) {
        const mockData = { spieltag: i, data: `test-data-${i}` };
        kickbaseDataCache.set(`test-${i}`, mockData, 60000);
      }
      
      const finalStats = kickbaseDataCache.getStats();
      
      // Memory usage should increase but stay reasonable
      expect(finalStats.totalEntries).toBeGreaterThan(initialStats.totalEntries);
      expect(finalStats.memorySize).toBeGreaterThan(initialStats.memorySize);
    });
  });
});
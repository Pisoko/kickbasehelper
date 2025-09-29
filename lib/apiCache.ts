/**
 * Enhanced API caching utility with different strategies for different data types
 * Implements stale-while-revalidate pattern for optimal performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  staleAt: number;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  staleTime: number; // Time after which data is considered stale but still usable
  maxSize?: number; // Maximum number of entries
}

const DEFAULT_CONFIGS: Record<string, CacheConfig> = {
  // Player data changes infrequently, can be cached longer
  players: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    maxSize: 50,
  },
  // Match data changes more frequently
  matches: {
    ttl: 2 * 60 * 60 * 1000, // 2 hours
    staleTime: 30 * 60 * 1000, // 30 minutes
    maxSize: 100,
  },
  // Live data changes very frequently
  live: {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
    maxSize: 20,
  },
  // Market values change moderately
  marketValues: {
    ttl: 60 * 60 * 1000, // 1 hour
    staleTime: 15 * 60 * 1000, // 15 minutes
    maxSize: 30,
  },
  // Player performance data
  performance: {
    ttl: 12 * 60 * 60 * 1000, // 12 hours
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
    maxSize: 100,
  },
};

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private configs: Record<string, CacheConfig>;

  constructor(configs: Record<string, CacheConfig> = DEFAULT_CONFIGS) {
    this.configs = configs;
  }

  /**
   * Get data from cache with stale-while-revalidate logic
   */
  get<T>(key: string, category: string = 'default'): {
    data: T | null;
    isStale: boolean;
    isExpired: boolean;
  } {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      return { data: null, isStale: false, isExpired: true };
    }

    const isExpired = now > entry.expiresAt;
    const isStale = now > entry.staleAt;

    if (isExpired) {
      this.cache.delete(key);
      return { data: null, isStale: false, isExpired: true };
    }

    return { data: entry.data, isStale, isExpired: false };
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, category: string = 'default'): void {
    const config = this.configs[category] || this.configs.default || {
      ttl: 60 * 60 * 1000,
      staleTime: 30 * 60 * 1000,
    };

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + config.ttl,
      staleAt: now + config.staleTime,
    };

    this.cache.set(key, entry);

    // Enforce max size if configured
    if (config.maxSize && this.cache.size > config.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries for a specific category
   */
  clearCategory(category: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${category}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    categories: Record<string, number>;
    oldestEntry?: number;
    newestEntry?: number;
  } {
    const categories: Record<string, number> = {};
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    for (const [key, entry] of this.cache.entries()) {
      const category = key.split(':')[0] || 'unknown';
      categories[category] = (categories[category] || 0) + 1;
      
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      categories,
      oldestEntry: this.cache.size > 0 ? oldestTimestamp : undefined,
      newestEntry: this.cache.size > 0 ? newestTimestamp : undefined,
    };
  }
}

// Global cache instance
export const apiCache = new APICache();

/**
 * Create cache key for API requests
 */
export function createCacheKey(category: string, identifier: string): string {
  return `${category}:${identifier}`;
}

/**
 * Cached fetch function with stale-while-revalidate
 */
export async function cachedFetch<T>(
  url: string,
  category: string,
  options?: RequestInit
): Promise<T> {
  const cacheKey = createCacheKey(category, url + JSON.stringify(options || {}));
  const cached = apiCache.get<T>(cacheKey, category);

  // If we have fresh data, return it
  if (cached.data && !cached.isStale) {
    return cached.data;
  }

  // If we have stale data, return it but also fetch fresh data in background
  if (cached.data && cached.isStale && !cached.isExpired) {
    // Return stale data immediately
    const staleData = cached.data;
    
    // Fetch fresh data in background
    fetch(url, options)
      .then(response => response.json())
      .then(freshData => {
        apiCache.set(cacheKey, freshData, category);
      })
      .catch(error => {
        console.warn('Background refresh failed:', error);
      });
    
    return staleData;
  }

  // No usable cached data, fetch fresh
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  apiCache.set(cacheKey, data, category);
  
  return data;
}
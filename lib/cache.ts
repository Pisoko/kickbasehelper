/**
 * Client-side caching utility for player data and images
 * Stores data in localStorage with expiration timestamps
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface PlayerCacheData {
  players: any[];
  matches: any[];
  updatedAt: string;
  cacheAgeDays: number | null;
}

const CACHE_KEYS = {
  PLAYER_DATA: 'kickbase_player_data',
  PLAYER_IMAGES: 'kickbase_player_images',
} as const;

// Cache duration in milliseconds (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

/**
 * Generic cache functions
 */
export function setCache<T>(key: string, data: T, duration: number = CACHE_DURATION): void {
  if (typeof window === 'undefined') return;
  
  const cacheEntry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + duration,
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (error) {
    console.warn('Failed to set cache:', error);
  }
}

export function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const cacheEntry: CacheEntry<T> = JSON.parse(cached);
    
    // Check if cache has expired
    if (Date.now() > cacheEntry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    
    return cacheEntry.data;
  } catch (error) {
    console.warn('Failed to get cache:', error);
    return null;
  }
}

export function clearCache(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}

export function isCacheValid(key: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return false;
    
    const cacheEntry: CacheEntry<any> = JSON.parse(cached);
    return Date.now() <= cacheEntry.expiresAt;
  } catch (error) {
    return false;
  }
}

/**
 * Player data specific cache functions
 */
export function setPlayerDataCache(data: PlayerCacheData): void {
  setCache(CACHE_KEYS.PLAYER_DATA, data);
}

export function getPlayerDataCache(): PlayerCacheData | null {
  return getCache<PlayerCacheData>(CACHE_KEYS.PLAYER_DATA);
}

export function clearPlayerDataCache(): void {
  clearCache(CACHE_KEYS.PLAYER_DATA);
}

export function isPlayerDataCacheValid(): boolean {
  return isCacheValid(CACHE_KEYS.PLAYER_DATA);
}

/**
 * Player images cache functions
 */
export function setPlayerImagesCache(images: Record<string, string>): void {
  setCache(CACHE_KEYS.PLAYER_IMAGES, images);
}

export function getPlayerImagesCache(): Record<string, string> | null {
  return getCache<Record<string, string>>(CACHE_KEYS.PLAYER_IMAGES);
}

export function clearPlayerImagesCache(): void {
  clearCache(CACHE_KEYS.PLAYER_IMAGES);
}

export function isPlayerImagesCacheValid(): boolean {
  return isCacheValid(CACHE_KEYS.PLAYER_IMAGES);
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  clearPlayerDataCache();
  clearPlayerImagesCache();
}

/**
 * Get cache info for display
 */
export function getCacheInfo(): {
  playerDataCached: boolean;
  playerImagesCached: boolean;
  playerDataAge?: number;
  playerImagesAge?: number;
} {
  if (typeof window === 'undefined') {
    return {
      playerDataCached: false,
      playerImagesCached: false,
    };
  }
  
  const playerDataCached = isPlayerDataCacheValid();
  const playerImagesCached = isPlayerImagesCacheValid();
  
  let playerDataAge: number | undefined;
  let playerImagesAge: number | undefined;
  
  try {
    const playerDataCache = localStorage.getItem(CACHE_KEYS.PLAYER_DATA);
    if (playerDataCache) {
      const entry: CacheEntry<any> = JSON.parse(playerDataCache);
      playerDataAge = Math.floor((Date.now() - entry.timestamp) / (1000 * 60 * 60)); // hours
    }
    
    const playerImagesCache = localStorage.getItem(CACHE_KEYS.PLAYER_IMAGES);
    if (playerImagesCache) {
      const entry: CacheEntry<any> = JSON.parse(playerImagesCache);
      playerImagesAge = Math.floor((Date.now() - entry.timestamp) / (1000 * 60 * 60)); // hours
    }
  } catch (error) {
    console.warn('Failed to get cache info:', error);
  }
  
  return {
    playerDataCached,
    playerImagesCached,
    playerDataAge,
    playerImagesAge,
  };
}
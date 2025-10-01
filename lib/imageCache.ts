'use client';

interface CacheEntry {
  url: string;
  timestamp: number;
}

class ImageCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  private generateCacheKey(playerName: string, playerImageUrl?: string): string {
    return `${playerName}_${playerImageUrl || 'no-url'}`;
  }

  get(playerName: string, playerImageUrl?: string): string | null {
    const key = this.generateCacheKey(playerName, playerImageUrl);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return entry.url;
  }

  set(playerName: string, imageUrl: string, playerImageUrl?: string): void {
    const key = this.generateCacheKey(playerName, playerImageUrl);
    this.cache.set(key, {
      url: imageUrl,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const imageCache = new ImageCache();

// Cleanup expired entries every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    imageCache.cleanup();
  }, 10 * 60 * 1000);
}
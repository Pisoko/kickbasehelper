import fs from 'fs';
import path from 'path';
import pino from 'pino';

const logger = pino({ 
  name: 'CacheService',
  level: 'debug' // Temporarily enable debug logs
});

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

export interface CacheConfig {
  baseDir: string;
  defaultTTL: number;
  maxSize?: number;
  cleanupInterval?: number;
}

export class CacheService {
  protected config: CacheConfig;
  private memoryCache = new Map<string, CacheEntry>();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      baseDir: path.join(process.cwd(), 'cache'),
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      maxSize: 1000,
      cleanupInterval: 10 * 60 * 1000, // 10 minutes
      ...config
    };

    // Ensure cache directory exists
    this.ensureCacheDir();
    
    // Start cleanup timer
    this.startCleanupTimer();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.config.baseDir)) {
      fs.mkdirSync(this.config.baseDir, { recursive: true });
    }
  }

  private startCleanupTimer(): void {
    if (this.config.cleanupInterval) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.config.cleanupInterval);
    }
  }

  private getFilePath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.config.baseDir, `${safeKey}.json`);
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Get data from cache (memory first, then disk)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        logger.debug(`Cache hit (memory): ${key}`);
        return memoryEntry.data as T;
      }

      // Check disk cache
      const filePath = this.getFilePath(key);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const entry: CacheEntry<T> = JSON.parse(fileContent);
        
        if (!this.isExpired(entry)) {
          // Move to memory cache for faster access
          this.memoryCache.set(key, entry);
          logger.debug(`Cache hit (disk): ${key}`);
          return entry.data;
        } else {
          // Remove expired file
          fs.unlinkSync(filePath);
        }
      }

      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache (both memory and disk)
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL,
        key
      };

      // Store in memory cache
      this.memoryCache.set(key, entry);

      // Store on disk
      const filePath = this.getFilePath(key);
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');

      // Enforce memory cache size limit
      if (this.config.maxSize && this.memoryCache.size > this.config.maxSize) {
        this.evictOldest();
      }

      logger.debug(`Cache set: ${key}`);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete specific cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      // Remove from memory
      this.memoryCache.delete(key);

      // Remove from disk
      const filePath = this.getFilePath(key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Check if key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Clear all cache (memory and disk)
   */
  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear disk cache
      if (fs.existsSync(this.config.baseDir)) {
        const files = fs.readdirSync(this.config.baseDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(this.config.baseDir, file));
          }
        }
      }

      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    try {
      let cleanedCount = 0;

      // Clean memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (this.isExpired(entry)) {
          this.memoryCache.delete(key);
          cleanedCount++;
        }
      }

      // Clean disk cache
      if (fs.existsSync(this.config.baseDir)) {
        const files = fs.readdirSync(this.config.baseDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(this.config.baseDir, file);
            try {
              const fileContent = fs.readFileSync(filePath, 'utf-8');
              const entry: CacheEntry = JSON.parse(fileContent);
              
              if (this.isExpired(entry)) {
                fs.unlinkSync(filePath);
                cleanedCount++;
              }
            } catch (error) {
              // Remove corrupted files
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          }
        }
      }

      if (cleanedCount > 0) {
        logger.debug(`Cache cleanup: removed ${cleanedCount} expired entries`);
      }
    } catch (error) {
      logger.error('Cache cleanup error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    diskSize: number;
    totalEntries: number;
  } {
    let diskSize = 0;
    
    try {
      if (fs.existsSync(this.config.baseDir)) {
        const files = fs.readdirSync(this.config.baseDir);
        diskSize = files.filter(f => f.endsWith('.json')).length;
      }
    } catch (error) {
      logger.error('Error getting cache stats:', error);
    }

    return {
      memorySize: this.memoryCache.size,
      diskSize,
      totalEntries: this.memoryCache.size + diskSize
    };
  }

  /**
   * Evict oldest entries from memory cache
   */
  private evictOldest(): void {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = Math.ceil(entries.length * 0.1); // Remove 10%
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  /**
   * Destroy cache service and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Singleton instances for different cache types
export const dataCache = new CacheService({
  baseDir: path.join(process.cwd(), 'cache', 'data'),
  defaultTTL: 60 * 60 * 1000, // 1 hour for data
  maxSize: 500
});

export const imageCache = new CacheService({
  baseDir: path.join(process.cwd(), 'cache', 'images'),
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours for images
  maxSize: 2000
});

export const apiCache = new CacheService({
  baseDir: path.join(process.cwd(), 'cache', 'api'),
  defaultTTL: 30 * 60 * 1000, // 30 minutes for API responses
  maxSize: 1000
});
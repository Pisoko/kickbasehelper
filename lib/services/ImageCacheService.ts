import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import pino from 'pino';
import { CacheService } from './CacheService';

const logger = pino({ 
  name: 'ImageCacheService',
  level: 'warn' // Only show warnings and errors
});

export interface ImageCacheEntry {
  originalUrl: string;
  localPath: string;
  mimeType: string;
  size: number;
  timestamp: number;
  ttl: number;
}

export class ImageCacheService extends CacheService {
  private imageDir: string;

  constructor() {
    super({
      baseDir: path.join(process.cwd(), 'cache', 'images'),
      defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days for images
      maxSize: 5000
    });
    
    this.imageDir = path.join(process.cwd(), 'public', 'cached-images');
    this.ensureImageDir();
  }

  private ensureImageDir(): void {
    if (!fs.existsSync(this.imageDir)) {
      fs.mkdirSync(this.imageDir, { recursive: true });
    }
  }

  private getImageFileName(url: string): string {
    const urlHash = Buffer.from(url).toString('base64').replace(/[/+=]/g, '_');
    const extension = this.getFileExtension(url);
    return `${urlHash}${extension}`;
  }

  private getFileExtension(url: string): string {
    const urlPath = new URL(url).pathname;
    const extension = path.extname(urlPath).toLowerCase();
    
    // Default to .jpg if no extension found
    if (!extension || !['.jpg', '.jpeg', '.png', '.svg', '.webp'].includes(extension)) {
      return '.jpg';
    }
    
    return extension;
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp'
    };
    
    return mimeTypes[extension] || 'image/jpeg';
  }

  private downloadImage(url: string, localPath: string): Promise<{ size: number; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      
      const request = client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const fileStream = fs.createWriteStream(localPath);
        let size = 0;
        
        response.on('data', (chunk) => {
          size += chunk.length;
        });
        
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          const extension = path.extname(localPath);
          const mimeType = this.getMimeType(extension);
          resolve({ size, mimeType });
        });
        
        fileStream.on('error', (error) => {
          fs.unlink(localPath, () => {}); // Clean up on error
          reject(error);
        });
      });
      
      request.on('error', reject);
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Cache an image from URL and return local path
   */
  async cacheImage(url: string, ttl?: number): Promise<string | null> {
    try {
      if (!url || typeof url !== 'string') {
        logger.warn('Invalid URL provided for image caching');
        return null;
      }

      const cacheKey = `image_${url}`;
      
      // Check if already cached
      const cached = await this.get<ImageCacheEntry>(cacheKey);
      if (cached) {
        const localPath = path.join(this.imageDir, cached.localPath);
        if (fs.existsSync(localPath)) {
          logger.debug(`Image cache hit: ${url}`);
          return `/cached-images/${cached.localPath}`;
        } else {
          // Cache entry exists but file is missing, remove cache entry
          await this.delete(cacheKey);
        }
      }

      // Download and cache the image
      const fileName = this.getImageFileName(url);
      const localPath = path.join(this.imageDir, fileName);
      
      logger.debug(`Downloading image: ${url}`);
      const { size, mimeType } = await this.downloadImage(url, localPath);
      
      // Store cache entry
      const cacheEntry: ImageCacheEntry = {
        originalUrl: url,
        localPath: fileName,
        mimeType,
        size,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL
      };
      
      await this.set(cacheKey, cacheEntry, ttl);
      
      logger.debug(`Image cached successfully: ${url} -> ${fileName} (${size} bytes)`);
      return `/cached-images/${fileName}`;
      
    } catch (error) {
      logger.error(`Failed to cache image ${url}:`, error);
      return null;
    }
  }

  /**
   * Get cached image path or return original URL
   */
  async getCachedImagePath(url: string): Promise<string> {
    const cachedPath = await this.cacheImage(url);
    return cachedPath || url;
  }

  /**
   * Cache player image with specific TTL
   */
  async cachePlayerImage(playerName: string, imageUrl: string): Promise<string | null> {
    const playerTTL = 7 * 24 * 60 * 60 * 1000; // 7 days for player images
    return this.cacheImage(imageUrl, playerTTL);
  }

  /**
   * Cache team logo with specific TTL
   */
  async cacheTeamLogo(teamName: string, logoUrl: string): Promise<string | null> {
    const logoTTL = 30 * 24 * 60 * 60 * 1000; // 30 days for team logos
    return this.cacheImage(logoUrl, logoTTL);
  }

  /**
   * Preload images from URLs
   */
  async preloadImages(urls: string[]): Promise<void> {
    logger.info(`Preloading ${urls.length} images`);
    
    const batchSize = 5; // Process 5 images at a time
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(url => this.cacheImage(url))
      );
      
      // Small delay between batches to avoid overwhelming the server
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    logger.info('Image preloading completed');
  }

  /**
   * Clean up expired images from disk
   */
  async cleanupExpiredImages(): Promise<void> {
    try {
      if (!fs.existsSync(this.imageDir)) {
        return;
      }

      const files = fs.readdirSync(this.imageDir);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.imageDir, file);
        const stats = fs.statSync(filePath);
        
        // Check if we have a cache entry for this file
        const cacheKey = `image_${file}`;
        const cached = await this.get<ImageCacheEntry>(cacheKey);
        
        if (!cached) {
          // No cache entry, remove orphaned file
          fs.unlinkSync(filePath);
          cleanedCount++;
        } else if (Date.now() - cached.timestamp > cached.ttl) {
          // Cache entry expired, remove both file and cache entry
          fs.unlinkSync(filePath);
          await this.delete(cacheKey);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired images`);
      }
    } catch (error) {
      logger.error('Error during image cleanup:', error);
    }
  }

  /**
   * Get cache statistics including disk usage
   */
  getImageCacheStats(): {
    totalImages: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    oldestImage: Date | null;
    newestImage: Date | null;
  } {
    let totalImages = 0;
    let totalSizeBytes = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    try {
      if (fs.existsSync(this.imageDir)) {
        const files = fs.readdirSync(this.imageDir);
        
        for (const file of files) {
          const filePath = path.join(this.imageDir, file);
          const stats = fs.statSync(filePath);
          
          totalImages++;
          totalSizeBytes += stats.size;
          
          const timestamp = stats.mtime.getTime();
          if (timestamp < oldestTimestamp) oldestTimestamp = timestamp;
          if (timestamp > newestTimestamp) newestTimestamp = timestamp;
        }
      }
    } catch (error) {
      logger.error('Error getting image cache stats:', error);
    }

    return {
      totalImages,
      totalSizeBytes,
      totalSizeMB: Math.round(totalSizeBytes / (1024 * 1024) * 100) / 100,
      oldestImage: oldestTimestamp === Infinity ? null : new Date(oldestTimestamp),
      newestImage: newestTimestamp === 0 ? null : new Date(newestTimestamp)
    };
  }
}

// Singleton instance
export const imageCacheService = new ImageCacheService();
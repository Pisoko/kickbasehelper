import pino from 'pino';
import { promises as fs } from 'fs';
import path from 'path';
import { CacheService } from './CacheService';

const logger = pino({ 
  name: 'TeamLogoCacheService',
  level: 'warn' // Only show warnings and errors
});

export interface TeamLogoEntry {
  teamId: string;
  teamName: string;
  logoUrl: string;
  localPath: string;
  downloadedAt: string;
  fileSize: number;
  format: 'png' | 'jpg' | 'svg' | 'webp';
}

export class TeamLogoCacheService extends CacheService {
  private logoDir: string;

  constructor() {
    super({
      baseDir: 'cache/team-logos',
      defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days for logos
      maxSize: 500,
      cleanupInterval: 24 * 60 * 60 * 1000 // Daily cleanup
    });
    
    this.logoDir = path.join(process.cwd(), 'public', 'cache', 'team-logos');
  }

  /**
   * Initialize logo cache directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.logoDir, { recursive: true });
      logger.info(`Team logo cache directory initialized: ${this.logoDir}`);
    } catch (error) {
      logger.error('Failed to initialize team logo cache directory:', error);
      throw error;
    }
  }

  /**
   * Download and cache a team logo
   */
  async cacheTeamLogo(
    teamId: string,
    teamName: string,
    logoUrl: string,
    force = false
  ): Promise<TeamLogoEntry | null> {
    try {
      // Check if already cached and not forcing update
      if (!force) {
        const existing = await this.getCachedTeamLogo(teamId);
        if (existing) {
          logger.debug(`Team logo already cached for ${teamName} (${teamId})`);
          return existing;
        }
      }

      // Download the logo
      const response = await fetch(logoUrl);
      if (!response.ok) {
        logger.warn(`Failed to download logo for ${teamName}: ${response.statusText}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      
      // Determine file format from URL or content type
      const contentType = response.headers.get('content-type') || '';
      let format: 'png' | 'jpg' | 'svg' | 'webp' = 'png';
      
      if (contentType.includes('svg')) format = 'svg';
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) format = 'jpg';
      else if (contentType.includes('webp')) format = 'webp';
      else if (logoUrl.includes('.svg')) format = 'svg';
      else if (logoUrl.includes('.jpg') || logoUrl.includes('.jpeg')) format = 'jpg';
      else if (logoUrl.includes('.webp')) format = 'webp';

      // Create filename
      const filename = `${teamId}_${teamName.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
      const localPath = path.join(this.logoDir, filename);
      const publicPath = `/cache/team-logos/${filename}`;

      // Save to disk
      await fs.writeFile(localPath, uint8Array);

      // Create cache entry
      const logoEntry: TeamLogoEntry = {
        teamId,
        teamName,
        logoUrl,
        localPath: publicPath,
        downloadedAt: new Date().toISOString(),
        fileSize: uint8Array.length,
        format
      };

      // Cache the entry
      await this.set(`logo_${teamId}`, logoEntry);
      
      logger.info(`Cached team logo for ${teamName} (${teamId}): ${filename} (${uint8Array.length} bytes)`);
      return logoEntry;

    } catch (error) {
      logger.error(`Failed to cache team logo for ${teamName} (${teamId}):`, error);
      return null;
    }
  }

  /**
   * Get cached team logo
   */
  async getCachedTeamLogo(teamId: string): Promise<TeamLogoEntry | null> {
    const cached = await this.get<TeamLogoEntry>(`logo_${teamId}`);
    
    if (cached) {
      // Verify file still exists
      const fullPath = path.join(process.cwd(), 'public', cached.localPath);
      try {
        await fs.access(fullPath);
        return cached;
      } catch {
        // File doesn't exist, remove from cache
        await this.delete(`logo_${teamId}`);
        logger.warn(`Team logo file missing for ${teamId}, removed from cache`);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Get local path for team logo (for serving)
   */
  async getTeamLogoPath(teamId: string): Promise<string | null> {
    const cached = await this.getCachedTeamLogo(teamId);
    return cached?.localPath || null;
  }

  /**
   * Preload team logos for common Bundesliga teams
   */
  async preloadBundesligaLogos(): Promise<void> {
    logger.info('Starting Bundesliga team logo preload');
    
    // Common Bundesliga teams with their logo URLs
    const bundesligaTeams = [
      { id: '40', name: 'Bayern München', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/bayern.png' },
      { id: '7', name: 'Borussia Dortmund', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/dortmund.png' },
      { id: '9', name: 'RB Leipzig', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/leipzig.png' },
      { id: '6', name: 'Bayer Leverkusen', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/leverkusen.png' },
      { id: '3', name: 'Eintracht Frankfurt', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/frankfurt.png' },
      { id: '15', name: 'VfB Stuttgart', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/stuttgart.png' },
      { id: '18', name: 'Borussia Mönchengladbach', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/mgladbach.png' },
      { id: '1', name: 'FC Augsburg', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/augsburg.png' },
      { id: '2', name: 'Union Berlin', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/union.png' },
      { id: '4', name: 'SC Freiburg', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/freiburg.png' },
      { id: '5', name: 'TSG Hoffenheim', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/hoffenheim.png' },
      { id: '8', name: 'VfL Wolfsburg', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/wolfsburg.png' },
      { id: '10', name: 'Mainz 05', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/mainz.png' },
      { id: '11', name: 'Werder Bremen', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/bremen.png' },
      { id: '12', name: 'VfL Bochum', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/bochum.png' },
      { id: '13', name: 'FC St. Pauli', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/stpauli.png' },
      { id: '14', name: 'Holstein Kiel', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/kiel.png' },
      { id: '16', name: 'FC Heidenheim', url: 'https://img.bundesliga.com/tachyon/sites/2/2017/07/heidenheim.png' }
    ];

    let successCount = 0;
    let failCount = 0;

    for (const team of bundesligaTeams) {
      try {
        const result = await this.cacheTeamLogo(team.id, team.name, team.url);
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Failed to preload logo for ${team.name}:`, error);
        failCount++;
      }
    }

    logger.info(`Bundesliga logo preload completed: ${successCount} success, ${failCount} failed`);
  }

  /**
   * Clean up orphaned logo files
   */
  async cleanupOrphanedFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.logoDir);
      const cachedLogos = new Set<string>();
      
      // Get all cached logo filenames
      const stats = this.getStats();
      for (let i = 0; i < stats.totalEntries; i++) {
        // This is a simplified approach - in reality we'd iterate through cache entries
        // For now, we'll just log the cleanup process
      }
      
      logger.info(`Found ${files.length} logo files in cache directory`);
      
      // TODO: Implement actual orphaned file cleanup
      // This would compare files on disk with cache entries and remove orphans
      
    } catch (error) {
      logger.error('Failed to cleanup orphaned logo files:', error);
    }
  }

  /**
   * Get cache statistics for team logos
   */
  async getLogoStats(): Promise<{
    totalLogos: number;
    totalSize: number;
    averageSize: number;
    formats: Record<string, number>;
    oldestLogo: string | null;
    newestLogo: string | null;
  }> {
    const stats = this.getStats();
    
    // This is a simplified version - in a real implementation,
    // we'd iterate through all cached entries to calculate detailed stats
    return {
      totalLogos: stats.totalEntries,
      totalSize: 0, // Would calculate from actual entries
      averageSize: 0,
      formats: { png: 0, jpg: 0, svg: 0, webp: 0 },
      oldestLogo: null,
      newestLogo: null
    };
  }
}

// Singleton instance
export const teamLogoCache = new TeamLogoCacheService();
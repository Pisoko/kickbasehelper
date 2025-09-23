/**
 * Service for fetching and managing player images from the Bundesliga website
 */

import { promises as fs } from 'fs';
import path from 'path';
import FirecrawlApp from '@mendable/firecrawl-js';
import { normalizePlayerName, playerNamesMatch, findBestPlayerNameMatch } from '../stringUtils';

export interface BundesligaPlayer {
  name: string;
  imageUrl?: string;
  team: string;
  position: string;
  number?: number;
  nationality?: string[];
}

export interface PlayerImageMapping {
  playerName: string;
  bundesligaImageUrl?: string;
  localImagePath?: string;
  lastUpdated: string;
}

export class BundesligaImageService {
  private static readonly BUNDESLIGA_PLAYERS_URL = 'https://www.bundesliga.com/de/bundesliga/spieler';
  private static readonly BUNDESLIGA_ASSETS_BASE = 'https://assets.bundesliga.com/player/';
  private static readonly PLACEHOLDER_URL = 'https://www.bundesliga.com/assets/placeholder/player-circle-default.png';
  private static readonly IMAGE_CACHE_DIR = path.join(process.cwd(), 'public', 'images', 'players');
  private static readonly MAPPING_FILE = path.join(process.cwd(), 'data', 'player-image-mapping.json');

  /**
   * Scrape all player data from Bundesliga website using firecrawl
   */
  static async scrapeAllPlayers(): Promise<BundesligaPlayer[]> {
    try {
      console.log('Scraping Bundesliga players page with firecrawl...');
      
      // Check if Firecrawl API key is available
      if (!process.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_API_KEY === 'your_firecrawl_api_key_here') {
        console.log('No valid Firecrawl API key found, using local MCP service...');
        return await BundesligaImageService.scrapeWithMCP();
      }
      
      // Initialize Firecrawl client
      const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
      
      // Scrape the Bundesliga players page with JavaScript rendering
      const scrapeResult = await app.scrapeUrl(BundesligaImageService.BUNDESLIGA_PLAYERS_URL, {
        formats: ['markdown'],
        waitFor: 10000, // Wait longer for JavaScript to load
        onlyMainContent: true // Focus on main content for better markdown parsing
      });

      if (!scrapeResult.success || !scrapeResult.markdown) {
        throw new Error('Failed to get markdown content from firecrawl');
      }

      console.log('Successfully retrieved markdown from firecrawl');
      console.log('Markdown length:', scrapeResult.markdown.length);
      
      return BundesligaImageService.parsePlayersFromMarkdown(scrapeResult.markdown);
    } catch (error) {
      console.error('Error scraping Bundesliga players:', error);
      return [];
    }
  }

  /**
   * Fallback method using MCP Firecrawl service
   */
  private static async scrapeWithMCP(): Promise<BundesligaPlayer[]> {
    try {
      // Use MCP Firecrawl service with proper wait time for JavaScript rendering
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://your-domain.com' 
        : 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/scrape-bundesliga-markdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to scrape with MCP: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.markdown) {
        throw new Error('Failed to get markdown content from MCP');
      }

      console.log('Successfully retrieved markdown from MCP Firecrawl');
      console.log('Markdown length:', data.markdown.length);
      
      return BundesligaImageService.parsePlayersFromMarkdown(data.markdown);
    } catch (error) {
      console.error('Error scraping with MCP:', error);
      return [];
    }
  }

  /**
   * Parse player data from scraped HTML content
   */
  private static parsePlayersFromHTML(html: string): BundesligaPlayer[] {
    const players: BundesligaPlayer[] = [];
    
    console.log('HTML content length:', html.length);
    
    // Look for player-card-simple elements
    const playerCardRegex = /<player-card-simple[^>]*>(.*?)<\/player-card-simple>/gs;
    const playerCards = html.match(playerCardRegex);
    
    console.log(`Found ${playerCards ? playerCards.length : 0} player-card-simple elements`);
    
    if (playerCards && playerCards.length > 0) {
      for (const card of playerCards) {
        try {
          // Extract player URL to get player ID/name
          const urlMatch = card.match(/href="\/de\/bundesliga\/spieler\/([^"]+)"/);
          if (!urlMatch) continue;
          
          const playerSlug = urlMatch[1];
          
          // Extract first and last name
          const firstNameMatch = card.match(/<span[^>]*class="[^"]*firstName[^"]*"[^>]*>([^<]+)<\/span>/);
          const lastNameMatch = card.match(/<span[^>]*class="[^"]*lastName[^"]*"[^>]*>([^<]+)<\/span>/);
          
          if (!firstNameMatch || !lastNameMatch) continue;
          
          const firstName = firstNameMatch[1].trim();
          const lastName = lastNameMatch[1].trim();
          const fullName = `${firstName} ${lastName}`;
          
          // Extract player number
          const numberMatch = card.match(/<span[^>]*class="[^"]*playerNumber[^"]*"[^>]*>(\d+)<\/span>/);
          const playerNumber = numberMatch ? parseInt(numberMatch[1]) : undefined;
          
          // Extract nationality
          const nationalityMatch = card.match(/alt="([a-z]{2})"/);
          const nationality = nationalityMatch ? [nationalityMatch[1].toUpperCase()] : undefined;
          
          // Extract actual image URL from src attribute
          const imageMatch = card.match(/<img[^>]*src="([^"]+)"[^>]*>/);
          let imageUrl: string | undefined;
          
          if (imageMatch) {
            const srcUrl = imageMatch[1];
            // Only use non-placeholder images
            if (!srcUrl.includes('placeholder') && !srcUrl.includes('default') && srcUrl.includes('assets.bundesliga.com')) {
              imageUrl = srcUrl.startsWith('http') ? srcUrl : `https:${srcUrl}`;
            }
          }
          
          console.log(`Found player: ${fullName} (#${playerNumber || 'N/A'}) - Image: ${imageUrl || 'No valid image found'}`);
          
          // For now, we'll set team and position as Unknown since they're not in the card structure
          // These would need to be extracted from the page context or additional API calls
          players.push({
            name: fullName,
            imageUrl: imageUrl,
            team: 'Unknown', // Would need team context
            position: 'Unknown', // Would need position context
            number: playerNumber,
            nationality: nationality
          });
          
        } catch (error) {
          console.error('Error parsing player card:', error);
          continue;
        }
      }
    }
    
    console.log(`Total players parsed: ${players.length}`);
    return players;
  }

  /**
   * Parse player data from scraped markdown content
   */
  private static parsePlayersFromMarkdown(markdown: string): BundesligaPlayer[] {
    const players: BundesligaPlayer[] = [];
    
    try {
      // Extract player image URLs from markdown format
      // Pattern: [![PlayerName](imageUrl)NumberPlayerName![flag](flagUrl)](playerUrl)
      const playerRegex = /\[!\[([^\]]+)\]\((https:\/\/assets\.bundesliga\.com\/player\/[^)]+)\)[^\]]*\]\([^)]+\)/gi;
      
      const matches = [...markdown.matchAll(playerRegex)];
      
      for (const match of matches) {
        const playerName = match[1];
        const imageUrl = match[2];
        
        // Skip placeholder or default images
        if (imageUrl.includes('placeholder') || imageUrl.includes('default')) {
          continue;
        }
        
        if (playerName && imageUrl) {
          players.push({
            name: playerName.trim(),
            imageUrl: imageUrl,
            team: 'Unknown', // Will be extracted from context if needed
            position: 'Unknown'
          });
        }
      }
      
      console.log(`Parsed ${players.length} players from markdown`);
      return players;
    } catch (error) {
      console.error('Error parsing players from markdown:', error);
      return [];
    }
  }

  /**
   * Download and cache player images locally
   */
  static async downloadPlayerImages(players: BundesligaPlayer[]): Promise<PlayerImageMapping[]> {
    // Ensure cache directory exists
    await this.ensureDirectoryExists(this.IMAGE_CACHE_DIR);
    await this.ensureDirectoryExists(path.dirname(this.MAPPING_FILE));

    const mappings: PlayerImageMapping[] = [];
    const batchSize = 5; // Download in batches to avoid overwhelming the server

    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      const batchPromises = batch.map(player => this.downloadSinglePlayerImage(player));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          mappings.push(result.value);
        } else if (result.status === 'rejected') {
          console.warn(`Failed to download image for ${batch[index].name}:`, result.reason);
        }
      });

      // Add delay between batches to be respectful to the server
      if (i + batchSize < players.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Save mappings to file
    await this.saveMappings(mappings);
    
    return mappings;
  }

  /**
   * Download a single player image
   */
  private static async downloadSinglePlayerImage(player: BundesligaPlayer): Promise<PlayerImageMapping | null> {
    if (!player.imageUrl || player.imageUrl.includes('placeholder')) {
      return null;
    }

    try {
      const response = await fetch(player.imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const fileName = this.generateFileName(player.name, player.imageUrl);
      const localPath = path.join(this.IMAGE_CACHE_DIR, fileName);
      
      await fs.writeFile(localPath, Buffer.from(buffer));
      
      return {
        playerName: player.name,
        bundesligaImageUrl: player.imageUrl,
        localImagePath: `/images/players/${fileName}`,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Failed to download image for ${player.name}:`, error);
      return null;
    }
  }

  /**
   * Generate a safe filename for the player image
   */
  private static generateFileName(playerName: string, imageUrl: string): string {
    const safeName = playerName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const extension = path.extname(new URL(imageUrl).pathname) || '.png';
    return `${safeName}${extension}`;
  }

  /**
   * Ensure directory exists
   */
  private static async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Save player image mappings to file
   */
  private static async saveMappings(mappings: PlayerImageMapping[]): Promise<void> {
    try {
      const existingMappings = await this.loadMappings();
      const mergedMappings = this.mergeMappings(existingMappings, mappings);
      
      await fs.writeFile(
        this.MAPPING_FILE,
        JSON.stringify(mergedMappings, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save mappings:', error);
    }
  }

  /**
   * Load existing player image mappings
   */
  static async loadMappings(): Promise<PlayerImageMapping[]> {
    try {
      const data = await fs.readFile(this.MAPPING_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Merge existing mappings with new ones
   */
  private static mergeMappings(
    existing: PlayerImageMapping[],
    newMappings: PlayerImageMapping[]
  ): PlayerImageMapping[] {
    const merged = [...existing];
    
    for (const newMapping of newMappings) {
      const existingIndex = merged.findIndex(m => m.playerName === newMapping.playerName);
      if (existingIndex >= 0) {
        merged[existingIndex] = newMapping;
      } else {
        merged.push(newMapping);
      }
    }
    
    return merged;
  }

  /**
   * Find image mapping for a player by name
   * Uses normalized name matching to handle accented characters and variations
   */
  static async findPlayerImage(playerName: string, firstName?: string): Promise<string | null> {
    const mappings = await this.loadMappings();
    
    // First try exact normalized match
    const exactMatch = mappings.find(m => 
      playerNamesMatch(m.playerName, playerName, undefined, firstName)
    );
    
    if (exactMatch) {
      return exactMatch.localImagePath || null;
    }
    
    // If no exact match, try to find the best match
    const candidates = mappings.map(m => ({ name: m.playerName }));
    const bestMatch = findBestPlayerNameMatch(playerName, candidates, firstName);
    
    if (bestMatch) {
      const mapping = mappings.find(m => m.playerName === bestMatch.name);
      return mapping?.localImagePath || null;
    }
    
    return null;
  }

  /**
   * Main method to import player images from Bundesliga website
   */
  static async importPlayerImages(): Promise<{
    totalScraped: number;
    totalDownloaded: number;
    errors: string[];
  }> {
    try {
      console.log('Starting Bundesliga player image import...');
      
      // Step 1: Scrape player data from Bundesliga website
       const players = await this.scrapeAllPlayers();
       console.log(`Scraped ${players.length} players from Bundesliga website`);
       
       // Step 2: Download and cache images
       const downloadResults = await this.downloadPlayerImages(players);
       
       const errors: string[] = [];
       const totalDownloaded = downloadResults.length;
      
      const stats = {
        totalScraped: players.length,
        totalDownloaded,
        errors
      };
      
      console.log('Image import completed:', stats);
      return stats;
      
    } catch (error) {
      console.error('Error in importPlayerImages:', error);
      throw error;
    }
  }

  /**
   * Get statistics about cached images
   */
  static async getImageStats(): Promise<{
    totalMappings: number;
    withImages: number;
    withoutImages: number;
    lastUpdated?: string;
  }> {
    const mappings = await this.loadMappings();
    const withImages = mappings.filter(m => m.localImagePath).length;
    const lastUpdated = mappings.reduce((latest, m) => {
      return !latest || m.lastUpdated > latest ? m.lastUpdated : latest;
    }, '');

    return {
      totalMappings: mappings.length,
      withImages,
      withoutImages: mappings.length - withImages,
      lastUpdated: lastUpdated || undefined
    };
  }
}
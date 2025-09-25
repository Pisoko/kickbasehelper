/**
 * Utility functions for handling player images with fallback sources
 */

import { createSearchableName } from './stringUtils';

export interface PlayerImageSources {
  kickbase?: string | null;
  bundesliga?: string | null;
  theSportsDB?: string | null;
  fallback?: string;
}

/**
 * Known placeholder/invalid image URLs from Kickbase API
 * These images return 404 errors and should be skipped
 */
const KNOWN_PLACEHOLDER_IMAGES = [
  'content/file/48622993193e45f09d696908d75ed523.png',
  'content/file/3b8eae1b9d6d4e8d961bfd3f152db402.png',
  'content/file/ed209b2ca67c4784a658521f80baa795.png',
  'content/file/7d6a4935195d414a9119e81aa398222a.png',
  'content/file/6bd6cf911d5b497e977b3e6a4526aef9.png',
  'content/file/353820bceb58462590ea1a470cde9cc6.png',
  'content/file/2dea6714f704489fa0fb302accce4e8a.png',
  'content/file/1a88a39549924d048294f618079e8437.png',
  'content/file/a00a1472afdc4462933a364537704b05.png',
  'content/file/b93977fb3dee4e75af09d67896a1666b.png',
  'content/file/98159e30baca4a1080128a7a4c32914e.png' // Frederik Rönnow
];

/**
 * Check if a playerImageUrl is a known placeholder that should be skipped
 */
export function isKnownPlaceholderImage(playerImageUrl?: string): boolean {
  if (!playerImageUrl) return false;
  return KNOWN_PLACEHOLDER_IMAGES.includes(playerImageUrl);
}

/**
 * Get player image URL from Kickbase CDN
 */
export function getKickbaseImageUrl(playerImageUrl?: string): string | null {
  if (!playerImageUrl) return null;
  return `https://cdn.kickbase.com/${playerImageUrl}`;
}

/**
 * Search for player image in Bundesliga image mapping via API
 */
export async function getBundesligaImageUrl(playerName: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/player-image?name=${encodeURIComponent(playerName)}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.imageUrl || null;
  } catch (error) {
    console.warn('Failed to fetch Bundesliga image:', error);
    return null;
  }
}

/**
 * Search for player image on TheSportsDB
 * Uses normalized name handling for better search results with accented characters
 */
export async function searchTheSportsDBImage(playerName: string): Promise<string | null> {
  try {
    // Use the normalized searchable name function
    const searchName = createSearchableName(playerName);
    
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(searchName)}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.players && data.players.length > 0) {
      // Look for the first player with an image
      for (const player of data.players) {
        if (player.strThumb) {
          return player.strThumb;
        }
        if (player.strCutout) {
          return player.strCutout;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to fetch image from TheSportsDB:', error);
    return null;
  }
}

/**
 * Get all available image sources for a player
 */
export function getPlayerImageSources(playerImageUrl?: string, playerName?: string): PlayerImageSources {
  return {
    kickbase: getKickbaseImageUrl(playerImageUrl),
    // Bundesliga and TheSportsDB search would be done asynchronously
    fallback: playerName ? generateInitialsUrl(playerName) : undefined
  };
}

/**
 * Generate a data URL for player initials as ultimate fallback
 */
export function generateInitialsUrl(playerName: string): string {
  const initials = playerName
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();
  
  // Create a simple SVG with initials
  const svg = `
    <svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" fill="#475569" rx="24"/>
      <text x="24" y="30" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
        ${initials}
      </text>
    </svg>
  `;
  
  // Use encodeURIComponent instead of btoa to handle Unicode characters properly
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Test if an image URL is accessible
 */
export function testImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}
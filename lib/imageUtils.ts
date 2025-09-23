/**
 * Utility functions for handling player images with fallback sources
 */

export interface PlayerImageSources {
  kickbase?: string | null;
  theSportsDB?: string | null;
  fallback?: string;
}

/**
 * Get player image URL from Kickbase CDN
 */
export function getKickbaseImageUrl(playerImageUrl?: string): string | null {
  if (!playerImageUrl) return null;
  return `https://cdn.kickbase.com/${playerImageUrl}`;
}

/**
 * Search for player image on TheSportsDB
 * This is a simplified version - in production you'd want to cache these results
 */
export async function searchTheSportsDBImage(playerName: string): Promise<string | null> {
  try {
    // Clean player name for search (remove special characters, replace spaces with underscores)
    const searchName = playerName
      .replace(/[^a-zA-Z\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    
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
    // TheSportsDB search would be done asynchronously
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
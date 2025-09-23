import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to scrape Bundesliga player data
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Use a simple fetch to get the HTML content
    // In a production environment, you might want to use a proper scraping service
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract player data from HTML
    const players = extractPlayersFromHTML(html);
    
    return NextResponse.json({
      success: true,
      html: html, // Return the HTML content for BundesligaImageService
      players,
      count: players.length
    });

  } catch (error) {
    console.error('Error scraping Bundesliga:', error);
    return NextResponse.json(
      { error: 'Failed to scrape Bundesliga data' },
      { status: 500 }
    );
  }
}

interface BundesligaPlayer {
  name: string;
  imageUrl?: string;
  team: string;
  position: string;
  number?: number;
  nationality?: string[];
}

/**
 * Extract player data from HTML content
 */
function extractPlayersFromHTML(html: string): BundesligaPlayer[] {
  const players: BundesligaPlayer[] = [];
  
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
        
        // Generate image URL from player slug
        // Bundesliga typically uses this pattern for player images
        const imageUrl = `https://assets.bundesliga.com/player/${playerSlug}.png`;
        
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
  
  console.log(`Total players extracted: ${players.length}`);
  return players;
}
import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to scrape Bundesliga player data using Firecrawl with markdown format
 * This endpoint uses the Firecrawl SDK with proper JavaScript rendering
 */
export async function POST(request: NextRequest) {
  try {
    const BUNDESLIGA_PLAYERS_URL = 'https://www.bundesliga.com/de/bundesliga/spieler';
    
    // Check if we have a valid Firecrawl API key
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey || apiKey === 'your_firecrawl_api_key_here') {
      // Return a mock response for testing without valid API key
      return NextResponse.json({
        success: false,
        error: 'Firecrawl API key not configured',
        details: 'Please set a valid FIRECRAWL_API_KEY in your .env file'
      }, { status: 500 });
    }

    // Use the Firecrawl SDK to scrape with JavaScript rendering
    const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
    const app = new FirecrawlApp({ apiKey });
    
    const scrapeResult = await app.scrapeUrl(BUNDESLIGA_PLAYERS_URL, {
      formats: ['markdown'],
      waitFor: 10000, // Wait 10 seconds for JavaScript to render
      onlyMainContent: true
    });

    if (!scrapeResult.success || !scrapeResult.markdown) {
      throw new Error('Failed to scrape content with Firecrawl');
    }

    console.log('Successfully scraped Bundesliga with Firecrawl SDK');
    console.log('Markdown length:', scrapeResult.markdown.length);
    
    return NextResponse.json({
      success: true,
      markdown: scrapeResult.markdown,
      message: 'Successfully scraped Bundesliga player data with Firecrawl'
    });

  } catch (error) {
    console.error('Error scraping Bundesliga with Firecrawl:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to scrape Bundesliga data with Firecrawl',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
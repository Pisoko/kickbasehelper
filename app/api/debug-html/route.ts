import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Save a sample from the middle where player data likely is
    const startPos = Math.floor(html.length * 0.3); // Start from 30% into the document
    const sample = html.substring(startPos, startPos + 100000); // 100KB sample
    const filePath = path.join(process.cwd(), 'html-sample.txt');
    fs.writeFileSync(filePath, sample);
    
    // Look for player-related patterns
    const playerCardMatches = html.match(/player-card/gi) || [];
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    const playerImgMatches = html.match(/<img[^>]*player[^>]*>/gi) || [];
    
    return NextResponse.json({
      success: true,
      stats: {
        htmlLength: html.length,
        playerCardMatches: playerCardMatches.length,
        totalImages: imgMatches.length,
        playerImages: playerImgMatches.length,
        sampleSaved: true
      }
    });
    
  } catch (error) {
    console.error('Debug HTML error:', error);
    return NextResponse.json({ 
      error: 'Failed to debug HTML',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { playerNamesMatch, findBestPlayerNameMatch } from '../../../lib/stringUtils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerName = searchParams.get('name');
    
    if (!playerName) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }
    
    const mappingFile = path.join(process.cwd(), 'data', 'player-image-mapping.json');
    
    // Check if mapping file exists
    try {
      await fs.access(mappingFile);
    } catch {
      return NextResponse.json({ imageUrl: null });
    }
    
    const mappingData = await fs.readFile(mappingFile, 'utf-8');
    const mappings = JSON.parse(mappingData);
    
    // Find exact normalized match first
    let mapping = mappings.find((m: any) => 
      playerNamesMatch(m.playerName, playerName)
    );
    
    // If no exact match, try to find the best match
    if (!mapping) {
      const candidates = mappings.map((m: any) => ({ name: m.playerName }));
      const bestMatch = findBestPlayerNameMatch(playerName, candidates);
      
      if (bestMatch) {
        mapping = mappings.find((m: any) => m.playerName === bestMatch.name);
      }
    }
    
    return NextResponse.json({ 
      imageUrl: mapping?.localImagePath || null,
      playerName: mapping?.playerName || null
    });
    
  } catch (error) {
    console.error('Error in player-image API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
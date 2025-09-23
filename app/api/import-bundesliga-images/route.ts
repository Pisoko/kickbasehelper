import { NextRequest, NextResponse } from 'next/server';
import { BundesligaImageService } from '../../../lib/adapters/BundesligaImageService';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting Bundesliga image import...');
    
    // Import images from Bundesliga website
    const result = await BundesligaImageService.importPlayerImages();
    
    console.log('Bundesliga image import completed:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Bundesliga images imported successfully',
      stats: result
    });
  } catch (error) {
    console.error('Error importing Bundesliga images:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get current image statistics
    const stats = await BundesligaImageService.getImageStats();
    
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting image stats:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
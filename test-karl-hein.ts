import dotenv from 'dotenv';
dotenv.config();

import { enhancedKickbaseClient } from './lib/adapters/EnhancedKickbaseClient';
import { KickbaseAdapter } from './lib/adapters/KickbaseAdapter';

async function testKarlHein() {
  try {
    console.log('Testing Karl Hein (9513) with real Kickbase API...');
    
    // Test with KickbaseAdapter (like the API does)
    const kickbaseAdapter = new KickbaseAdapter(
      process.env.KICKBASE_BASE || 'https://api.kickbase.com',
      process.env.KICKBASE_KEY || ''
    );
    
    console.log('Testing with KickbaseAdapter...');
    const adapterPerformance = await kickbaseAdapter.getPlayerPerformance('9513');
    console.log('KickbaseAdapter Performance result:', adapterPerformance);
    
    // Test with EnhancedKickbaseClient directly
    console.log('\nTesting with EnhancedKickbaseClient...');
    const performance = await enhancedKickbaseClient.getPlayerPerformance('9513', '1');
    console.log('EnhancedKickbaseClient Performance data:', JSON.stringify(performance, null, 2));
    
  } catch (error) {
    console.log('Error:', error);
  }
}

testKarlHein();
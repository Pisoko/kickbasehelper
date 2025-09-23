import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testTeamId(teamId: number) {
  const apiKey = process.env.KICKBASE_KEY;
  if (!apiKey) {
    console.log('❌ KICKBASE_KEY not found');
    return;
  }

  const url = `https://api.kickbase.com/v4/competitions/1/teams/${teamId}/teamcenter`;
  console.log(`Testing Team ID ${teamId}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'KickbaseHelper/1.0'
      }
    });

    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Team ID ${teamId}: ${data.tn || 'Unknown name'}`);
      console.log(`Raw data:`, JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ Team ID ${teamId}: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ Team ID ${teamId}: Error - ${error}`);
  }
  console.log('---');
}

async function main() {
  console.log('🔍 Testing Bayern München team IDs...\n');
  
  // Test both Bayern IDs
  await testTeamId(2);   // Suspected women's team
  await testTeamId(82);  // Known men's team
  
  console.log('\n🔍 Testing other low IDs...');
  // Test some other low IDs
  for (let id = 1; id <= 10; id++) {
    await testTeamId(id);
  }
}

main().catch(console.error);
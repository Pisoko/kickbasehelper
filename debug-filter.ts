import { Start11GeneratorService } from './lib/services/Start11GeneratorService';
import fs from 'fs';

async function debugFilter() {
  console.log('=== DEBUG: Player Filtering ===');
  
  // Load real data
  const spieltagData = JSON.parse(fs.readFileSync('./data/2025/spieltag_5.json', 'utf8'));
  const players = spieltagData.players;
  
  console.log(`Total players loaded: ${players.length}`);
  
  // Test with different configurations
  const service = new Start11GeneratorService(players);
  
  // Test 1: Without onlyStart11Players filter
  console.log('\n=== TEST 1: onlyStart11Players = false ===');
  try {
    const result1 = await service.generateOptimalStart11({
      onlyStart11Players: false,
      maxBudget: 50000000
    });
    console.log('✅ SUCCESS: Team generated successfully');
    console.log(`Total cost: ${result1.team.totalCost.toLocaleString()} €`);
    console.log('\nSelected players:');
    Object.entries(result1.team.players).forEach(([pos, player]) => {
      console.log(`  ${pos}: ${player.name} - ${(player.marketValue || player.kosten || 0).toLocaleString()} €`);
    });
  } catch (error) {
    console.log('❌ FAILED:', (error as Error).message);
  }
  
  // Test 2: With onlyStart11Players filter (default)
  console.log('\n=== TEST 2: onlyStart11Players = true (default) ===');
  try {
    const result2 = await service.generateOptimalStart11({
      onlyStart11Players: true,
      maxBudget: 50000000
    });
    console.log('✅ SUCCESS: Team generated successfully');
    console.log(`Total cost: ${result2.team.totalCost.toLocaleString()} €`);
  } catch (error) {
    console.log('❌ FAILED:', (error as Error).message);
  }
  
  // Test 3: Default options (to see what the default behavior is)
  console.log('\n=== TEST 3: Default options ===');
  try {
    const result3 = await service.generateOptimalStart11();
    console.log('✅ SUCCESS: Team generated successfully');
    console.log(`Total cost: ${result3.team.totalCost.toLocaleString()} €`);
  } catch (error) {
    console.log('❌ FAILED:', (error as Error).message);
  }
}

debugFilter().catch(console.error);
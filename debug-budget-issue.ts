import { Start11GeneratorService } from './lib/services/Start11GeneratorService';
import fs from 'fs';

async function debugBudgetIssue() {
  console.log('=== DEBUG: Budget Issue Analysis ===');
  
  // Load real player data
  const spieltagData = JSON.parse(fs.readFileSync('./data/2025/spieltag_5.json', 'utf8'));
  const players = spieltagData.players;
  
  console.log(`Total players loaded: ${players.length}`);
  
  // Create generator
  const generator = new Start11GeneratorService(players);
  
  // Test with different budgets
  const budgets = [50000000, 100000000, 200000000, 500000000]; // 50M, 100M, 200M, 500M
  
  for (const budget of budgets) {
    console.log(`\n=== TESTING WITH BUDGET: ${budget.toLocaleString()} € ===`);
    
    try {
      const result = await generator.generateOptimalStart11({
        maxBudget: budget,
        preferredFormation: '4-3-3'
      });
      
      console.log('✅ SUCCESS!');
      console.log('Formation:', result.team.formation);
      console.log('Total Cost:', result.team.totalCost.toLocaleString(), '€');
      
      // Check goalkeeper
      const gkPlayer = Object.values(result.team.players).find(p => p.position === 'GK');
      if (gkPlayer) {
        const cost = gkPlayer.marketValue || gkPlayer.kosten || 0;
        console.log(`GK: ${gkPlayer.firstName} ${gkPlayer.name} - ${cost.toLocaleString()} €`);
        
        if (gkPlayer.name === 'Neuer') {
          console.log('❌ PROBLEM: Neuer was selected!');
        }
      }
      
      break; // Stop at first successful generation
      
    } catch (error) {
      console.log('❌ FAILED:', (error as Error).message);
    }
  }
  
  // Analyze cheapest possible team
  console.log('\n=== CHEAPEST POSSIBLE TEAM ANALYSIS ===');
  
  const positions = ['GK', 'DEF', 'MID', 'FWD'];
  let totalMinCost = 0;
  
  for (const position of positions) {
    const positionPlayers = players.filter((p: any) => p.position === position && (generator as any).isPlayerEligible(p));
    const cheapest = positionPlayers.sort((a: any, b: any) => {
      const costA = a.marketValue || a.kosten || 0;
      const costB = b.marketValue || b.kosten || 0;
      return costA - costB;
    });
    
    console.log(`\n${position} (${positionPlayers.length} eligible players):`);
    
    if (cheapest.length > 0) {
      const requiredCount = position === 'DEF' ? 4 : position === 'MID' ? 3 : position === 'FWD' ? 3 : 1;
      
      for (let i = 0; i < Math.min(requiredCount, cheapest.length); i++) {
        const player = cheapest[i];
        const cost = player.marketValue || player.kosten || 0;
        console.log(`  ${i + 1}. ${player.firstName} ${player.name} - ${cost.toLocaleString()} €`);
        totalMinCost += cost;
      }
    } else {
      console.log('  ❌ No eligible players found!');
    }
  }
  
  console.log(`\nMinimum possible team cost: ${totalMinCost.toLocaleString()} €`);
}

debugBudgetIssue().catch(console.error);
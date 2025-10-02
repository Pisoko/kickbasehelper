import { Start11GeneratorService } from './lib/services/Start11GeneratorService';
import fs from 'fs';

async function debugFullGeneration() {
  console.log('=== DEBUG: Full Start11 Generation ===');
  
  // Load real player data
  const spieltagData = JSON.parse(fs.readFileSync('./data/2025/spieltag_5.json', 'utf8'));
  const players = spieltagData.players;
  
  console.log(`Total players loaded: ${players.length}`);
  
  // Create generator
  const generator = new Start11GeneratorService(players);
  
  // Generate Start11
  console.log('\n=== GENERATING START11 ===');
  const result = await generator.generateOptimalStart11({
    maxBudget: 200000000, // 200M budget
    preferredFormation: '4-3-3'
  });
  
  console.log('\n=== RESULT ===');
  console.log('Formation:', result.team.formation);
  console.log('Total Cost:', result.team.totalCost.toLocaleString(), '€');
  
  console.log('\n=== SELECTED PLAYERS ===');
  Object.entries(result.team.players).forEach(([positionId, player]) => {
    const cost = player.marketValue || player.kosten || 0;
    const xFactor = (player as any).xFactor || 0;
    console.log(`${positionId}: ${player.firstName} ${player.name} (${player.position}) - ${cost.toLocaleString()} € - X-Factor: ${xFactor.toFixed(1)}`);
  });
  
  // Check specifically for goalkeepers
  const gkPlayer = Object.values(result.team.players).find(p => p.position === 'GK');
  if (gkPlayer) {
    console.log('\n=== GOALKEEPER ANALYSIS ===');
    console.log('Selected GK:', `${gkPlayer.firstName} ${gkPlayer.name}`);
    console.log('Cost:', (gkPlayer.marketValue || gkPlayer.kosten || 0).toLocaleString(), '€');
    console.log('Average Points:', gkPlayer.averagePoints || 'N/A');
    console.log('Status:', gkPlayer.status);
    
    // Check if Neuer or Hein was selected
    if (gkPlayer.name === 'Neuer') {
      console.log('❌ PROBLEM: Neuer was selected instead of cheaper options!');
    } else if (gkPlayer.name === 'Hein') {
      console.log('✅ Hein was selected (good choice)');
    } else {
      console.log('ℹ️ Neither Neuer nor Hein was selected');
    }
  }
}

debugFullGeneration().catch(console.error);
import { Start11GeneratorService } from './lib/services/Start11GeneratorService';
import { FORMATIONS } from './lib/arena-types';
import fs from 'fs';

async function debugPhase1() {
  console.log('=== DEBUG: Phase 1 Team Generation ===');
  
  // Load real data
  const spieltagData = JSON.parse(fs.readFileSync('./data/2025/spieltag_5.json', 'utf8'));
  const players = spieltagData.players;
  
  console.log(`Total players loaded: ${players.length}`);
  
  const service = new Start11GeneratorService(players);
  
  // Test with 4-3-3 formation
  const formation = FORMATIONS['4-3-3'];
  console.log(`\nTesting formation: ${formation.name}`);
  console.log(`Positions needed:`, formation.positions.map(p => `${p.id} (${p.position})`));
  
  // Filter available players (same logic as in service)
  const availablePlayers = players.filter((player: any) => {
    const statusCodes = [0, 2, 4]; // Available status codes
    return statusCodes.includes(player.status);
  });
  
  console.log(`\nAvailable players: ${availablePlayers.length}`);
  
  // Group by position
  const playersByPosition: Record<string, any[]> = {
    'GK': [],
    'DEF': [],
    'MID': [],
    'FWD': []
  };
  
  availablePlayers.forEach((player: any) => {
    if (playersByPosition[player.position]) {
      playersByPosition[player.position].push(player);
    }
  });
  
  console.log('\nPlayers by position:');
  Object.entries(playersByPosition).forEach(([pos, players]) => {
    console.log(`  ${pos}: ${players.length} players`);
  });
  
  // Simulate Phase 1 logic
  const selectedPlayers: { [positionId: string]: any } = {};
  let totalCost = 0;
  const maxBudget = 50000000; // 50M budget
  
  // Get positions that need to be filled
  const positionsToFill = formation.positions;
  
  // Group positions by type
  const positionsByType: Record<string, typeof formation.positions> = {
    'GK': [],
    'DEF': [],
    'MID': [],
    'FWD': []
  };
  
  positionsToFill.forEach(pos => {
    positionsByType[pos.position].push(pos);
  });
  
  console.log('\nPositions to fill by type:');
  Object.entries(positionsByType).forEach(([type, positions]) => {
    console.log(`  ${type}: ${positions.length} positions (${positions.map(p => p.id).join(', ')})`);
  });
  
  // Sort position types by scarcity
  const positionTypes = Object.keys(positionsByType).sort((a, b) => {
    const aAvailable = playersByPosition[a]?.length || 0;
    const bAvailable = playersByPosition[b]?.length || 0;
    return aAvailable - bAvailable;
  });
  
  console.log(`\nFilling positions in order of scarcity: ${positionTypes.join(' -> ')}`);
  
  // Phase 1: Fill all positions
  for (const positionType of positionTypes) {
    const positions = positionsByType[positionType];
    const availablePlayers = [...playersByPosition[positionType]]; // Copy array
    
    console.log(`\n--- Filling ${positionType} positions ---`);
    console.log(`Available players: ${availablePlayers.length}`);
    console.log(`Positions to fill: ${positions.length}`);
    
    for (const position of positions) {
      console.log(`\nFilling position: ${position.id} (${position.position})`);
      console.log(`Remaining budget: ${(maxBudget - totalCost).toLocaleString()} €`);
      console.log(`Available players for this position: ${availablePlayers.length}`);
      
      // Find cheapest affordable player
      let cheapestPlayer = null;
      let lowestCost = Infinity;
      
      for (const player of availablePlayers) {
        const cost = player.marketValue || player.kosten || 0;
        const isAlreadySelected = Object.values(selectedPlayers).some(selected => selected.id === player.id);
        
        if (!isAlreadySelected && cost <= (maxBudget - totalCost) && cost < lowestCost) {
          cheapestPlayer = player;
          lowestCost = cost;
        }
      }
      
      if (!cheapestPlayer) {
        console.log(`❌ FAILED: Cannot find affordable player for ${position.id}`);
        console.log(`Cheapest available player costs more than remaining budget`);
        
        // Show cheapest 3 players for debugging
        const sortedByPrice = availablePlayers
          .filter(p => !Object.values(selectedPlayers).some(selected => selected.id === p.id))
          .sort((a, b) => (a.marketValue || a.kosten || 0) - (b.marketValue || b.kosten || 0))
          .slice(0, 3);
        
        console.log('Cheapest available players:');
        sortedByPrice.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name} - ${(p.marketValue || p.kosten || 0).toLocaleString()} €`);
        });
        
        return;
      }
      
      console.log(`✅ Selected: ${cheapestPlayer.name} - ${lowestCost.toLocaleString()} €`);
      
      selectedPlayers[position.id] = cheapestPlayer;
      totalCost += lowestCost;
      
      // Remove selected player from available players
      const playerIndex = availablePlayers.findIndex(p => p.id === cheapestPlayer.id);
      if (playerIndex > -1) {
        availablePlayers.splice(playerIndex, 1);
      }
    }
  }
  
  console.log('\n=== PHASE 1 COMPLETED SUCCESSFULLY ===');
  console.log(`Total cost: ${totalCost.toLocaleString()} €`);
  console.log(`Remaining budget: ${(maxBudget - totalCost).toLocaleString()} €`);
  console.log('\nSelected team:');
  Object.entries(selectedPlayers).forEach(([posId, player]) => {
    console.log(`  ${posId}: ${player.name} - ${(player.marketValue || player.kosten || 0).toLocaleString()} €`);
  });
}

debugPhase1().catch(console.error);
import { Start11GeneratorService } from './lib/services/Start11GeneratorService';
import fs from 'fs';

async function debugOffPlayers() {
  console.log('=== DEBUG: Offensive Players Analysis ===');
  
  // Load real player data
  const spieltagData = JSON.parse(fs.readFileSync('./data/2025/spieltag_5.json', 'utf8'));
  const players = spieltagData.players;
  
  // Find all OFF players
  const offPlayers = players.filter((p: any) => p.position === 'OFF');
  console.log(`Total OFF players: ${offPlayers.length}`);
  
  // Group by status
  const statusGroups: { [status: string]: any[] } = {};
  offPlayers.forEach((player: any) => {
    const status = player.status || 'undefined';
    if (!statusGroups[status]) {
      statusGroups[status] = [];
    }
    statusGroups[status].push(player);
  });
  
  console.log('\n=== OFF PLAYERS BY STATUS ===');
  Object.entries(statusGroups).forEach(([status, players]) => {
    console.log(`Status ${status}: ${players.length} players`);
    
    // Show first 3 players as examples
    players.slice(0, 3).forEach((player: any) => {
      const cost = player.marketValue || player.kosten || 0;
      console.log(`  - ${player.firstName} ${player.name} (${player.verein}) - ${cost.toLocaleString()} € - Status: ${player.status} - Injured: ${player.isInjured}`);
    });
    
    if (players.length > 3) {
      console.log(`  ... and ${players.length - 3} more`);
    }
  });
  
  // Test eligibility
  const generator = new Start11GeneratorService(players);
  
  console.log('\n=== ELIGIBILITY TEST ===');
  Object.entries(statusGroups).forEach(([status, players]) => {
    const eligible = players.filter((p: any) => (generator as any).isPlayerEligible(p));
    console.log(`Status ${status}: ${eligible.length}/${players.length} eligible`);
    
    if (eligible.length > 0) {
      console.log('  Eligible players:');
      eligible.slice(0, 3).forEach((player: any) => {
        const cost = player.marketValue || player.kosten || 0;
        console.log(`    - ${player.firstName} ${player.name} - ${cost.toLocaleString()} €`);
      });
    }
  });
  
  // Check our isPlayerEligible rules
  console.log('\n=== CURRENT ELIGIBILITY RULES ===');
  console.log('Allowed status codes: 0, 2, 4');
  console.log('Blocked status codes: 1, 8, 16');
}

debugOffPlayers().catch(console.error);
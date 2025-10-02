import fs from 'fs';

async function debugStatusCodes() {
  console.log('=== DEBUG: Player Status Codes ===');
  
  // Load real data
  const spieltagData = JSON.parse(fs.readFileSync('./data/2025/spieltag_5.json', 'utf8'));
  const players = spieltagData.players;
  
  console.log(`Total players loaded: ${players.length}`);
  
  // Analyze status codes
  const statusCounts: Record<number, number> = {};
  const statusExamples: Record<number, any[]> = {};
  
  players.forEach((player: any) => {
    const status = player.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    
    if (!statusExamples[status]) {
      statusExamples[status] = [];
    }
    
    if (statusExamples[status].length < 3) {
      statusExamples[status].push({
        name: player.name,
        position: player.position,
        cost: player.marketValue || player.kosten || 0,
        verein: player.verein
      });
    }
  });
  
  console.log('\n=== STATUS CODE DISTRIBUTION ===');
  Object.entries(statusCounts)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([status, count]) => {
      console.log(`Status ${status}: ${count} players`);
      
      // Show examples
      const examples = statusExamples[parseInt(status)];
      examples.forEach((player, i) => {
        console.log(`  ${i + 1}. ${player.name} (${player.position}) - ${player.cost.toLocaleString()} € - ${player.verein}`);
      });
      console.log('');
    });
  
  // Current filter logic
  const allowedStatusCodes = [0, 2, 4];
  console.log(`\n=== CURRENT FILTER LOGIC ===`);
  console.log(`Allowed status codes: ${allowedStatusCodes.join(', ')}`);
  
  const filteredPlayers = players.filter((player: any) => allowedStatusCodes.includes(player.status));
  console.log(`Players after filtering: ${filteredPlayers.length}`);
  
  if (filteredPlayers.length === 0) {
    console.log('\n❌ NO PLAYERS PASS THE STATUS FILTER!');
    console.log('This explains why team generation fails.');
    
    // Suggest alternative status codes
    const totalPlayersWithOtherStatus = Object.entries(statusCounts)
      .filter(([status]) => !allowedStatusCodes.includes(parseInt(status)))
      .reduce((sum, [, count]) => sum + count, 0);
    
    console.log(`\nPlayers with other status codes: ${totalPlayersWithOtherStatus}`);
    console.log('Consider adjusting the status filter to include more players.');
  } else {
    console.log('\n✅ Status filter is working correctly.');
    
    // Show distribution by position
    const positionCounts: Record<string, number> = {};
    filteredPlayers.forEach((player: any) => {
      positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
    });
    
    console.log('\nFiltered players by position:');
    Object.entries(positionCounts).forEach(([pos, count]) => {
      console.log(`  ${pos}: ${count} players`);
    });
  }
}

debugStatusCodes().catch(console.error);
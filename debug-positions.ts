import fs from 'fs';

async function debugPositions() {
  console.log('=== DEBUG: Available Positions ===');
  
  // Load real player data
  const spieltagData = JSON.parse(fs.readFileSync('./data/2025/spieltag_5.json', 'utf8'));
  const players = spieltagData.players;
  
  // Group by position
  const positionGroups: { [position: string]: any[] } = {};
  players.forEach((player: any) => {
    const position = player.position || 'undefined';
    if (!positionGroups[position]) {
      positionGroups[position] = [];
    }
    positionGroups[position].push(player);
  });
  
  console.log('\n=== PLAYERS BY POSITION ===');
  Object.entries(positionGroups).forEach(([position, players]) => {
    console.log(`${position}: ${players.length} players`);
    
    // Show first 3 players as examples
    players.slice(0, 3).forEach((player: any) => {
      const cost = player.marketValue || player.kosten || 0;
      console.log(`  - ${player.firstName} ${player.name} (${player.verein}) - ${cost.toLocaleString()} €`);
    });
    
    if (players.length > 3) {
      console.log(`  ... and ${players.length - 3} more`);
    }
  });
  
  // Check what the arena types expect
  console.log('\n=== EXPECTED POSITIONS IN ARENA TYPES ===');
  console.log('Expected: GK, DEF, MID, OFF');
  console.log('Found:', Object.keys(positionGroups).join(', '));
}

debugPositions().catch(console.error);
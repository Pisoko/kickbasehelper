import { Start11GeneratorService } from './lib/services/Start11GeneratorService';
import fs from 'fs';

async function debugNeuervHein() {
  console.log('=== DEBUG: Neuer vs Hein Selection ===');
  
  // Load real player data
  const spieltagData = JSON.parse(fs.readFileSync('./data/2025/spieltag_5.json', 'utf8'));
  const players = spieltagData.players;
  
  // Find Neuer and Hein
  const neuer = players.find((p: any) => p.name === 'Neuer' && p.firstName === 'Manuel');
  const hein = players.find((p: any) => p.name === 'Hein' && p.firstName === 'Karl');
  
  console.log('\n=== PLAYER DATA ===');
  console.log('Neuer:', {
    id: neuer?.id,
    name: `${neuer?.firstName} ${neuer?.name}`,
    position: neuer?.position,
    kosten: neuer?.kosten,
    marketValue: neuer?.marketValue,
    averagePoints: neuer?.averagePoints,
    status: neuer?.status,
    isInjured: neuer?.isInjured
  });
  
  console.log('Hein:', {
    id: hein?.id,
    name: `${hein?.firstName} ${hein?.name}`,
    position: hein?.position,
    kosten: hein?.kosten,
    marketValue: hein?.marketValue,
    averagePoints: hein?.averagePoints,
    status: hein?.status,
    isInjured: hein?.isInjured
  });
  
  // Test eligibility
  const generator = new Start11GeneratorService(players);
  
  console.log('\n=== ELIGIBILITY TEST ===');
  console.log('Neuer eligible:', (generator as any).isPlayerEligible(neuer));
  console.log('Hein eligible:', (generator as any).isPlayerEligible(hein));
  
  // Test cheapest player selection
  const gkPlayers = players.filter((p: any) => p.position === 'GK');
  const eligibleGKs = gkPlayers.filter((p: any) => (generator as any).isPlayerEligible(p));
  
  console.log('\n=== GOALKEEPER ANALYSIS ===');
  console.log(`Total GK players: ${gkPlayers.length}`);
  console.log(`Eligible GK players: ${eligibleGKs.length}`);
  
  // Sort by cost
  const sortedByPrice = eligibleGKs.sort((a: any, b: any) => {
    const costA = a.marketValue || a.kosten || 0;
    const costB = b.marketValue || b.kosten || 0;
    return costA - costB;
  });
  
  console.log('\n=== TOP 5 CHEAPEST ELIGIBLE GOALKEEPERS ===');
  sortedByPrice.slice(0, 5).forEach((gk: any, index: number) => {
    const cost = gk.marketValue || gk.kosten || 0;
    console.log(`${index + 1}. ${gk.firstName} ${gk.name} (${gk.verein}) - ${cost.toLocaleString()} €`);
  });
  
  // Test the actual findCheapestAffordablePlayer method
  const cheapest = (generator as any).findCheapestAffordablePlayer(
    eligibleGKs,
    {}, // no selected players
    100000000 // high budget
  );
  
  console.log('\n=== CHEAPEST PLAYER SELECTION ===');
  console.log('Selected cheapest GK:', cheapest ? `${cheapest.firstName} ${cheapest.name} - ${(cheapest.marketValue || cheapest.kosten || 0).toLocaleString()} €` : 'None');
}

debugNeuervHein().catch(console.error);
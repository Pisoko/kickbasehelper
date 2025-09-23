#!/usr/bin/env tsx

import { readCache, validateBundesligaTeamMembership, validatePlayerDataWithTeamCheck } from '../lib/data';
import type { Player } from '../lib/types';

/**
 * Test script to verify team validation logic
 * This script tests that only players from the 18 official Bundesliga teams are included
 */
async function testTeamValidation() {
  console.log('🧪 Testing Team Validation Logic');
  console.log('=================================\n');

  try {
    // Read cached player data
    const cache = readCache(1);
    if (!cache) {
      console.error('❌ No cached data found. Please run data fetching first.');
      process.exit(1);
    }

    const originalPlayers = cache.players;
    console.log(`📊 Original player count: ${originalPlayers.length}`);

    // Test Bundesliga team membership validation
    console.log('\n🔍 Testing Bundesliga team membership validation...');
    const validatedPlayers = validateBundesligaTeamMembership(originalPlayers);
    
    console.log(`✅ Validated player count: ${validatedPlayers.length}`);
    console.log(`🚫 Filtered out: ${originalPlayers.length - validatedPlayers.length} players`);

    // Test complete validation with team check
    console.log('\n🔍 Testing complete validation with team check...');
    const completelyValidatedPlayers = validatePlayerDataWithTeamCheck(originalPlayers);
    
    console.log(`✅ Completely validated player count: ${completelyValidatedPlayers.length}`);

    // Analyze teams represented
    console.log('\n📋 Teams represented in validated data:');
    const teamsWithPlayers = new Map<string, number>();
    
    validatedPlayers.forEach(player => {
      const team = player.verein?.trim() || 'Unknown';
      teamsWithPlayers.set(team, (teamsWithPlayers.get(team) || 0) + 1);
    });

    // Sort teams by player count
    const sortedTeams = Array.from(teamsWithPlayers.entries())
      .sort(([,a], [,b]) => b - a);

    sortedTeams.forEach(([team, count], index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${team}: ${count} players`);
    });

    console.log(`\n📈 Summary:`);
    console.log(`   • Total teams: ${teamsWithPlayers.size}/18`);
    console.log(`   • Total players: ${validatedPlayers.length}`);
    console.log(`   • Average players per team: ${Math.round(validatedPlayers.length / teamsWithPlayers.size)}`);

    // Check for any invalid teams (should be none after validation)
    const validBundesligaTeams = new Set([
      'Bayern München', 'Borussia Dortmund', 'Eintracht Frankfurt', 'SC Freiburg',
      'Hamburger SV', 'Bayer 04 Leverkusen', 'VfB Stuttgart', 'Werder Bremen',
      'VfL Wolfsburg', 'FC Augsburg', 'TSG Hoffenheim', 'Borussia Mönchengladbach',
      'FSV Mainz 05', '1. FC Köln', 'FC St. Pauli', '1. FC Union Berlin',
      'RB Leipzig', '1. FC Heidenheim'
    ]);

    const teamNameVariations = new Map([
      ['Bayern', 'Bayern München'],
      ['Dortmund', 'Borussia Dortmund'],
      ['Frankfurt', 'Eintracht Frankfurt'],
      ['Freiburg', 'SC Freiburg'],
      ['Hamburg', 'Hamburger SV'],
      ['HSV', 'Hamburger SV'],
      ['Leverkusen', 'Bayer 04 Leverkusen'],
      ['Stuttgart', 'VfB Stuttgart'],
      ['Bremen', 'Werder Bremen'],
      ['Wolfsburg', 'VfL Wolfsburg'],
      ['Augsburg', 'FC Augsburg'],
      ['Hoffenheim', 'TSG Hoffenheim'],
      ['Gladbach', 'Borussia Mönchengladbach'],
      ['Mönchengladbach', 'Borussia Mönchengladbach'],
      ['Mainz', 'FSV Mainz 05'],
      ['Köln', '1. FC Köln'],
      ['St. Pauli', 'FC St. Pauli'],
      ['Union Berlin', '1. FC Union Berlin'],
      ['Leipzig', 'RB Leipzig'],
      ['Heidenheim', '1. FC Heidenheim']
    ]);

    console.log('\n🔍 Checking for invalid teams (should be none):');
    let invalidTeamsFound = false;
    
    for (const [team] of teamsWithPlayers) {
      const normalizedTeam = teamNameVariations.get(team) || team;
      if (!validBundesligaTeams.has(normalizedTeam)) {
        console.log(`❌ Invalid team found: "${team}" (normalized: "${normalizedTeam}")`);
        invalidTeamsFound = true;
      }
    }

    if (!invalidTeamsFound) {
      console.log('✅ No invalid teams found - validation working correctly!');
    }

    // Show normalized team mapping for clarity
    console.log('\n📝 Team name normalization:');
    const uniqueNormalizedTeams = new Set<string>();
    for (const [team] of teamsWithPlayers) {
      const normalizedTeam = teamNameVariations.get(team) || team;
      if (validBundesligaTeams.has(normalizedTeam)) {
        uniqueNormalizedTeams.add(normalizedTeam);
      }
    }
    
    console.log(`   • Unique normalized teams: ${uniqueNormalizedTeams.size}/18`);
    Array.from(uniqueNormalizedTeams).sort().forEach((team, index) => {
      console.log(`   ${(index + 1).toString().padStart(2)}. ${team}`);
    });

    console.log('\n🎉 Team validation test completed successfully!');

  } catch (error) {
    console.error('❌ Error during team validation test:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testTeamValidation();
}

export { testTeamValidation };
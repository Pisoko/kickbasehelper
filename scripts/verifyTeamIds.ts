import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from both .env and .env.local
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

interface TeamResponse {
  id: string;
  name: string;
  shortName?: string;
  logo?: string;
  playersCount?: number;
  teamType?: 'men' | 'women' | 'unknown';
  samplePlayers?: string[];
}

class TeamIdVerifier {
  private readonly baseUrl = 'https://api.kickbase.com';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.KICKBASE_KEY || '';
    if (!this.apiKey) {
      throw new Error('KICKBASE_KEY environment variable is required');
    }
  }

  private async request<T>(path: string): Promise<T | null> {
    try {
      console.log(`Testing: ${this.baseUrl}${path}`);
      
      const response = await fetch(`${this.baseUrl}${path}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        console.log(`❌ ID ${path.split('/')[4]}: HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.log(`❌ ID ${path.split('/')[4]}: Error - ${error}`);
      return null;
    }
  }

  async verifyTeamId(teamId: string): Promise<TeamResponse | null> {
    // Try the teamcenter endpoint first as it seems to work
    const data = await this.request<any>(`/v4/competitions/1/teams/${teamId}/teamcenter`);
    
    if (data && data.tn) {
      // Extract player information for team type analysis
      const playersCount = data.p || 0;
      const samplePlayers: string[] = [];
      let teamType: 'men' | 'women' | 'unknown' = 'unknown';
      
      // Get sample player names if available
      if (data.it && Array.isArray(data.it) && data.it.length > 0) {
        // Get first 5 player names for analysis
        samplePlayers.push(...data.it.slice(0, 5).map((player: any) => player.n || 'Unknown'));
        
        // Simple heuristic: if we have known men's Bundesliga players, classify as men's team
        const knownMensPlayers = [
          'Neuer', 'Kimmich', 'Müller', 'Lewandowski', 'Haaland', 'Bellingham', 'Wirtz',
          'Brandt', 'Anton', 'Sabitzer', 'Kobel', 'Özcan', // Dortmund players
          'Koch', 'Batshuayi', 'Burkardt', 'Knauff', 'Collins', // Frankfurt players
          'Ginter', 'Grifo', 'Kübler', 'Eggestein', 'Jung', // Freiburg players
          'Glatzel', 'Muheim', 'Königsdörffer', 'Elfadli', // Hamburg players
          'Flekken', 'Hofmann', 'Schick', 'Tapsoba', 'Tillman', // Leverkusen players
          'Undav', 'Führich', 'Mittelstädt', 'Demirović', 'Karazor', // Stuttgart players
          'Weiser', 'Ducksch', 'Stage', 'Friedl', 'Groß', // Bremen players
          'Sesko', 'Xavi', 'Henrichs', 'Gulácsi', 'Baku', 'Baumgartner', // Leipzig players
          'Mainka', 'Busch', 'Gimber', 'Föhrenbach', 'Dorsch', // Heidenheim players
          'Tah', 'Goretzka', 'Gnabry', 'Upamecano', 'Laimer' // More Bayern players
        ];
        
        const hasKnownMensPlayer = samplePlayers.some(name => 
          knownMensPlayers.some(known => name.includes(known))
        );
        
        if (hasKnownMensPlayer) {
          teamType = 'men';
        } else if (playersCount > 500) {
          // Teams with many players are likely men's teams (Bundesliga teams typically have 1000+ players)
          teamType = 'men';
        } else if (playersCount > 0) {
          // For teams with players but no known men's players, mark as unknown for manual review
          teamType = 'unknown';
        }
      }
      
      return {
        id: teamId,
        name: data.tn,
        shortName: data.tn, // Use full name as short name for now
        logo: data.tim || undefined,
        playersCount,
        teamType,
        samplePlayers
      };
    }
    
    return null;
  }

  async verifyCurrentTeamIds() {
    console.log('🔍 Verifying current team IDs...\n');
    
    // Current team mapping from KickbaseAdapter.ts - Legacy IDs for 2025/26 Bundesliga
    const currentTeamMap: Record<string, string> = {
      '2': 'Bayern München',         // Bayern (Legacy ID)
      '3': 'Borussia Dortmund',      // Dortmund
      '4': 'Eintracht Frankfurt',    // Frankfurt (Legacy ID)
      '5': 'SC Freiburg',            // Freiburg (Legacy ID)
      '6': 'Hamburger SV',           // Hamburg (Promoted for 2025/26)
      '7': 'Bayer 04 Leverkusen',    // Leverkusen (Legacy ID)
      '8': 'FC Schalke 04',          // Schalke (relegated)
      '9': 'VfB Stuttgart',          // Stuttgart
      '10': 'Werder Bremen',         // Bremen (Legacy ID)
      '11': 'VfL Wolfsburg',         // Wolfsburg (Legacy ID)
      '12': 'TSG Hoffenheim',        // Hoffenheim (Legacy ID)
      '13': 'FC Augsburg',           // Augsburg
      '14': 'VfL Bochum',            // Bochum (relegated)
      '15': 'Borussia Mönchengladbach', // M'gladbach
      '18': 'FSV Mainz 05',          // Mainz
      '28': '1. FC Köln',            // Köln (Promoted for 2025/26)
      '39': 'FC St. Pauli',          // St. Pauli (Promoted for 2025/26)
      '40': '1. FC Union Berlin',    // Union Berlin
      '43': 'RB Leipzig',            // Leipzig (Legacy ID)
      '50': '1. FC Heidenheim'       // Heidenheim (only ID 50)
    } as const;

    const results: { [key: string]: TeamResponse | null } = {};
    
    for (const [id, expectedName] of Object.entries(currentTeamMap)) {
      console.log(`Testing ID ${id} (expected: ${expectedName})...`);
      const team = await this.verifyTeamId(id);
      
      if (team) {
        console.log(`✅ ID ${id}: ${team.name} (${team.shortName})`);
        if (team.name !== expectedName) {
          console.log(`⚠️  Name mismatch! Expected: ${expectedName}, Got: ${team.name}`);
        }
      }
      
      results[id] = team;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  async discoverTeamIds(startId: number = 1, endId: number = 100) {
    console.log(`\n🔍 Discovering team IDs from ${startId} to ${endId}...\n`);
    
    const validTeams: TeamResponse[] = [];
    
    for (let id = startId; id <= endId; id++) {
      const team = await this.verifyTeamId(id.toString());
      
      if (team) {
        console.log(`✅ Found team ID ${id}: ${team.name} (${team.shortName})`);
        validTeams.push(team);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return validTeams;
  }

  async generateCorrectTeamMapping() {
    console.log('\n📋 Generating correct team mapping...\n');
    
    // First verify current IDs
    const currentResults = await this.verifyCurrentTeamIds();
    
    // Then discover more IDs in a reasonable range
    const discoveredTeams = await this.discoverTeamIds(1, 60);
    
    // Filter for Bundesliga teams (you might need to adjust this logic)
    const bundesligaTeams = discoveredTeams.filter(team => {
      const name = team.name.toLowerCase();
      return (
        name.includes('bayern') ||
        name.includes('dortmund') ||
        name.includes('leipzig') ||
        name.includes('freiburg') ||
        name.includes('frankfurt') ||
        name.includes('gladbach') ||
        name.includes('mönchengladbach') ||
        name.includes('augsburg') ||
        name.includes('hoffenheim') ||
        name.includes('bremen') ||
        name.includes('köln') ||
        name.includes('union') ||
        name.includes('hamburg') ||
        name.includes('pauli') ||
        name.includes('mainz') ||
        name.includes('leverkusen') ||
        name.includes('wolfsburg') ||
        name.includes('heidenheim')
      );
    });

    console.log('\n📊 Bundesliga Teams Found:');
    console.log('================================');
    
    const newTeamMap: Record<string, string> = {};
    
    bundesligaTeams.forEach(team => {
      console.log(`'${team.id}': '${team.name}',`);
      newTeamMap[team.id] = team.name;
    });

    return newTeamMap;
  }
}

// Main execution
async function main() {
  try {
    const verifier = new TeamIdVerifier();
    
    console.log('🔍 Discovering all teams and analyzing men\'s vs women\'s teams...\n');
    
    const allTeams: TeamResponse[] = [];
    const mensTeams: TeamResponse[] = [];
    const womensTeams: TeamResponse[] = [];
    const unknownTeams: TeamResponse[] = [];
    
    // Test a wider range to find all teams
    for (let i = 1; i <= 100; i++) {
      const result = await verifier.verifyTeamId(i.toString());
      if (result) {
        console.log(`✅ ID ${i}: ${result.name} (${result.playersCount} players, type: ${result.teamType})`);
        if (result.samplePlayers && result.samplePlayers.length > 0) {
          console.log(`   Sample players: ${result.samplePlayers.join(', ')}`);
        }
        
        allTeams.push(result);
        
        // Categorize teams
        switch (result.teamType) {
          case 'men':
            mensTeams.push(result);
            break;
          case 'women':
            womensTeams.push(result);
            break;
          default:
            unknownTeams.push(result);
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📊 Team Analysis Summary:');
    console.log('=========================');
    console.log(`Total teams found: ${allTeams.length}`);
    console.log(`Men's teams: ${mensTeams.length}`);
    console.log(`Women's teams: ${womensTeams.length}`);
    console.log(`Unknown/Other teams: ${unknownTeams.length}`);
    
    console.log('\n👨 Men\'s Teams (Recommended for Bundesliga):');
    console.log('=============================================');
    mensTeams.forEach(team => {
      console.log(`ID ${team.id}: ${team.name} (${team.playersCount} players)`);
    });
    
    console.log('\n👩 Women\'s Teams:');
    console.log('=================');
    womensTeams.forEach(team => {
      console.log(`ID ${team.id}: ${team.name} (${team.playersCount} players)`);
    });
    
    console.log('\n❓ Unknown/Other Teams (Manual Review Needed):');
    console.log('===============================================');
    unknownTeams.forEach(team => {
      console.log(`ID ${team.id}: ${team.name} (${team.playersCount} players)`);
      if (team.samplePlayers && team.samplePlayers.length > 0) {
        console.log(`   Sample players: ${team.samplePlayers.join(', ')}`);
      }
    });
    
    console.log('\n🗺️ Recommended Men\'s Team Mapping for KickbaseAdapter.ts:');
    console.log('===========================================================');
    const mensMapping: Record<string, string> = {};
    mensTeams.forEach(team => {
      mensMapping[team.id] = team.name;
    });
    console.log('const teamMap: Record<string, string> = {');
    Object.entries(mensMapping).forEach(([id, name]) => {
      console.log(`  '${id}': '${name}',`);
    });
    console.log('};');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { TeamIdVerifier };
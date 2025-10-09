/**
 * Start11 Generator Service
 * Generates optimal Start11 formations using Dynamic Programming with Budget Discretization
 * Based on the algorithm described in /docs/Algorithmus.md
 */

import { Player } from '@/lib/types';
import { FormationType, Formation, FORMATIONS, ArenaTeam, ARENA_BUDGET } from '@/lib/arena-types';
import { calculateXFactor, calculateXFactorAsync } from '@/lib/positionUtils';

// DP Algorithm Configuration
const DEFAULT_STEP = 100000; // Budget discretization step (100k €)
const MIN_STEP = 50000;      // Minimum step for high precision
const MAX_STEP = 500000;     // Maximum step for performance

// Position mapping from algorithm doc to our system
const POSITION_MAPPING = {
  'TW': 'GK',   // Torwart -> Goalkeeper
  'ABW': 'DEF', // Abwehr -> Defender  
  'MF': 'MID',  // Mittelfeld -> Midfielder
  'ANG': 'FWD'  // Angriff -> Forward
} as const;

// Reverse mapping for algorithm
const REVERSE_POSITION_MAPPING = {
  'GK': 'TW',
  'DEF': 'ABW', 
  'MID': 'MF',
  'FWD': 'ANG'
} as const;

// DP Types
interface DPEntry {
  score: number;
  playerIds: Set<string>;
}

interface FrontierEntry {
  score: number;
  playerIds: Set<string>;
}

interface CombinationResult {
  score: number;
  playerSets: Set<string>[];
  costBucket: number;
}

export interface Start11GenerationOptions {
  /** Existing selected players to keep in the team */
  existingPlayers?: { [positionId: string]: Player };
  /** Only consider players who were in Start11 in their last game */
  onlyStart11Players?: boolean;
  /** Maximum budget constraint */
  maxBudget?: number;
  /** Preferred formation (if not provided, will find optimal formation) */
  preferredFormation?: FormationType;
}

export interface Start11GenerationResult {
  /** Generated team with optimal formation and players */
  team: ArenaTeam;
  /** Alternative formations with their scores */
  alternatives: Array<{
    formation: FormationType;
    score: number;
    totalCost: number;
    players: { [positionId: string]: Player };
  }>;
  /** Generation statistics */
  stats: {
    totalPlayersConsidered: number;
    formationsEvaluated: number;
    generationTimeMs: number;
  };
}

export class Start11GeneratorService {
  private players: Player[] = [];
  private playerLast3GamesData: Map<string, any> = new Map();

  constructor(players: Player[], playerLast3GamesData?: Map<string, any>) {
    this.players = players;
    this.playerLast3GamesData = playerLast3GamesData || new Map();
  }

  /**
   * Build Pareto frontier for a position group using Dynamic Programming
   * @param players Players of specific position
   * @param k Required number of players for this position
   * @param step Budget discretization step
   * @param maxBuckets Maximum number of cost buckets
   * @returns Frontier array where frontier[c] = best solution for cost bucket c with exactly k players
   */
  private buildFrontier(players: Player[], k: number, step: number, maxBuckets: number): FrontierEntry[] {
    // Check if we have enough players
    if (players.length < k) {
      return new Array(maxBuckets + 1).fill(null).map(() => ({
        score: -Infinity,
        playerIds: new Set<string>()
      }));
    }
    
    // Initialize DP array: DP[c] = best solution for cost bucket c with ≤ k players
    const dp: DPEntry[] = new Array(maxBuckets + 1).fill(null).map(() => ({
      score: -Infinity,
      playerIds: new Set<string>()
    }));
    
    // Base case: 0 cost, 0 players, 0 score
    dp[0] = { score: 0, playerIds: new Set<string>() };

    // Process each player
    for (const player of players) {
      const playerCost = Math.floor((player.marketValue || player.kosten || 0) / step);
      const playerScore = calculateXFactor(
        player.punkte_sum || 0,
        player.totalMinutesPlayed || 0,
        player.marketValue || player.kosten || 0,
        player.verein || ''
      );

      if (playerCost > maxBuckets) {
        continue;
      }

      // Create new DP array for this iteration
      const newDp = dp.map(entry => ({
        score: entry.score,
        playerIds: new Set(entry.playerIds)
      }));

      // Update DP table (iterate backwards to avoid using updated values)
      for (let c = maxBuckets - playerCost; c >= 0; c--) {
        const currentEntry = dp[c];
        
        // Skip invalid entries
        if (currentEntry.playerIds.size === 0 && c !== 0) continue;
        if (currentEntry.playerIds.size >= k) continue;

        const newCost = c + playerCost;
        const newScore = currentEntry.score + playerScore;
        const newPlayerCount = currentEntry.playerIds.size + 1;

        // Check if this is a valid and better solution
        if (newCost <= maxBuckets && 
            newPlayerCount <= k && 
            newScore > newDp[newCost].score) {
          newDp[newCost] = {
            score: newScore,
            playerIds: new Set([...currentEntry.playerIds, player.id])
          };
        }
      }

      // Update DP array
      for (let i = 0; i <= maxBuckets; i++) {
        dp[i] = newDp[i];
      }
    }

    // Filter to get frontier with exactly k players
    const frontier: FrontierEntry[] = new Array(maxBuckets + 1).fill(null).map(() => ({
      score: -Infinity,
      playerIds: new Set<string>()
    }));

    let validEntries = 0;
    for (let c = 0; c <= maxBuckets; c++) {
      if (dp[c].playerIds.size === k) {
        frontier[c] = {
          score: dp[c].score,
          playerIds: new Set(dp[c].playerIds)
        };
        validEntries++;
      }
    }

    // If no valid entries found, return empty frontier
    if (validEntries === 0) {
      return frontier;
    }

    // Make frontier monotone (Pareto-optimal)
    let bestSoFar = -Infinity;
    let bestEntry: FrontierEntry = { score: -Infinity, playerIds: new Set<string>() };
    
    for (let c = 0; c <= maxBuckets; c++) {
      if (frontier[c].score > bestSoFar) {
        bestSoFar = frontier[c].score;
        bestEntry = { score: frontier[c].score, playerIds: new Set(frontier[c].playerIds) };
      } else if (frontier[c].score < bestSoFar && frontier[c].score > -Infinity) {
        // Replace with best entry found so far
        frontier[c] = { score: bestEntry.score, playerIds: new Set(bestEntry.playerIds) };
      }
    }

    return frontier;
  }

  /**
   * Combine multiple frontiers using convolution
   * @param frontiers Array of frontiers in order [GK, DEF, MID, FWD]
   * @param maxBuckets Maximum number of cost buckets
   * @returns Best combination result with score, player sets, and cost bucket
   */
  private combineFrontiers(frontiers: FrontierEntry[][], maxBuckets: number): CombinationResult | null {
    // Start with empty combination
    let currentCombinations: Map<number, { score: number; playerSets: Set<string>[] }> = new Map();
    currentCombinations.set(0, { score: 0, playerSets: [] });

    // Process each frontier (position group)
    for (let frontierIndex = 0; frontierIndex < frontiers.length; frontierIndex++) {
      const frontier = frontiers[frontierIndex];
      const nextCombinations: Map<number, { score: number; playerSets: Set<string>[] }> = new Map();

      // Check if frontier has any valid entries
      const hasValidEntries = frontier.some(entry => entry.score > -Infinity && entry.playerIds.size > 0);
      
      if (!hasValidEntries) {
        return null; // Cannot form a valid team if any position group has no valid players
      }

      // For each existing combination
      for (const [costA, combinationA] of currentCombinations) {
        // Try to combine with each entry in current frontier
        for (let c = 0; c <= maxBuckets; c++) {
          const frontierEntry = frontier[c];
          
          // Skip invalid frontier entries
          if (frontierEntry.score === -Infinity || frontierEntry.playerIds.size === 0) {
            continue;
          }

          const totalCost = costA + c;
          if (totalCost > maxBuckets) {
            continue;
          }

          const candidateScore = combinationA.score + frontierEntry.score;
          const candidatePlayerSets = [...combinationA.playerSets, frontierEntry.playerIds];

          // Check if this is better than existing combination for this cost
          const existing = nextCombinations.get(totalCost);
          if (!existing || candidateScore > existing.score) {
            nextCombinations.set(totalCost, {
              score: candidateScore,
              playerSets: candidatePlayerSets
            });
          }
        }
      }

      currentCombinations = nextCombinations;
      
      // If no combinations remain, we cannot form a valid team
      if (currentCombinations.size === 0) {
        return null;
      }
    }

    // Find best combination within budget
    let bestResult: CombinationResult | null = null;
    for (const [costBucket, combination] of currentCombinations) {
      if (!bestResult || combination.score > bestResult.score) {
        bestResult = {
          score: combination.score,
          playerSets: combination.playerSets,
          costBucket
        };
      }
    }

    return bestResult;
  }

  /**
   * Generate optimal Start11 based on X-Factor values using DP algorithm
   */
  async generateOptimalStart11(options: Start11GenerationOptions = {}): Promise<Start11GenerationResult> {
    const startTime = Date.now();
    
    const {
      existingPlayers = {},
      onlyStart11Players = false,
      maxBudget = ARENA_BUDGET,
      preferredFormation
    } = options;

    // Filter available players
    const availablePlayers = this.filterAvailablePlayers(onlyStart11Players, existingPlayers);
    
    // Calculate X-Factor for all players using current odds from Quoten-Tab
    await this.calculateXFactorsForPlayers(availablePlayers);

    let formationsToEvaluate: FormationType[];
    
    if (preferredFormation) {
      formationsToEvaluate = [preferredFormation];
    } else {
      formationsToEvaluate = Object.keys(FORMATIONS) as FormationType[];
    }

    const alternatives: Start11GenerationResult['alternatives'] = [];

    console.log(`[DEBUG] Trying ${formationsToEvaluate.length} formations:`, formationsToEvaluate);
    console.log(`[DEBUG] Available players: ${availablePlayers.length}`);
    console.log(`[DEBUG] Max budget: ${maxBudget}`);

    // Evaluate each formation using DP algorithm
    for (const formationType of formationsToEvaluate) {
      console.log(`[DEBUG] Testing formation: ${formationType}`);
      const formation = FORMATIONS[formationType];
      const result = this.solveDP(formation, availablePlayers, existingPlayers, maxBudget);
      
      if (result) {
        console.log(`[DEBUG] Formation ${formationType} successful: score=${result.score}, cost=${result.totalCost}`);
        alternatives.push({
          formation: formationType,
          score: result.score,
          totalCost: result.totalCost,
          players: result.players
        });
      } else {
        console.log(`[DEBUG] Formation ${formationType} failed - no valid team found`);
      }
    }

    console.log(`[DEBUG] Total alternatives generated: ${alternatives.length}`);

    // Sort alternatives by score (descending)
    alternatives.sort((a, b) => b.score - a.score);
    
    const bestAlternative = alternatives[0];
    
    if (!bestAlternative) {
      throw new Error('Keine gültige Start11 konnte generiert werden');
    }

    const team: ArenaTeam = {
      formation: bestAlternative.formation,
      players: bestAlternative.players,
      totalCost: bestAlternative.totalCost,
      budget: maxBudget
    };

    const endTime = Date.now();

    return {
      team,
      alternatives,
      stats: {
        totalPlayersConsidered: availablePlayers.length,
        formationsEvaluated: formationsToEvaluate.length,
        generationTimeMs: endTime - startTime
      }
    };
  }

  /**
   * Main DP solver function for a specific formation
   */
  private solveDP(
    formation: Formation,
    availablePlayers: Player[],
    existingPlayers: { [positionId: string]: Player },
    maxBudget: number
  ): { score: number; totalCost: number; players: { [positionId: string]: Player } } | null {
    console.log(`[DEBUG] solveDP called with formation positions: ${Object.keys(formation.positions).length}, budget: ${maxBudget}`);
    // Determine budget discretization step
    const step = this.determineBudgetStep(maxBudget);
    const maxBuckets = Math.floor(maxBudget / step);

    // Group players by position type (GK, DEF, MID, FWD)
    const playersByPositionType = this.groupPlayersByPositionType(availablePlayers);
    
    console.log(`[DEBUG] Players by position type:`, Object.fromEntries(
      Object.entries(playersByPositionType).map(([type, players]) => [type, players.length])
    ));

    // Sort each group by X-Factor (descending) - X-Factor should already be calculated
    for (const positionType in playersByPositionType) {
      playersByPositionType[positionType].sort((a, b) => {
        const aXFactor = calculateXFactor(
          a.punkte_sum || 0,
          a.totalMinutesPlayed || 0,
          a.marketValue || a.kosten || 0,
          a.verein || ''
        );
        const bXFactor = calculateXFactor(
          b.punkte_sum || 0,
          b.totalMinutesPlayed || 0,
          b.marketValue || b.kosten || 0,
          b.verein || ''
        );
        return bXFactor - aXFactor;
      });
    }

    // Count required players per position type for this formation
    const positionCounts = this.countPositionsByType(formation);

    // Build frontiers for each position type
    const frontiers: FrontierEntry[][] = [];
    
    for (const positionType of ['GK', 'DEF', 'MID', 'FWD'] as const) {
      const players = playersByPositionType[positionType] || [];
      const requiredCount = positionCounts[positionType];
      
      if (requiredCount > 0) {
        const frontier = this.buildFrontier(players, requiredCount, step, maxBuckets);
        frontiers.push(frontier);
      }
    }

    // Combine frontiers to find optimal solution
    const bestCombination = this.combineFrontiers(frontiers, maxBuckets);
    
    if (!bestCombination) {
      console.log(`[DEBUG] combineFrontiers returned null - no valid combination found`);
      return null;
    }

    console.log(`[DEBUG] Best combination found: score=${bestCombination.score}, costBucket=${bestCombination.costBucket}`);

    // Convert player sets back to formation positions
    const players = this.assignPlayersToFormationPositions(
      formation,
      bestCombination.playerSets,
      availablePlayers,
      existingPlayers
    );

    if (!players) {
      console.log(`[DEBUG] assignPlayersToFormationPositions returned null - could not assign players`);
      return null;
    }

    console.log(`[DEBUG] Players successfully assigned to positions: ${Object.keys(players).length} positions filled`);

    // Calculate total cost
    const totalCost = Object.values(players).reduce((sum, player) => sum + (player.marketValue || player.kosten || 0), 0);



    return {
      score: bestCombination.score,
      totalCost,
      players
    };
  }

  /**
   * Determine optimal budget discretization step
   */
  private determineBudgetStep(maxBudget: number): number {
    // Use adaptive step size based on budget
    if (maxBudget <= 50_000_000) {
      return MIN_STEP; // High precision for smaller budgets
    } else if (maxBudget >= 200_000_000) {
      return MAX_STEP; // Lower precision for very large budgets
    } else {
      return DEFAULT_STEP; // Standard precision
    }
  }

  /**
   * Group players by position type (GK, DEF, MID, FWD)
   */
  private groupPlayersByPositionType(players: Player[]): Record<string, Player[]> {
    const groups: Record<string, Player[]> = {
      GK: [],
      DEF: [],
      MID: [],
      FWD: []
    };

    for (const player of players) {
      const position = player.position;
      
      // Players already have English position types (GK, DEF, MID, FWD)
      // Check if position is directly one of our target types
      if (position === 'GK' || position === 'DEF' || position === 'MID' || position === 'FWD') {
        groups[position].push(player);
      } else {
        // Fallback to mapping for any legacy German positions
        const positionType = POSITION_MAPPING[player.position as keyof typeof POSITION_MAPPING];
        if (positionType && groups[positionType]) {
          groups[positionType].push(player);
        }
      }
    }

    return groups;
  }

  /**
   * Count required players per position type for a formation
   */
  private countPositionsByType(formation: Formation): Record<string, number> {
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };

    for (const position of formation.positions) {
       const positionType = POSITION_MAPPING[position.position as keyof typeof POSITION_MAPPING];
       if (positionType && counts[positionType] !== undefined) {
         counts[positionType]++;
       }
     }

    return counts;
  }

  /**
   * Assign players from position type sets to specific formation positions
   */
  private assignPlayersToFormationPositions(
    formation: Formation,
    playerSets: Set<string>[],
    availablePlayers: Player[],
    existingPlayers: { [positionId: string]: Player }
  ): { [positionId: string]: Player } | null {
    console.log(`[DEBUG] assignPlayersToFormationPositions called with ${playerSets.length} player sets`);
    console.log(`[DEBUG] Formation positions: ${formation.positions.length}`);
    console.log(`[DEBUG] Player sets sizes:`, playerSets.map(set => set.size));
    
    const result: { [positionId: string]: Player } = { ...existingPlayers };
    
    // Create player lookup map
    const playerMap = new Map<string, Player>();
    for (const player of availablePlayers) {
      playerMap.set(player.id, player);
    }

    // Convert player sets to arrays and sort by X-Factor
    const playerArrays = playerSets.map(set => 
      Array.from(set)
        .map(id => playerMap.get(id))
        .filter((player): player is Player => player !== undefined)
        .sort((a, b) => (b.xFactor || 0) - (a.xFactor || 0))
    );

    // Group formation positions by type
    const positionsByType: Record<string, string[]> = { GK: [], DEF: [], MID: [], FWD: [] };
    
    for (const position of formation.positions) {
       const positionType = POSITION_MAPPING[position.position as keyof typeof POSITION_MAPPING];
       if (positionType && positionsByType[positionType]) {
         positionsByType[positionType].push(position.id);
       }
     }

    console.log(`[DEBUG] Positions by type:`, positionsByType);

    // Assign players to positions
    let playerArrayIndex = 0;
    
    for (const positionType of ['GK', 'DEF', 'MID', 'FWD'] as const) {
      const positions = positionsByType[positionType];
      const players = playerArrays[playerArrayIndex];
      
      console.log(`[DEBUG] Processing ${positionType}: ${positions.length} positions, ${players?.length || 0} players available`);
      
      if (positions.length > 0 && players) {
        // Assign best players to positions
        for (let i = 0; i < positions.length && i < players.length; i++) {
          const positionId = positions[i];
          const player = players[i];
          
          console.log(`[DEBUG] Assigning ${player.name} to position ${positionId}`);
          
          // Skip if position already filled by existing player
          if (!result[positionId]) {
            result[positionId] = player;
          }
        }
        playerArrayIndex++;
      } else if (positions.length > 0) {
        console.log(`[DEBUG] No players available for ${positionType} positions!`);
      }
    }

    // Verify all positions are filled
    const unfilledPositions: string[] = [];
    for (const position of formation.positions) {
      if (!result[position.id]) {
        unfilledPositions.push(position.id);
      }
    }

    if (unfilledPositions.length > 0) {
      console.log(`[DEBUG] Failed to fill positions: ${unfilledPositions.join(', ')}`);
      return null; // Failed to fill all positions
    }

    console.log(`[DEBUG] All positions successfully filled!`);
    return result;
  }

  /**
   * Filter players based on constraints
   */
  private filterAvailablePlayers(onlyStart11Players: boolean, existingPlayers: { [positionId: string]: Player }): Player[] {
    const existingPlayerIds = new Set(Object.values(existingPlayers).map(p => p.id));
    
    return this.players.filter(player => {
      // Don't include already selected players
      if (existingPlayerIds.has(player.id)) {
        return false;
      }

      // Apply eligibility check according to defined rules
      if (!this.isPlayerEligible(player)) {
        return false;
      }

      // Filter for Start11 players if required
      if (onlyStart11Players) {
        const playerData = this.playerLast3GamesData.get(player.id);
        if (playerData && playerData.last3Games.length > 0) {
          // Check if player was in Start 11 in their last game
          const lastGameStart11 = playerData.last3Games[playerData.last3Games.length - 1];
          return lastGameStart11 === true;
        } else {
          // If no data available, exclude from Start 11 filter
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Check if player is eligible according to defined rules
   * Based on START11_ALGORITHM_RULES.md
   */
  private isPlayerEligible(player: Player): boolean {
    // Fitness-Check according to status codes
    const statusCode = typeof player.status === 'string' ? parseInt(player.status) : (player.status || 0);
    const isInjured = player.isInjured || [1, 8, 16].includes(statusCode);
    
    // Exclude injured players (Status 1, 8, 16)
    // Status 1: Verletzt 🤕
    // Status 8: Glatt Rot 🟥  
    // Status 16: Gelb-Rote Karte 🟨🟥
    if (isInjured) {
      return false;
    }
    
    // Allow fit players (Status 0) and conditionally available players (Status 2, 4)
    // Status 0: Fit ✅ (vollständig verfügbar)
    // Status 2: Angeschlagen ⚠️ (verfügbar, aber mit reduzierter Wahrscheinlichkeit)
    // Status 4: Aufbautraining 🏃 (verfügbar, aber mit reduzierter Wahrscheinlichkeit)
    
    return true; // Player is eligible if not injured
  }

  /**
   * Group players by their position
   */
  private groupPlayersByPosition(players: Player[]): Record<string, Player[]> {
    const groups: Record<string, Player[]> = {
      'GK': [],
      'DEF': [],
      'MID': [],
      'FWD': []
    };

    players.forEach(player => {
      if (groups[player.position]) {
        groups[player.position].push(player);
      }
    });

    return groups;
  }

  /**
   * Calculate X-Factor for all players using current odds from Quoten-Tab
   */
  private async calculateXFactorsForPlayers(players: Player[]): Promise<void> {
    // Berechne X-Faktoren parallel für bessere Performance
    const xFactorPromises = players.map(async (player) => {
      const xFactor = await calculateXFactorAsync(
        player.punkte_sum || 0,
        player.totalMinutesPlayed || 0,
        player.marketValue || player.kosten || 0,
        player.verein || ''
      );
      (player as any).xFactor = xFactor;
      return { player, xFactor };
    });

    await Promise.all(xFactorPromises);
  }

  /**
   * Sort players by X-Factor within each position
   */
  private sortPlayersByXFactor(playersByPosition: Record<string, Player[]>): void {
    Object.keys(playersByPosition).forEach(position => {
      playersByPosition[position].sort((a, b) => {
        const aXFactor = (a as any).xFactor || 0;
        const bXFactor = (b as any).xFactor || 0;
        return bXFactor - aXFactor; // Descending order
      });
    });
  }

  /**
   * Generate team for a specific formation
   */
  private generateTeamForFormation(
    formation: Formation,
    playersByPosition: Record<string, Player[]>,
    existingPlayers: { [positionId: string]: Player },
    maxBudget: number
  ): { score: number; totalCost: number; players: { [positionId: string]: Player } } | null {
    const selectedPlayers: { [positionId: string]: Player } = { ...existingPlayers };
    let totalCost = Object.values(existingPlayers).reduce((sum, player) => 
      sum + (player.marketValue || player.kosten || 0), 0
    );
    let totalScore = 0;

    // Get positions that need to be filled
    const positionsToFill = formation.positions.filter(pos => !selectedPlayers[pos.id]);
    
    // Group positions by type for better selection
    const positionsByType: Record<string, typeof formation.positions> = {
      'GK': [],
      'DEF': [],
      'MID': [],
      'FWD': []
    };
    
    positionsToFill.forEach(pos => {
      positionsByType[pos.position].push(pos);
    });

    // Phase 1: Fill all positions with affordable players (conservative approach)
    const tempSelectedPlayers = { ...selectedPlayers };
    let tempTotalCost = totalCost;
    const tempPlayersByPosition = JSON.parse(JSON.stringify(playersByPosition));
    
    // Fill positions in order of scarcity (fewer available players first)
    const positionTypes = Object.keys(positionsByType).sort((a, b) => {
      const aAvailable = playersByPosition[a]?.length || 0;
      const bAvailable = playersByPosition[b]?.length || 0;
      return aAvailable - bAvailable;
    });

    // Phase 1: Ensure we can fill all positions
    for (const positionType of positionTypes) {
      const positions = positionsByType[positionType];
      const availablePlayers = tempPlayersByPosition[positionType] || [];
      
      for (const position of positions) {
        // Find cheapest affordable player first to ensure we can fill all positions
        const cheapestPlayer = this.findCheapestAffordablePlayer(
          availablePlayers,
          tempSelectedPlayers,
          maxBudget - tempTotalCost
        );
        
        if (!cheapestPlayer) {
          // Cannot fill this position within budget
          return null;
        }
        
        tempSelectedPlayers[position.id] = cheapestPlayer;
        tempTotalCost += cheapestPlayer.marketValue || cheapestPlayer.kosten || 0;
        
        // Remove selected player from available players
        const playerIndex = availablePlayers.indexOf(cheapestPlayer);
        if (playerIndex > -1) {
          availablePlayers.splice(playerIndex, 1);
        }
      }
    }

    // Phase 2: Optimize by upgrading players to maximize X-Factor within remaining budget
    const remainingBudget = maxBudget - tempTotalCost;
    this.optimizeTeamWithinBudget(tempSelectedPlayers, playersByPosition, remainingBudget, positionsToFill);

    // Calculate final score
    Object.values(tempSelectedPlayers).forEach(player => {
      const xFactor = (player as any).xFactor || calculateXFactor(
        player.punkte_sum || 0,
        player.totalMinutesPlayed || 0,
        player.marketValue || player.kosten || 0,
        player.verein || ''
      );
      totalScore += xFactor;
    });

    // Calculate final cost
    totalCost = Object.values(tempSelectedPlayers).reduce((sum, player) => 
      sum + (player.marketValue || player.kosten || 0), 0
    );

    return {
      score: totalScore,
      totalCost,
      players: tempSelectedPlayers
    };
  }

  /**
   * Find the best affordable player from available players
   * Optimizes for highest X-Factor within budget
   */
  private findBestAffordablePlayer(
    availablePlayers: Player[],
    selectedPlayers: { [positionId: string]: Player },
    remainingBudget: number
  ): Player | null {
    const selectedPlayerIds = new Set(Object.values(selectedPlayers).map(p => p.id));
    
    let bestPlayer: Player | null = null;
    let bestXFactor = -1;
    let bestValueRatio = -1;
    
    for (const player of availablePlayers) {
      const cost = player.marketValue || player.kosten || 0;
      
      if (cost <= remainingBudget && !selectedPlayerIds.has(player.id)) {
        const xFactor = (player as any).xFactor || 0;
        const valueRatio = cost > 0 ? xFactor / cost : xFactor;
        
        // Prioritize by X-Factor first, then by value ratio (X-Factor per cost)
        if (xFactor > bestXFactor || 
           (xFactor === bestXFactor && valueRatio > bestValueRatio)) {
          bestPlayer = player;
          bestXFactor = xFactor;
          bestValueRatio = valueRatio;
        }
      }
    }
    
    return bestPlayer;
  }

  /**
   * Find the cheapest affordable player from available players
   */
  private findCheapestAffordablePlayer(
    availablePlayers: Player[],
    selectedPlayers: { [positionId: string]: Player },
    remainingBudget: number
  ): Player | null {
    const selectedPlayerIds = new Set(Object.values(selectedPlayers).map(p => p.id));
    
    let cheapestPlayer: Player | null = null;
    let lowestCost = Infinity;
    
    for (const player of availablePlayers) {
      const cost = player.marketValue || player.kosten || 0;
      
      if (cost <= remainingBudget && !selectedPlayerIds.has(player.id) && cost < lowestCost) {
        cheapestPlayer = player;
        lowestCost = cost;
      }
    }
    
    return cheapestPlayer;
  }

  /**
   * Optimize team by upgrading players within remaining budget
   */
  private optimizeTeamWithinBudget(
    selectedPlayers: { [positionId: string]: Player },
    playersByPosition: Record<string, Player[]>,
    remainingBudget: number,
    positionsToFill: any[]
  ): void {
    if (remainingBudget <= 0) return;

    // Try to upgrade each position with better players
    for (const position of positionsToFill) {
      const currentPlayer = selectedPlayers[position.id];
      const currentCost = currentPlayer.marketValue || currentPlayer.kosten || 0;
      const currentXFactor = (currentPlayer as any).xFactor || 0;
      
      const availablePlayers = playersByPosition[position.position] || [];
      const selectedPlayerIds = new Set(Object.values(selectedPlayers).map(p => p.id));
      
      // Find better players within the upgrade budget
      const maxUpgradeCost = currentCost + remainingBudget;
      
      for (const player of availablePlayers) {
        const playerCost = player.marketValue || player.kosten || 0;
        const playerXFactor = (player as any).xFactor || 0;
        
        if (!selectedPlayerIds.has(player.id) && 
            playerCost <= maxUpgradeCost && 
            playerXFactor > currentXFactor) {
          
          // This is a better player we can afford
          const upgradeCost = playerCost - currentCost;
          if (upgradeCost <= remainingBudget) {
            selectedPlayers[position.id] = player;
            // Update remaining budget for further optimizations
            remainingBudget -= upgradeCost;
            break; // Move to next position
          }
        }
      }
    }
  }

  /**
   * Get formation recommendations based on available players
   */
  getFormationRecommendations(availablePlayers: Player[]): Array<{
    formation: FormationType;
    suitabilityScore: number;
    reasoning: string;
  }> {
    const playersByPosition = this.groupPlayersByPosition(availablePlayers);
    const recommendations: Array<{
      formation: FormationType;
      suitabilityScore: number;
      reasoning: string;
    }> = [];

    Object.entries(FORMATIONS).forEach(([formationType, formation]) => {
      let suitabilityScore = 0;
      const reasons: string[] = [];

      // Count required positions
      const requiredPositions = formation.positions.reduce((acc, pos) => {
        acc[pos.position] = (acc[pos.position] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Check availability for each position
      Object.entries(requiredPositions).forEach(([position, required]) => {
        const available = playersByPosition[position]?.length || 0;
        const ratio = available / required;
        
        if (ratio >= 2) {
          suitabilityScore += 10; // Excellent availability
          reasons.push(`Viele ${position} verfügbar`);
        } else if (ratio >= 1.5) {
          suitabilityScore += 7; // Good availability
        } else if (ratio >= 1) {
          suitabilityScore += 5; // Adequate availability
        } else {
          suitabilityScore += 0; // Poor availability
          reasons.push(`Wenige ${position} verfügbar`);
        }
      });

      recommendations.push({
        formation: formationType as FormationType,
        suitabilityScore,
        reasoning: reasons.join(', ') || 'Ausgewogene Verfügbarkeit'
      });
    });

    return recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  }
}
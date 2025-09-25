import type { Player, Formation } from './types';
import { FORMATIONS } from './constants';

// Team formation data - in real implementation this would come from API
interface TeamFormation {
  teamId: string;
  formation: Formation;
  confidence: number; // 0-1, how confident we are about this formation
}

// Player status for Start11 calculation
interface PlayerStart11Data {
  id: string;
  teamId: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  isHealthy: boolean;
  minutesPlayed: number;
  appearances: number;
  totalMinutes: number;
  marketValue: number;
  recentForm: number; // 0-1 based on last 3-5 games
  isRegularStarter: boolean;
  averageMinutesPerGame: number;
  lastMatchPoints: number; // Points from last match
  lastMatchMinutes: number; // Minutes played in last match
  averagePoints: number; // Season average points
}

// Goalkeeper hierarchy levels
enum GoalkeeperLevel {
  STARTER = 1,
  BACKUP = 2,
  THIRD_CHOICE = 3
}

interface GoalkeeperHierarchy {
  playerId: string;
  level: GoalkeeperLevel;
  confidence: number; // 0-1
}

/**
 * New Formation-Based Start11 Probability Algorithm
 * 
 * This algorithm considers:
 * 1. Team formations (4-4-2, 3-5-2, etc.)
 * 2. Position scarcity (limited healthy players per position)
 * 3. Goalkeeper hierarchy (starter, backup, third choice)
 * 4. Team constraints (exactly 11 players per team)
 * 5. Last match performance (points and minutes)
 */
export class FormationBasedStart11Calculator {
  private teamFormations: Map<string, TeamFormation> = new Map();
  private goalkeeperHierarchies: Map<string, GoalkeeperHierarchy[]> = new Map();

  /**
   * Calculate Start11 probability for all players
   */
  calculateStart11Probabilities(players: Player[]): Map<string, number> {
    const probabilities = new Map<string, number>();
    
    // Group players by team
    const playersByTeam = this.groupPlayersByTeam(players);
    
    // Calculate probabilities for each team
    for (const [teamId, teamPlayers] of playersByTeam) {
      const teamProbabilities = this.calculateTeamStart11Probabilities(teamId, teamPlayers);
      
      // Add to global probabilities map
      for (const [playerId, probability] of teamProbabilities) {
        probabilities.set(playerId, probability);
      }
    }
    
    return probabilities;
  }

  /**
   * Calculate Start11 probabilities for a specific team
   */
  private calculateTeamStart11Probabilities(teamId: string, players: Player[]): Map<string, number> {
    const probabilities = new Map<string, number>();
    
    // Get team formation
    const formation = this.getTeamFormation(teamId);
    const formationConstraints = FORMATIONS[formation.formation];
    
    // Convert players to Start11 data format
    const playerData = players.map(p => this.convertToStart11Data(p));
    
    // Separate by position
    const goalkeepers = playerData.filter(p => p.position === 'GK');
    const defenders = playerData.filter(p => p.position === 'DEF');
    const midfielders = playerData.filter(p => p.position === 'MID');
    const forwards = playerData.filter(p => p.position === 'FWD');
    
    // Calculate goalkeeper probabilities (special logic)
    const gkProbabilities = this.calculateGoalkeeperProbabilities(teamId, goalkeepers);
    
    // Calculate field player probabilities
    const defProbabilities = this.calculatePositionProbabilities(
      defenders, formationConstraints.DEF, 'DEF'
    );
    const midProbabilities = this.calculatePositionProbabilities(
      midfielders, formationConstraints.MID, 'MID'
    );
    const fwdProbabilities = this.calculatePositionProbabilities(
      forwards, formationConstraints.FWD, 'FWD'
    );
    
    // Combine all probabilities
    const allProbabilities = [
      ...gkProbabilities,
      ...defProbabilities,
      ...midProbabilities,
      ...fwdProbabilities
    ];
    
    // Convert to map and scale to percentage (0-100)
    for (const [playerId, probability] of allProbabilities) {
      probabilities.set(playerId, Math.round(probability * 100 * 100) / 100); // Scale to 0-100 and round to 2 decimals
    }
    
    return probabilities;
  }

  /**
   * Calculate goalkeeper probabilities with hierarchy
   */
  private calculateGoalkeeperProbabilities(
    teamId: string, 
    goalkeepers: PlayerStart11Data[]
  ): [string, number][] {
    const probabilities: [string, number][] = [];
    
    if (goalkeepers.length === 0) {
      return probabilities;
    }
    
    // Detect or use existing goalkeeper hierarchy
    let hierarchy = this.goalkeeperHierarchies.get(teamId);
    if (!hierarchy) {
      hierarchy = this.detectGoalkeeperHierarchy(goalkeepers);
      this.goalkeeperHierarchies.set(teamId, hierarchy);
    }
    
    // Assign probabilities based on hierarchy
    for (const gk of goalkeepers) {
      const hierarchyEntry = hierarchy.find(h => h.playerId === gk.id);
      let baseProbability = 0;
      
      if (hierarchyEntry) {
        switch (hierarchyEntry.level) {
          case GoalkeeperLevel.STARTER:
            baseProbability = 0.85;
            break;
          case GoalkeeperLevel.BACKUP:
            baseProbability = 0.12;
            break;
          case GoalkeeperLevel.THIRD_CHOICE:
            baseProbability = 0.03;
            break;
        }
        
        // Adjust for health and recent performance
        if (!gk.isHealthy) {
          baseProbability = 0;
        } else {
          // Last match performance bonus/malus
          const lastMatchBonus = this.calculateLastMatchBonus(gk);
          baseProbability += lastMatchBonus;
          
          // Form adjustment
          const formAdjustment = (gk.recentForm - 0.5) * 0.1;
          baseProbability += formAdjustment;
        }
      }
      
      probabilities.push([gk.id, Math.max(0, Math.min(0.98, baseProbability))]);
    }
    
    // Normalize probabilities to ensure they sum to ~1 for healthy goalkeepers
    this.normalizeGoalkeeperProbabilities(probabilities);
    
    return probabilities;
  }

  /**
   * Calculate position probabilities for field players
   */
  private calculatePositionProbabilities(
    players: PlayerStart11Data[],
    requiredCount: number,
    position: string
  ): [string, number][] {
    const probabilities: [string, number][] = [];
    
    if (players.length === 0) {
      return probabilities;
    }
    
    // Filter healthy players
    const healthyPlayers = players.filter(p => p.isHealthy);
    
    if (healthyPlayers.length === 0) {
      // All players injured - assign 0 probability
      for (const player of players) {
        probabilities.push([player.id, 0]);
      }
      return probabilities;
    }
    
    // Calculate individual player scores
    const playerScores = healthyPlayers.map(player => ({
      player,
      score: this.calculatePlayerScore(player)
    }));
    
    // Sort by score (highest first)
    playerScores.sort((a, b) => b.score - a.score);
    
    // Assign probabilities based on ranking and competition
    for (let i = 0; i < playerScores.length; i++) {
      const { player, score } = playerScores[i];
      let probability = 0;
      
      if (i < requiredCount) {
        // Top players for required positions
        const positionRank = i + 1;
        const competitionFactor = this.calculateCompetitionFactor(playerScores, i);
        
        // Base probability decreases with rank
        const baseProbability = Math.max(0.6, 0.9 - (positionRank - 1) * 0.1);
        
        // Adjust for competition
        probability = baseProbability * competitionFactor;
        
        // Form bonus/malus
        const formAdjustment = (player.recentForm - 0.5) * 0.2;
        probability += formAdjustment;
        
        // Last match performance bonus
        const lastMatchBonus = this.calculateLastMatchBonus(player);
        probability += lastMatchBonus;
        
      } else {
        // Bench players - lower probability
        const benchPosition = i - requiredCount + 1;
        probability = Math.max(0.05, 0.25 - benchPosition * 0.05);
        
        // Form and last match can still influence bench players
        probability *= (0.5 + player.recentForm * 0.5);
        const lastMatchBonus = this.calculateLastMatchBonus(player) * 0.5; // Reduced impact for bench
        probability += lastMatchBonus;
      }
      
      probabilities.push([player.id, Math.max(0, Math.min(0.98, probability))]);
    }
    
    // Add injured/unavailable players with 0 probability
    for (const player of players) {
      if (!player.isHealthy) {
        probabilities.push([player.id, 0]);
      }
    }
    
    return probabilities;
  }

  /**
   * Calculate individual player score for ranking
   */
  private calculatePlayerScore(player: PlayerStart11Data): number {
    // Base score from playing time
    const playingTimeScore = Math.min(1, player.averageMinutesPerGame / 90);
    
    // Regularity score (how often they play)
    const regularityScore = player.isRegularStarter ? 1 : 0.6;
    
    // Recent form score
    const formScore = player.recentForm;
    
    // Market value score (normalized, higher value = better player typically)
    const marketValueScore = Math.min(1, player.marketValue / 50000000); // 50M as reference
    
    // Last match performance score
    const lastMatchScore = this.calculateLastMatchScore(player);
    
    // Weighted combination
    return (
      playingTimeScore * 0.3 +
      regularityScore * 0.2 +
      formScore * 0.15 +
      marketValueScore * 0.1 +
      lastMatchScore * 0.25 // Significant weight for recent performance
    );
  }

  /**
   * Calculate last match performance score
   */
  private calculateLastMatchScore(player: PlayerStart11Data): number {
    // If player didn't play last match, return neutral score
    if (player.lastMatchMinutes === 0) {
      return 0.3; // Neutral score for non-playing
    }
    
    // Points performance relative to average
    const pointsRatio = player.averagePoints > 0 ? player.lastMatchPoints / player.averagePoints : 0.5;
    const pointsScore = Math.min(1, Math.max(0, pointsRatio));
    
    // Minutes played score (full match = 1.0, partial = proportional)
    const minutesScore = Math.min(1, player.lastMatchMinutes / 90);
    
    // Combine both factors
    return (pointsScore * 0.7 + minutesScore * 0.3);
  }

  /**
   * Calculate last match bonus/malus for probability adjustment
   */
  private calculateLastMatchBonus(player: PlayerStart11Data): number {
    const lastMatchScore = this.calculateLastMatchScore(player);
    
    // Convert to bonus/malus (-0.1 to +0.1)
    return (lastMatchScore - 0.5) * 0.2;
  }

  /**
   * Calculate competition factor based on how close other players are
   */
  private calculateCompetitionFactor(
    playerScores: { player: PlayerStart11Data; score: number }[],
    currentIndex: number
  ): number {
    if (playerScores.length <= 1) return 1;
    
    const currentScore = playerScores[currentIndex].score;
    
    // Look at next few players to see how close the competition is
    const competitionWindow = Math.min(3, playerScores.length - currentIndex - 1);
    if (competitionWindow === 0) return 1;
    
    let totalScoreDiff = 0;
    for (let i = 1; i <= competitionWindow; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < playerScores.length) {
        totalScoreDiff += currentScore - playerScores[nextIndex].score;
      }
    }
    
    const avgScoreDiff = totalScoreDiff / competitionWindow;
    
    // If score difference is large, high confidence (factor close to 1)
    // If score difference is small, lower confidence (factor closer to 0.7)
    return Math.max(0.7, Math.min(1, 0.7 + avgScoreDiff * 3));
  }

  /**
   * Detect goalkeeper hierarchy based on playing time and performance
   */
  private detectGoalkeeperHierarchy(goalkeepers: PlayerStart11Data[]): GoalkeeperHierarchy[] {
    // Sort by playing time and performance
    const sortedGks = goalkeepers
      .map(gk => ({
        gk,
        score: this.calculatePlayerScore(gk)
      }))
      .sort((a, b) => b.score - a.score);
    
    const hierarchy: GoalkeeperHierarchy[] = [];
    
    for (let i = 0; i < sortedGks.length; i++) {
      const { gk, score } = sortedGks[i];
      let level: GoalkeeperLevel;
      let confidence: number;
      
      if (i === 0) {
        level = GoalkeeperLevel.STARTER;
        confidence = 0.9;
      } else if (i === 1) {
        level = GoalkeeperLevel.BACKUP;
        confidence = 0.8;
      } else {
        level = GoalkeeperLevel.THIRD_CHOICE;
        confidence = 0.7;
      }
      
      // Adjust confidence based on score difference
      if (i > 0) {
        const scoreDiff = sortedGks[i-1].score - score;
        if (scoreDiff < 0.1) {
          confidence *= 0.8; // Close competition reduces confidence
        }
      }
      
      hierarchy.push({
        playerId: gk.id,
        level,
        confidence
      });
    }
    
    return hierarchy;
  }

  /**
   * Normalize goalkeeper probabilities
   */
  private normalizeGoalkeeperProbabilities(probabilities: [string, number][]): void {
    const healthyGkProbs = probabilities.filter(([_, prob]) => prob > 0);
    
    if (healthyGkProbs.length === 0) return;
    
    const totalProb = healthyGkProbs.reduce((sum, [_, prob]) => sum + prob, 0);
    
    if (totalProb > 0 && totalProb !== 1) {
      const factor = 1 / totalProb;
      for (let i = 0; i < probabilities.length; i++) {
        if (probabilities[i][1] > 0) {
          probabilities[i][1] *= factor;
        }
      }
    }
  }

  /**
   * Group players by team
   */
  private groupPlayersByTeam(players: Player[]): Map<string, Player[]> {
    const teams = new Map<string, Player[]>();
    
    for (const player of players) {
      const teamId = this.getPlayerTeamId(player);
      if (!teams.has(teamId)) {
        teams.set(teamId, []);
      }
      teams.get(teamId)!.push(player);
    }
    
    return teams;
  }

  /**
   * Get team formation (with fallback to default)
   */
  private getTeamFormation(teamId: string): TeamFormation {
    return this.teamFormations.get(teamId) || {
      teamId,
      formation: '4-4-2', // Default formation
      confidence: 0.5
    };
  }

  /**
   * Convert Player to PlayerStart11Data
   */
  private convertToStart11Data(player: Player): PlayerStart11Data {
    const totalMinutes = player.totalMinutesPlayed || 0;
    const appearances = player.appearances || 1;
    const averageMinutesPerGame = appearances > 0 ? totalMinutes / appearances : 0;
    
    // Extract last match performance from punkte_hist
    const lastMatchPoints = player.punkte_hist && player.punkte_hist.length > 0 
      ? player.punkte_hist[player.punkte_hist.length - 1] || 0 
      : 0;
    
    // Extract last match minutes - use minutesPlayed if available, otherwise estimate
    const lastMatchMinutes = player.minutesPlayed || 0;
    
    return {
      id: player.id,
      teamId: this.getPlayerTeamId(player),
      position: player.position as 'GK' | 'DEF' | 'MID' | 'FWD',
      isHealthy: !player.isInjured && (!player.status || player.status === '0'),
      minutesPlayed: player.minutesPlayed || 0,
      appearances,
      totalMinutes,
      marketValue: player.marketValue || player.kosten || 0,
      recentForm: this.calculateRecentForm(player),
      isRegularStarter: averageMinutesPerGame > 60,
      averageMinutesPerGame,
      lastMatchPoints,
      lastMatchMinutes,
      averagePoints: player.punkte_avg || 0
    };
  }

  /**
   * Calculate recent form based on last few games
   */
  private calculateRecentForm(player: Player): number {
    // Use recent performance history if available
    if (player.punkte_hist && player.punkte_hist.length >= 3) {
      const recentGames = player.punkte_hist.slice(-3); // Last 3 games
      const recentAvg = recentGames.reduce((sum, points) => sum + points, 0) / recentGames.length;
      const seasonAvg = player.punkte_avg || 0;
      
      if (seasonAvg > 0) {
        // Compare recent form to season average
        const formRatio = recentAvg / seasonAvg;
        return Math.min(1, Math.max(0, formRatio));
      }
    }
    
    // Fallback to simplified calculation
    const avgPoints = player.punkte_avg || 0;
    const maxExpectedPoints = 100; // Adjust based on position
    
    return Math.min(1, Math.max(0, avgPoints / maxExpectedPoints));
  }

  /**
   * Get player team ID
   */
  private getPlayerTeamId(player: Player): string {
    // This would extract team ID from player data
    // For now, use team name as fallback
    return player.verein || 'unknown';
  }

  /**
   * Set team formation data (would be called from external data source)
   */
  setTeamFormation(teamId: string, formation: Formation, confidence: number = 0.8): void {
    this.teamFormations.set(teamId, {
      teamId,
      formation,
      confidence
    });
  }

  /**
   * Set goalkeeper hierarchy (would be called from external analysis)
   */
  setGoalkeeperHierarchy(teamId: string, hierarchy: GoalkeeperHierarchy[]): void {
    this.goalkeeperHierarchies.set(teamId, hierarchy);
  }
}

// Export singleton instance
export const formationBasedStart11Calculator = new FormationBasedStart11Calculator();

// Helper function for easy integration
export function calculateFormationBasedStart11Probability(
  players: Player[],
  teamFormations?: Map<string, Formation>
): Map<string, number> {
  const calculator = new FormationBasedStart11Calculator();
  
  // Set team formations if provided
  if (teamFormations) {
    for (const [teamId, formation] of teamFormations) {
      calculator.setTeamFormation(teamId, formation);
    }
  }
  
  return calculator.calculateStart11Probabilities(players);
}
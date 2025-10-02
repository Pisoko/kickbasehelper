/**
 * React Hook for Start11 Generation
 * Integrates the Start11GeneratorService with React components
 */

import { useState, useCallback } from 'react';
import { Player } from '@/lib/types';
import { ArenaTeam, FormationType } from '@/lib/arena-types';
import { Start11GeneratorService, Start11GenerationOptions, Start11GenerationResult } from '@/lib/services/Start11GeneratorService';

interface UseStart11GeneratorOptions {
  /** Current arena team state */
  currentTeam: ArenaTeam;
  /** Function to update the arena team */
  onTeamUpdate: (team: ArenaTeam) => void;
}

interface UseStart11GeneratorReturn {
  /** Generate optimal Start11 */
  generateStart11: (options?: Partial<Start11GenerationOptions>) => Promise<void>;
  /** Loading state */
  isGenerating: boolean;
  /** Last generation result */
  lastResult: Start11GenerationResult | null;
  /** Error state */
  error: string | null;
  /** Clear error */
  clearError: () => void;
  /** Get formation recommendations */
  getFormationRecommendations: () => Promise<Array<{
    formation: FormationType;
    suitabilityScore: number;
    reasoning: string;
  }> | null>;
}

export function useStart11Generator({
  currentTeam,
  onTeamUpdate
}: UseStart11GeneratorOptions): UseStart11GeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<Start11GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchPlayersAndLast3GamesData = useCallback(async () => {
    try {
      console.log('[DEBUG] Fetching players from /api/players...');
      // Fetch players data
      const playersResponse = await fetch('/api/players');
      console.log('[DEBUG] Players response status:', playersResponse.status);
      if (!playersResponse.ok) {
        throw new Error('Fehler beim Laden der Spielerdaten');
      }
      const playersData = await playersResponse.json();
      console.log('[DEBUG] Players data received:', { 
        hasPlayers: !!playersData.players, 
        playersCount: playersData.players?.length || 0 
      });

      // Create a simple map for Start11 filter based on player data
      // We'll use a simplified approach since the individual performance history API requires player IDs
      const playerLast3GamesMap = new Map();
      
      // For now, we'll use a simplified approach where we consider players with recent good performance
      // as potential Start11 candidates. This can be enhanced later with actual performance history data.
      if (playersData.players && Array.isArray(playersData.players)) {
        playersData.players.forEach((player: any) => {
          // Simple heuristic: players with recent points history are considered Start11 candidates
          const hasRecentPerformance = player.punkte_hist && 
            Array.isArray(player.punkte_hist) && 
            player.punkte_hist.length > 0 &&
            player.punkte_hist.slice(-3).some((points: number) => points > 0);
          
          playerLast3GamesMap.set(player.id, {
            playerId: player.id,
            last3Games: hasRecentPerformance ? [true, true, true] : [false, false, false],
            totalGames: player.punkte_hist ? player.punkte_hist.length : 0
          });
        });
      }

      return {
        players: playersData.players || [],
        playerLast3GamesMap
      };
    } catch (err) {
      throw new Error(`Fehler beim Laden der Daten: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    }
  }, []);

  const generateStart11 = useCallback(async (options: Partial<Start11GenerationOptions> = {}) => {
    console.log('[DEBUG] useStart11Generator.generateStart11 called with options:', options);
    setIsGenerating(true);
    setError(null);

    try {
      console.log('[DEBUG] Fetching players and last 3 games data...');
      // Fetch required data
      const { players, playerLast3GamesMap } = await fetchPlayersAndLast3GamesData();
      console.log('[DEBUG] Fetched data:', { 
        playersCount: players.length, 
        playerLast3GamesMapSize: playerLast3GamesMap.size 
      });

      // Create generator service
      console.log('[DEBUG] Creating Start11GeneratorService...');
      const generator = new Start11GeneratorService(players, playerLast3GamesMap);

      // Prepare generation options
      const generationOptions: Start11GenerationOptions = {
        existingPlayers: currentTeam.players,
        onlyStart11Players: false, // Allow all eligible players, not just Start11 players
        maxBudget: currentTeam.budget,
        preferredFormation: options.preferredFormation || currentTeam.formation,
        ...options
      };
      
      console.log('[DEBUG] Generation options:', generationOptions);

      // Generate optimal Start11
      console.log('[DEBUG] Calling generator.generateOptimalStart11...');
      const result = await generator.generateOptimalStart11(generationOptions);
      console.log('[DEBUG] Generation result:', result);

      // Update the team
      console.log('[DEBUG] Updating team...');
      onTeamUpdate(result.team);
      
      // Store result for reference
      setLastResult(result);
      console.log('[DEBUG] Start11 generation completed successfully');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler bei der Start11-Generierung';
      setError(errorMessage);
      console.error('Start11 Generation Error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [currentTeam, onTeamUpdate, fetchPlayersAndLast3GamesData]);

  const getFormationRecommendations = useCallback(async () => {
    try {
      // Fetch required data
      const { players, playerLast3GamesMap } = await fetchPlayersAndLast3GamesData();

      // Create generator service
      const generator = new Start11GeneratorService(players, playerLast3GamesMap);

      // Filter available players (only Start11 players)
      const availablePlayers = players.filter((player: Player) => {
        // Don't include already selected players
        const existingPlayerIds = new Set(Object.values(currentTeam.players).map(p => p.id));
        if (existingPlayerIds.has(player.id)) {
          return false;
        }

        // Filter for Start11 players
        const playerData = playerLast3GamesMap.get(player.id);
        if (playerData && playerData.last3Games.length > 0) {
          // Check if player was in Start 11 in their last game
          const lastGameStart11 = playerData.last3Games[playerData.last3Games.length - 1];
          return lastGameStart11 === true;
        } else {
          // If no data available, exclude from Start 11 filter
          return false;
        }
      });

      return generator.getFormationRecommendations(availablePlayers);
    } catch (err) {
      console.error('Formation Recommendations Error:', err);
      return null;
    }
  }, [currentTeam.players]);

  return {
    generateStart11,
    isGenerating,
    lastResult,
    error,
    clearError,
    getFormationRecommendations
  };
}
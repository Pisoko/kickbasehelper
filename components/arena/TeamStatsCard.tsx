'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '@/lib/types';
import { calculatePointsPerMinute, calculateXFactor, calculateXFactorAsync } from '@/lib/positionUtils';

interface TeamStatsCardProps {
  selectedPlayers: { [positionId: string]: Player };
}

export function TeamStatsCard({ selectedPlayers }: TeamStatsCardProps) {
  const players = Object.values(selectedPlayers);
  const [playerXFactors, setPlayerXFactors] = useState<Map<string, number>>(new Map());
  const [isLoadingXFactors, setIsLoadingXFactors] = useState(false);
  
  // Load X-factors with current odds from Quoten-Tab when players change
  useEffect(() => {
    const loadXFactors = async () => {
      if (players.length === 0) {
        setPlayerXFactors(new Map());
        return;
      }

      setIsLoadingXFactors(true);
      const xFactorMap = new Map<string, number>();

      try {
        await Promise.all(
          players.map(async (player) => {
            try {
              const xFactor = await calculateXFactorAsync(
                player.punkte_sum || 0,
                player.totalMinutesPlayed || 0,
                player.marketValue || player.kosten || 0,
                player.verein || ''
              );
              xFactorMap.set(player.id, xFactor);
            } catch (error) {
              console.warn(`Failed to calculate X-Factor for player ${player.id}:`, error);
              // Fallback auf alte Berechnung
              const fallbackXFactor = calculateXFactor(
                player.punkte_sum || 0,
                player.totalMinutesPlayed || 0,
                player.marketValue || player.kosten || 0,
                player.verein || ''
              );
              xFactorMap.set(player.id, fallbackXFactor);
            }
          })
        );
        setPlayerXFactors(xFactorMap);
      } catch (error) {
        console.error('Failed to load X-factors:', error);
        // Fallback: Use synchronous calculation
        players.forEach(player => {
          const fallbackXFactor = calculateXFactor(
            player.punkte_sum || 0,
            player.totalMinutesPlayed || 0,
            player.marketValue || player.kosten || 0,
            player.verein || ''
          );
          xFactorMap.set(player.id, fallbackXFactor);
        });
        setPlayerXFactors(xFactorMap);
      } finally {
        setIsLoadingXFactors(false);
      }
    };

    loadXFactors();
  }, [players]);

  // Listen for team odds updates and recalculate X-factors
  useEffect(() => {
    const handleTeamOddsUpdate = () => {
      console.log('Team-Quoten wurden aktualisiert, X-Faktoren in TeamStatsCard werden neu berechnet...');
      if (players.length > 0) {
        // Kleine Verzögerung, damit die neuen Quoten geladen werden können
        setTimeout(() => {
          loadXFactors();
        }, 100);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('teamOddsUpdated', handleTeamOddsUpdate);
      
      return () => {
        window.removeEventListener('teamOddsUpdated', handleTeamOddsUpdate);
      };
    }
  }, [players, loadXFactors]);
  
  // Calculate total points per minute
  const totalPointsPerMinute = players.reduce((sum, player) => {
    const pointsPerMinute = calculatePointsPerMinute(
      player.punkte_sum || 0, 
      player.totalMinutesPlayed || 0
    );
    return sum + pointsPerMinute;
  }, 0);

  // Calculate average points
  const totalAveragePoints = players.reduce((sum, player) => {
    return sum + (player.punkte_avg || 0);
  }, 0);

  // Calculate total X-Factor using cached values with current odds
  const totalXFactor = players.reduce((sum, player) => {
    const xFactor = playerXFactors.get(player.id) || 0;
    return sum + xFactor;
  }, 0);

  const playerCount = players.length;

  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-lg font-semibold mb-4">Team-Statistiken</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Ausgewählte Spieler:</span>
          <span className="font-medium">{playerCount}/11</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Summe Punkte/Min:</span>
          <span className="font-medium">{totalPointsPerMinute.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Summe Ø-Punkte:</span>
          <span className="font-medium">{totalAveragePoints.toFixed(1)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            X-Werte (gesamt):
            {isLoadingXFactors && <span className="ml-1 text-xs text-blue-400">Lädt...</span>}
          </span>
          <span className="font-medium" title={isLoadingXFactors ? "X-Faktoren werden mit aktuellen Quoten berechnet..." : "X-Faktoren basieren auf aktuellen Quoten aus dem Quoten-Tab"}>
            {totalXFactor.toFixed(1)}
            {!isLoadingXFactors && playerXFactors.size > 0 && <span className="ml-1 text-xs text-green-400">✓</span>}
          </span>
        </div>

        {playerCount > 0 && (
          <>
            <hr className="border-border" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ø Punkte/Min pro Spieler:</span>
              <span className="font-medium">{(totalPointsPerMinute / playerCount).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ø Punkte pro Spieler:</span>
              <span className="font-medium">{(totalAveragePoints / playerCount).toFixed(1)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
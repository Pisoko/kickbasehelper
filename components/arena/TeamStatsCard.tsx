'use client';

import React from 'react';
import { Player } from '@/lib/types';
import { calculatePointsPerMinute } from '@/lib/positionUtils';

interface TeamStatsCardProps {
  selectedPlayers: { [positionId: string]: Player };
}

export function TeamStatsCard({ selectedPlayers }: TeamStatsCardProps) {
  const players = Object.values(selectedPlayers);
  
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
'use client';

import React, { useState } from 'react';
import { Player } from '@/lib/types';
import { FormationType, ArenaTeam, FORMATIONS, ARENA_BUDGET } from '@/lib/arena-types';
import { FormationField } from './FormationField';
import { FormationSelector } from './FormationSelector';
import { PlayerSelectionOverlay } from './PlayerSelectionOverlay';
import { BudgetTracker } from './BudgetTracker';
import { ArenaHeader } from './ArenaHeader';
import { TeamStatsCard } from './TeamStatsCard';
import { FormationChangeConfirmDialog } from './FormationChangeConfirmDialog';

interface ArenaProps {
  initialPlayers?: Player[];
}

export function Arena({ initialPlayers = [] }: ArenaProps) {
  const [error, setError] = useState<string | null>(null);
  
  const [arenaTeam, setArenaTeam] = useState<ArenaTeam>({
    formation: '4-4-2',
    players: {},
    totalCost: 0,
    budget: ARENA_BUDGET
  });

  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [showFormationConfirm, setShowFormationConfirm] = useState(false);
  const [pendingFormation, setPendingFormation] = useState<FormationType | null>(null);

  // Handle formation change
  const handleFormationChange = (formation: FormationType) => {
    // Check if there are any selected players
    const hasSelectedPlayers = Object.keys(arenaTeam.players).length > 0;
    
    if (hasSelectedPlayers) {
      // Show confirmation dialog
      setPendingFormation(formation);
      setShowFormationConfirm(true);
    } else {
      // No players selected, change formation directly
      setArenaTeam({
        ...arenaTeam,
        formation,
        players: {}
      });
    }
  };

  // Handle formation change confirmation
  const handleFormationConfirm = () => {
    if (pendingFormation) {
      setArenaTeam({
        ...arenaTeam,
        formation: pendingFormation,
        players: {}, // Reset players when formation changes
        totalCost: 0 // Reset total cost
      });
    }
    setShowFormationConfirm(false);
    setPendingFormation(null);
  };

  // Handle formation change cancellation
  const handleFormationCancel = () => {
    setShowFormationConfirm(false);
    setPendingFormation(null);
  };

  // Handle player selection
  const handlePlayerSelect = (positionId: string, player: Player) => {
    const playerCost = player.marketValue || player.kosten;
    
    // Check if player can afford
    if (arenaTeam.totalCost + playerCost > ARENA_BUDGET) {
      setError('Nicht genügend Budget für diesen Spieler');
      return;
    }

    // Check if player is already in team
    const isPlayerInTeam = Object.values(arenaTeam.players).some(p => p.id === player.id);
    if (isPlayerInTeam) {
      setError('Spieler ist bereits im Team');
      return;
    }

    setArenaTeam({
      ...arenaTeam,
      players: {
        ...arenaTeam.players,
        [positionId]: player
      },
      totalCost: arenaTeam.totalCost + playerCost
    });

    // Close overlay
    setShowPlayerSelection(false);
    setSelectedPosition(null);
    setError(null);
  };

  // Handle player remove
  const handlePlayerRemove = (positionId: string) => {
    const removedPlayer = arenaTeam.players[positionId];
    if (removedPlayer) {
      const newPlayers = { ...arenaTeam.players };
      delete newPlayers[positionId];
      
      const newTotalCost = arenaTeam.totalCost - (removedPlayer.marketValue || removedPlayer.kosten);
      
      setArenaTeam({
        ...arenaTeam,
        players: newPlayers,
        totalCost: newTotalCost
      });
    }
  };

  // Handle position click
  const handlePositionClick = (positionId: string) => {
    setSelectedPosition(positionId);
    setShowPlayerSelection(true);
  };

  const remainingBudget = ARENA_BUDGET - arenaTeam.totalCost;

  return (
    <div className="space-y-6">
      <ArenaHeader />
      
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-6 items-start justify-center">
        {/* Main Arena Area - Centered */}
        <div className="flex-1 max-w-4xl mx-auto">
          <FormationField
            formation={arenaTeam.formation}
            selectedPlayers={arenaTeam.players}
            onPositionClick={handlePositionClick}
            onPlayerRemove={handlePlayerRemove}
            selectedPosition={selectedPosition}
          />
        </div>

        {/* Sidebar */}
        <div className="w-full xl:w-80 space-y-4">
          <BudgetTracker
            totalCost={arenaTeam.totalCost}
            remainingBudget={remainingBudget}
            budget={ARENA_BUDGET}
          />
          
          <TeamStatsCard selectedPlayers={arenaTeam.players} />
          
          <FormationSelector
            currentFormation={arenaTeam.formation}
            onFormationChange={handleFormationChange}
          />
        </div>
      </div>

      {/* Player Selection Overlay */}
      {showPlayerSelection && selectedPosition && (
        <PlayerSelectionOverlay
          position={FORMATIONS[arenaTeam.formation].positions.find(p => p.id === selectedPosition)?.position || 'FWD'}
          positionId={selectedPosition}
          onPlayerSelect={(player: Player) => handlePlayerSelect(selectedPosition, player)}
          onClose={() => {
            setShowPlayerSelection(false);
            setSelectedPosition(null);
          }}
          remainingBudget={remainingBudget}
          selectedPlayers={arenaTeam.players}
        />
      )}

      {/* Formation Change Confirmation Dialog */}
      <FormationChangeConfirmDialog
        isOpen={showFormationConfirm}
        onConfirm={handleFormationConfirm}
        onCancel={handleFormationCancel}
      />
    </div>
  );
}
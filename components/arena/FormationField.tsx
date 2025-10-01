'use client';

import React from 'react';
import { Player } from '@/lib/types';
import { FormationType, FORMATIONS } from '@/lib/arena-types';
import { getPositionColorClasses } from '@/lib/positionUtils';
import { X, Plus } from 'lucide-react';
import PlayerImage from '@/components/PlayerImage';
import BundesligaLogo from '@/components/BundesligaLogo';

interface FormationFieldProps {
  formation: FormationType;
  selectedPlayers: { [positionId: string]: Player };
  onPositionClick: (positionId: string) => void;
  onPlayerRemove: (positionId: string) => void;
  selectedPosition: string | null;
}

export function FormationField({
  formation,
  selectedPlayers,
  onPositionClick,
  onPlayerRemove,
  selectedPosition
}: FormationFieldProps) {
  const formationData = FORMATIONS[formation];

  const formatCurrency = (amount: number) => {
    return `€${(amount / 1000000).toFixed(1)}M`;
  };

  return (
    <div className="bg-card rounded-lg border p-2 sm:p-4 w-full max-w-3xl mx-auto">
      <h3 className="text-lg font-semibold mb-4 text-center">Spielfeld - {formation}</h3>
      
      {/* Football Field - Rotated 180° and optimized for centering */}
      <div className="relative bg-green-600 rounded-lg aspect-[3/4] w-full max-w-2xl mx-auto min-h-[500px] max-h-[700px] overflow-hidden">
        {/* Field markings - enlarged by 20% */}
        <div className="absolute inset-0">
          {/* Center line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/30 transform -translate-y-0.5" />
          
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 w-40 h-40 border-4 border-white/30 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          
          {/* Penalty areas - rotated and enlarged */}
          <div className="absolute bottom-0 left-1/2 w-56 h-28 border-4 border-white/30 border-b-0 transform -translate-x-1/2" />
          <div className="absolute top-0 left-1/2 w-56 h-28 border-4 border-white/30 border-t-0 transform -translate-x-1/2" />
          
          {/* Goal areas - rotated and enlarged */}
          <div className="absolute bottom-0 left-1/2 w-28 h-14 border-4 border-white/30 border-b-0 transform -translate-x-1/2" />
          <div className="absolute top-0 left-1/2 w-28 h-14 border-4 border-white/30 border-t-0 transform -translate-x-1/2" />
        </div>

        {/* Player positions */}
        {formationData.positions.map((position) => {
          const player = selectedPlayers[position.id];
          const isSelected = selectedPosition === position.id;
          
          return (
            <div
              key={position.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`
              }}
              onClick={() => onPositionClick(position.id)}
            >
              {player ? (
                // Player circle with image and name below
                <div className={`
                  relative flex flex-col items-center
                  transition-all duration-200 hover:scale-105
                  ${isSelected ? 'ring-2 ring-primary ring-offset-2 rounded-full' : ''}
                `}>
                  {/* Remove button with team logo */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayerRemove(position.id);
                    }}
                    className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors z-10"
                  >
                    <BundesligaLogo 
                      teamName={player.verein}
                      size="sm"
                      className="w-6 h-6"
                    />
                  </button>
                  
                  {/* Player image in circle */}
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg bg-white">
                    <PlayerImage 
                      playerImageUrl={player.playerImageUrl}
                      playerName={player.name}
                      size="lg"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Player last name below circle */}
                  <div className="mt-1 text-xs font-medium text-white bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                    {player.name.split(' ').pop()}
                  </div>
                </div>
              ) : (
                // Empty position - doubled in size
                <div className={`
                  w-20 h-20 rounded-full border-2 border-dashed border-white/60 
                  bg-white/10 flex items-center justify-center
                  transition-all duration-200 hover:bg-white/20 hover:scale-110
                  ${isSelected ? 'ring-2 ring-primary ring-offset-2 bg-white/30' : ''}
                `}>
                  <Plus className="w-10 h-10 text-white/80" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Formation info */}
      <div className="mt-4 text-sm text-muted-foreground text-center">
        Klicke auf eine Position, um einen Spieler auszuwählen
      </div>
    </div>
  );
}
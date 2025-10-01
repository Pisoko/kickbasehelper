'use client';

import React, { useState, useMemo } from 'react';
import { Player } from '@/lib/types';
import { getPositionColorClasses } from '@/lib/positionUtils';
import { X, Search, TrendingUp, Clock, Target } from 'lucide-react';

interface PlayerPoolPanelProps {
  players: Player[];
  onPlayerSelect: (player: Player) => void;
  onClose: () => void;
  remainingBudget: number;
  selectedPosition: string;
}

export function PlayerPoolPanel({
  players,
  onPlayerSelect,
  onClose,
  remainingBudget,
  selectedPosition
}: PlayerPoolPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'points' | 'name'>('value');

  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = players.filter(player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.verein.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort players
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return (b.marketValue || b.kosten) - (a.marketValue || a.kosten);
        case 'points':
          return b.punkte_avg - a.punkte_avg;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [players, searchTerm, sortBy]);

  const formatCurrency = (amount: number) => {
    return `€${(amount / 1000000).toFixed(1)}M`;
  };

  const canAfford = (player: Player) => {
    const playerCost = player.marketValue || player.kosten;
    return playerCost <= remainingBudget;
  };

  return (
    <div className="bg-card rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Spieler auswählen</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search and Sort */}
      <div className="p-4 border-b space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Spieler oder Verein suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('value')}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              sortBy === 'value' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Marktwert
          </button>
          <button
            onClick={() => setSortBy('points')}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              sortBy === 'points' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Punkte
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              sortBy === 'name' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Name
          </button>
        </div>
      </div>

      {/* Player List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredAndSortedPlayers.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Keine Spieler gefunden
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredAndSortedPlayers.map((player) => {
              const affordable = canAfford(player);
              const playerCost = player.marketValue || player.kosten;
              
              return (
                <button
                  key={player.id}
                  onClick={() => affordable && onPlayerSelect(player)}
                  disabled={!affordable}
                  className={`
                    w-full p-3 rounded-lg text-left transition-all duration-200
                    ${affordable 
                      ? 'hover:bg-muted/50 cursor-pointer' 
                      : 'opacity-50 cursor-not-allowed bg-muted/20'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Player name and position */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`
                          px-2 py-0.5 rounded text-xs font-medium
                          ${getPositionColorClasses(player.position)}
                        `}>
                          {player.position}
                        </span>
                        <span className="font-medium truncate">{player.name}</span>
                      </div>
                      
                      {/* Team */}
                      <div className="text-sm text-muted-foreground mb-2">
                        {player.verein}
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          <span>{player.punkte_avg.toFixed(1)} Pkt</span>
                        </div>
                        {player.goals !== undefined && (
                          <div className="flex items-center gap-1">
                            <span>⚽</span>
                            <span>{player.goals}</span>
                          </div>
                        )}
                        {player.assists !== undefined && (
                          <div className="flex items-center gap-1">
                            <span>🅰️</span>
                            <span>{player.assists}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Price */}
                    <div className="text-right">
                      <div className={`font-medium ${affordable ? '' : 'text-destructive'}`}>
                        {formatCurrency(playerCost)}
                      </div>
                      {!affordable && (
                        <div className="text-xs text-destructive">
                          Zu teuer
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/20">
        <div className="text-sm text-muted-foreground">
          {filteredAndSortedPlayers.filter(canAfford).length} von {filteredAndSortedPlayers.length} Spielern verfügbar
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Verfügbares Budget: {formatCurrency(remainingBudget)}
        </div>
      </div>
    </div>
  );
}
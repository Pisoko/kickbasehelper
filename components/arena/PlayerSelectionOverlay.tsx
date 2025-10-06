'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Player } from '@/lib/types';
import { X, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlayerImage from '@/components/PlayerImage';
import { getGermanPosition, getPositionColorClasses, calculatePointsPerMinute, calculatePointsPerMillion, getEnglishPosition, calculateXFactor, getTeamOdds } from '@/lib/positionUtils';
import { correctPlayersPositions } from '@/lib/positionCorrections';
import { getFullTeamName, getBundesligaLogoUrlByDflId } from '@/lib/teamMapping';
import PlayerStatusTag, { isPlayerFit, getRowTextColor, getStatusInfo } from '@/components/PlayerStatusTag';
import { optimizedFetch } from '@/lib/requestDeduplication';
import BundesligaLogo from '@/components/BundesligaLogo';

// Interface für die Spieldaten der letzten 3 Spiele
interface PlayerLast3GamesData {
  playerId: string;
  last3Games: (boolean | null)[]; // true = Start-11, false = keine Start-11, null = keine Daten
  totalGames: number;
}

interface OpponentData {
  teamName: string;
  opponentName: string;
  opponentLogo?: string;
  isHome: boolean;
  homeOdds?: number;
  awayOdds?: number;
  drawOdds?: number;
  matchday: number;
  kickoff: string;
}

// Cache für Last3Games-Daten
const last3GamesDataCache = new Map<string, PlayerLast3GamesData>();

// Cache für Gegner-Daten
const opponentDataCache = new Map<string, OpponentData>();
let opponentDataCacheTime = 0;
const OPPONENT_CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten

// Funktion zum Abrufen der Gegner-Daten
async function getOpponentData(): Promise<Map<string, OpponentData>> {
  const now = Date.now();
  
  // Prüfe Cache
  if (opponentDataCache.size > 0 && (now - opponentDataCacheTime) < OPPONENT_CACHE_DURATION) {
    return opponentDataCache;
  }

  try {
    const data = await optimizedFetch('/api/opponents');
    
    if (data.success && data.data.opponents) {
      // Cache leeren und neu befüllen
      opponentDataCache.clear();
      
      for (const opponent of data.data.opponents) {
        opponentDataCache.set(opponent.teamName, opponent);
      }
      
      opponentDataCacheTime = now;
    }
  } catch (error) {
    console.error('Fehler beim Laden der Gegner-Daten:', error);
  }

  return opponentDataCache;
}

// Funktion zum Abrufen der Daten für die letzten 3 Spiele
async function getPlayerLast3GamesData(playerId: string): Promise<PlayerLast3GamesData> {
  // Prüfe, ob die Daten bereits im Cache sind
  if (last3GamesDataCache.has(playerId)) {
    return last3GamesDataCache.get(playerId)!;
  }
  
  try {
    // Rufe die Daten von der API ab
    const response = await optimizedFetch(`/api/player-performance-history?playerId=${playerId}`);
    
    if (response.success && response.data && response.data.matches) {
      const matches = response.data.matches;
      
      // Sortiere die Spiele nach Spieltag (aufsteigend)
      const sortedMatches = matches.sort((a: any, b: any) => a.matchday - b.matchday);
      
      // Ermittle die letzten 3 Spiele und ob der Spieler Start-11 war (>= 45 Minuten)
      const last3Games = sortedMatches
        .slice(-3) // Nimm die letzten 3 Spiele
        .map((match: any) => match.playerMinutes >= 45);
      
      const result: PlayerLast3GamesData = {
        playerId,
        last3Games,
        totalGames: sortedMatches.length
      };
      
      // Speichere die Daten im Cache
      last3GamesDataCache.set(playerId, result);
      return result;
    }
  } catch (error) {
    // Silently handle 404 errors and other API errors
    console.warn(`Could not load performance data for player ${playerId}:`, error instanceof Error ? error.message : 'Unknown error');
  }
  
  // Fallback, wenn keine Daten abgerufen werden konnten
  const fallback: PlayerLast3GamesData = {
    playerId,
    last3Games: [],
    totalGames: 0
  };
  
  last3GamesDataCache.set(playerId, fallback);
  return fallback;
}

/**
 * Erstellt die farbigen Blöcke für die letzten 3 Spiele
 * 
 * @param data - PlayerLast3GamesData mit den Informationen zu den letzten 3 Spielen
 * @returns JSX-Element mit den farbigen Blöcken
 */
function getLast3GamesBlocks(data: PlayerLast3GamesData): JSX.Element {
  // Handle empty or missing data
  if (!data || !data.last3Games || data.last3Games.length === 0) {
    return (
      <div className="flex space-x-1 justify-center">
        <div className="w-4 h-4 rounded bg-gray-500" title="Keine Daten verfügbar" />
        <div className="w-4 h-4 rounded bg-gray-500" title="Keine Daten verfügbar" />
        <div className="w-4 h-4 rounded bg-gray-500" title="Keine Daten verfügbar" />
      </div>
    );
  }

  // Ensure we always show 3 blocks, padding with gray if necessary
  const games = [...data.last3Games];
  while (games.length < 3) {
    games.unshift(null); // null represents no data
  }
  
  return (
    <div className="flex space-x-1 justify-center">
      {games.slice(-3).map((isStart11, index) => {
        const gameNumber = 3 - index; // 3. letztes, 2. letztes, letztes Spiel
        const gameLabel = gameNumber === 3 ? "Drittletztes Spiel" : 
                         gameNumber === 2 ? "Vorletztes Spiel" : "Letztes Spiel";
        
        if (isStart11 === null) {
          return (
            <div
              key={index}
              className="w-4 h-4 rounded bg-gray-500"
              title={`${gameLabel}: Keine Daten`}
            />
          );
        }
        
        return (
          <div
            key={index}
            className={`w-4 h-4 rounded ${isStart11 ? 'bg-green-500' : 'bg-red-500'}`}
            title={`${gameLabel}: ${isStart11 ? 'Start-11' : 'Nicht Start-11'}`}
          />
        );
      })}
    </div>
  );
}

interface PlayerSelectionOverlayProps {
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  positionId: string;
  onPlayerSelect: (player: Player) => void;
  onClose: () => void;
  remainingBudget: number;
  selectedPlayers: { [positionId: string]: Player };
}

export function PlayerSelectionOverlay({
  position,
  positionId,
  onPlayerSelect,
  onClose,
  remainingBudget,
  selectedPlayers
}: PlayerSelectionOverlayProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'marketValue' | 'punkte_sum' | 'punkte_avg' | 'name' | 'verein' | 'pointsPerMinute' | 'pointsPerMillion' | 'xFactor'>('xFactor');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAffordableOnly, setShowAffordableOnly] = useState(false);
  const [showStart11Only, setShowStart11Only] = useState(false);
  
  // Start11 data state
  const [playerLast3GamesData, setPlayerLast3GamesData] = useState<Map<string, PlayerLast3GamesData>>(new Map());
  const [opponentData, setOpponentData] = useState<Map<string, OpponentData>>(new Map());

  // Load players when overlay opens
  useEffect(() => {
    const loadPlayers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load players and opponent data in parallel
        const [playersData, opponentDataMap] = await Promise.all([
          optimizedFetch('/api/players'),
          getOpponentData()
        ]);
        
        // Extract players array from response
        const playersArray = playersData.players || playersData;
        
        // Ensure we have an array of players
        if (!Array.isArray(playersArray)) {
          throw new Error('Invalid data format: expected array of players');
        }
        
        // Apply position corrections for misclassified players
        const correctedPlayers = correctPlayersPositions(playersArray);
        
        // Filter by position (hard filter) - players already have English position format
         const positionPlayers = correctedPlayers.filter((player: Player) => {
           return player.position === position;
         });
        
        // Position filtering completed successfully
        
        setPlayers(positionPlayers);
        setOpponentData(opponentDataMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load players');
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, [position]);

  // Load Start11 data for players
  useEffect(() => {
    const loadStart11Data = async () => {
      if (players.length === 0) return;
      
      const newData = new Map<string, PlayerLast3GamesData>();
      
      // Load data for all players in parallel
      const promises = players.map(async (player) => {
        try {
          const data = await getPlayerLast3GamesData(player.id);
          newData.set(player.id, data);
        } catch (error) {
          console.error(`Failed to load Start11 data for player ${player.id}:`, error);
        }
      });
      
      await Promise.all(promises);
      setPlayerLast3GamesData(newData);
    };
    
    loadStart11Data();
  }, [players]);

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    // Get list of already selected player IDs
    const selectedPlayerIds = Object.values(selectedPlayers).map(player => player.id);
    
    let filtered = players.filter(player => {
      // Search filter
      const searchMatch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.verein?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Affordable filter
      const affordableMatch = !showAffordableOnly || (player.marketValue || player.kosten) <= remainingBudget;
      
      // Already selected filter - exclude already selected players
      const notAlreadySelected = !selectedPlayerIds.includes(player.id);
      
      // Start 11 filter - only show players who were in Start 11 in their last game
      let start11Match = true;
      if (showStart11Only) {
        const playerData = playerLast3GamesData.get(player.id);
        if (playerData && playerData.last3Games.length > 0) {
          // Check if player was in Start 11 in their last game (last element of array)
          const lastGameStart11 = playerData.last3Games[playerData.last3Games.length - 1];
          start11Match = lastGameStart11 === true;
        } else {
          // If no data available, exclude from Start 11 filter
          start11Match = false;
        }
      }
      
      return searchMatch && affordableMatch && notAlreadySelected && start11Match;
    });

    // Sort players
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'marketValue':
          comparison = (a.marketValue || a.kosten) - (b.marketValue || b.kosten);
          break;
        case 'punkte_sum':
          comparison = a.punkte_sum - b.punkte_sum;
          break;
        case 'punkte_avg':
          comparison = a.punkte_avg - b.punkte_avg;
          break;
        case 'pointsPerMinute':
          comparison = calculatePointsPerMinute(a.punkte_sum || 0, a.totalMinutesPlayed || 0) - 
                      calculatePointsPerMinute(b.punkte_sum || 0, b.totalMinutesPlayed || 0);
          break;
        case 'pointsPerMillion':
          comparison = calculatePointsPerMillion(a.punkte_sum || 0, a.marketValue || a.kosten || 0) - 
                      calculatePointsPerMillion(b.punkte_sum || 0, b.marketValue || b.kosten || 0);
          break;
        case 'xFactor':
          comparison = calculateXFactor(a.punkte_sum || 0, a.totalMinutesPlayed || 0, a.marketValue || a.kosten || 0, a.verein || '') - 
                      calculateXFactor(b.punkte_sum || 0, b.totalMinutesPlayed || 0, b.marketValue || b.kosten || 0, b.verein || '');
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'verein':
          comparison = a.verein.localeCompare(b.verein);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [players, searchTerm, showAffordableOnly, showStart11Only, sortBy, sortOrder, remainingBudget, selectedPlayers, playerLast3GamesData]);

  const getPositionLabel = (pos: string) => {
    switch (pos) {
      case 'GK': return 'Torwart';
      case 'DEF': return 'Verteidiger';
      case 'MID': return 'Mittelfeldspieler';
      case 'FWD': return 'Stürmer';
      default: return pos;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {getPositionLabel(position)} auswählen
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Verfügbares Budget: {formatCurrency(remainingBudget)} • {filteredPlayers.length} Spieler
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-slate-700 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Spieler oder Verein suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort and Filter Options */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-300">Sortieren:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-sm text-white"
              >
                <option value="xFactor">X-Faktor</option>
                <option value="marketValue">Marktwert</option>
                <option value="punkte_sum">Gesamtpunkte</option>
                <option value="punkte_avg">Ø Punkte</option>
                <option value="pointsPerMinute">Punkte/Min</option>
                <option value="pointsPerMillion">Punkte/Mio€</option>
                <option value="name">Name</option>
                <option value="verein">Verein</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={showAffordableOnly}
                onChange={(e) => setShowAffordableOnly(e.target.checked)}
                className="rounded"
              />
              Nur erschwingliche Spieler
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={showStart11Only}
                onChange={(e) => setShowStart11Only(e.target.checked)}
                className="rounded"
              />
              Letztes Spiel Start 11
            </label>
          </div>
        </div>

        {/* Player List - Table View Only */}
        <div className="flex-1 overflow-hidden min-h-0">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400">Lade Spieler...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-red-400">{error}</div>
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-auto h-full max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        Spieler
                        {sortBy === 'name' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-slate-300">
                      <button
                        onClick={() => handleSort('verein')}
                        className="flex items-center justify-center gap-1 hover:text-white"
                      >
                        Verein
                        {sortBy === 'verein' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-slate-300">
                      Gegner
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-slate-300">
                      <button
                        onClick={() => handleSort('marketValue')}
                        className="flex items-center justify-center gap-1 hover:text-white"
                      >
                        Marktwert
                        {sortBy === 'marketValue' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-slate-300">
                      <button
                        onClick={() => handleSort('punkte_sum')}
                        className="flex items-center justify-center gap-1 hover:text-white"
                      >
                        Punkte
                        {sortBy === 'punkte_sum' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-slate-300">
                      <button
                        onClick={() => handleSort('punkte_avg')}
                        className="flex items-center justify-center gap-1 hover:text-white"
                      >
                        ⌀ Punkte
                        {sortBy === 'punkte_avg' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-slate-300">
                      <button
                        onClick={() => handleSort('pointsPerMinute')}
                        className="flex items-center justify-center gap-1 hover:text-white"
                      >
                        Pkt/Min
                        {sortBy === 'pointsPerMinute' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-slate-300">
                      <button
                        onClick={() => handleSort('pointsPerMillion')}
                        className="flex items-center justify-center gap-1 hover:text-white"
                      >
                        Pkt/Mio
                        {sortBy === 'pointsPerMillion' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-slate-300">
                      <button
                        onClick={() => handleSort('xFactor')}
                        className="flex items-center justify-center gap-1 hover:text-white"
                      >
                        X
                        {sortBy === 'xFactor' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-slate-300">
                      Start11 (L3)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player) => {
                    const playerCost = player.marketValue || player.kosten || 0;
                    const isAffordable = playerCost <= remainingBudget;

                    return (
                      <tr
                        key={player.id}
                        className={`border-b border-slate-700 cursor-pointer transition-colors ${
                          isAffordable
                            ? 'hover:bg-slate-800/50'
                            : 'opacity-60 cursor-not-allowed bg-red-900/10'
                        }`}
                        onClick={() => isAffordable && onPlayerSelect(player)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <PlayerImage
                              playerImageUrl={player.playerImageUrl}
                              playerName={player.name}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <div className={`font-medium ${getRowTextColor(player.status, player.isInjured) || 'text-white'}`}>
                                {player.name}
                              </div>
                              {!isPlayerFit(player.status, player.isInjured) && (
                                <div className={`text-xs ${getStatusInfo(player.status, player.isInjured).textColor}`}>
                                  {getStatusInfo(player.status, player.isInjured).label}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2">
                          <div className="flex justify-center">
                            <BundesligaLogo teamName={player.verein} size="sm" />
                          </div>
                        </td>
                        <td className="text-center py-3 px-2">
                          {(() => {
                            // Map short team name to full team name for opponent lookup
                            const fullTeamName = getFullTeamName(player.verein);
                            const opponent = opponentData.get(fullTeamName);
                            if (!opponent) {
                              return <span className="text-slate-500 text-xs">-</span>;
                            }
                            
                            const playerTeamOdds = opponent.isHome ? opponent.homeOdds : opponent.awayOdds;
                            
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <span className={`text-xs px-1 py-0.5 rounded ${
                                    opponent.isHome ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'
                                  }`}>
                                    {opponent.isHome ? 'H' : 'A'}
                                  </span>
                                  {opponent.opponentLogo && (
                                    <img 
                                      src={getBundesligaLogoUrlByDflId(opponent.opponentLogo)} 
                                      alt={opponent.opponentName}
                                      className="w-8 h-8 opacity-45"
                                    />
                                  )}
                                </div>
                                {playerTeamOdds && (
                                  <span className="text-xs text-slate-400">
                                    {playerTeamOdds.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className={`text-center py-3 px-2 text-sm font-medium ${
                          isAffordable ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(playerCost)}
                        </td>
                        <td className="text-center py-3 px-2 text-sm font-medium">
                          {player.punkte_sum || 0}
                        </td>
                        <td className="text-center py-3 px-2 text-sm">
                          {player.punkte_avg ? player.punkte_avg.toFixed(1) : '0.0'}
                        </td>
                        <td className="text-center py-3 px-2 text-sm">
                          {calculatePointsPerMinute(player.punkte_sum || 0, player.totalMinutesPlayed || 0).toFixed(2)}
                        </td>
                        <td className="text-center py-3 px-2 text-sm">
                          {calculatePointsPerMillion(player.punkte_sum || 0, player.marketValue || player.kosten || 0).toFixed(1)}
                        </td>
                        <td 
                          className="text-center py-3 px-2 text-sm font-medium text-yellow-400 cursor-help"
                          title={(() => {
                            const pointsPerMinute = calculatePointsPerMinute(player.punkte_sum || 0, player.totalMinutesPlayed || 0);
                            const pointsPerMillion = calculatePointsPerMillion(player.punkte_sum || 0, player.marketValue || player.kosten || 0);
                            const teamOdds = getTeamOdds(player.verein || '');
                            return `X-Faktor Berechnung: ${pointsPerMinute.toFixed(2)} × ${pointsPerMillion.toFixed(1)} × ${teamOdds.toFixed(2)} = ${(pointsPerMinute * pointsPerMillion * teamOdds).toFixed(2)}`;
                          })()}
                        >
                          {calculateXFactor(player.punkte_sum || 0, player.totalMinutesPlayed || 0, player.marketValue || player.kosten || 0, player.verein || '').toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-center font-medium">
                          {playerLast3GamesData.has(player.id) ? (
                             getLast3GamesBlocks(playerLast3GamesData.get(player.id)!)
                          ) : (
                            <span className="text-slate-500">Lädt...</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && filteredPlayers.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              Keine Spieler gefunden
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
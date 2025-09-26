'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

import { DEFAULT_PARAMS, FORMATION_LIST } from '../lib/constants';
import { computeProjections } from '../lib/projection';
import { excludePlayer, getExcludedPlayersWithStats, includePlayer, filterExcludedPlayers, isPlayerExcluded } from '../lib/playerExclusion';
import type { Formation, Match, Odds, OptimizationResult, Player, ProjectionParams } from '../lib/types';
import { calculateFormationBasedStart11Probability } from '../lib/formationBasedStart11';
import { optimizeArena } from '../lib/optimization';
import PlayerDetailModal from '../components/PlayerDetailModal';
import PlayerImage from '../components/PlayerImage';
import PlayerStatusTag from '../components/PlayerStatusTag';
import BundesligaLogo from '../components/BundesligaLogo';

import { getFullTeamName } from '../lib/teamMapping';
import { 
  LEAGUE_AVERAGES, 
  getPositionAverage, 
  getTeamAverage, 
  calculateRelativeScore, 
  calculateTeamBonus 
} from '../lib/playerAverages';

interface CacheInfo {
  updatedAt?: string;
  cacheAgeDays?: number | null;
}

interface OptimizeState {
  loading: boolean;
  error?: string;
  result?: OptimizationResult;
}

interface ArenaOptimizeState {
  loading: boolean;
  error?: string;
  result?: OptimizationResult;
}

const tabs = ['Dashboard', 'Spieler Hub', 'Ergebnis'] as const;

const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// PlayerCard Komponente
const PlayerCard = ({ player, baseMode, onSelect }: { player: Player; baseMode: string; onSelect: () => void }) => {
  const pointsValue = baseMode === 'avg' 
    ? player.punkte_avg 
    : baseMode === 'sum' 
      ? player.punkte_sum 
      : player.punkte_hist.slice(-3).reduce((sum, p) => sum + p, 0) / 3;
  
  return (
    <div 
      onClick={onSelect}
      className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-800 transition cursor-pointer"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden">
          <PlayerImage
            playerImageUrl={player.playerImageUrl}
            playerName={player.name}
            className="w-full h-full object-cover rounded-full"
            size="md"
          />
        </div>
        <div>
          <h3 className={`font-semibold ${getPlayerNameColor(player.status, player.isInjured)}`}>
            {player.name}
          </h3>
          <p className="text-xs text-slate-400">{translatePosition(player.position)} • {getFullTeamName(player.verein)}</p>
          {getStatusWithEmoji(player.status, player.isInjured) && (
            <p className="text-xs mt-1 text-slate-300">
              {getStatusWithEmoji(player.status, player.isInjured)}
            </p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Marktwert</span>
          <span className="font-medium">{formatter.format(player.kosten)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Punkte ({baseMode === 'avg' ? 'Ø' : baseMode === 'sum' ? 'Σ' : 'Ø3'})</span>
          <span className="font-medium">{pointsValue.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};

// Function to format market value in millions (without "Mio €")
const formatMarketValue = (value: number): string => {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return millions.toFixed(1);
  }
  return (value / 1_000_000).toFixed(1);
};

// Function to calculate points per minute (same as PlayerDetailModal)
const calculatePointsPerMinute = (player: any): string => {
  const totalPoints = player.punkte_sum || 0;
  const totalMinutes = player.totalMinutesPlayed || player.minutesPlayed || 0;
  
  // If we have actual minutes data, use it
  if (totalMinutes > 0) {
    const pointsPerMinute = totalPoints / totalMinutes;
    return pointsPerMinute.toFixed(2);
  }
  
  // Fallback: estimate based on games played
  // Assume average of 70 minutes per game for field players, 90 for goalkeepers
  const gamesPlayed = player.punkte_hist?.length || 0;
  if (gamesPlayed === 0) return '0.00';
  
  const avgMinutesPerGame = player.position === 'GK' ? 90 : 70;
  const estimatedTotalMinutes = gamesPlayed * avgMinutesPerGame;
  
  const pointsPerMinute = totalPoints / estimatedTotalMinutes;
  return pointsPerMinute.toFixed(2);
};

// Function to calculate points per million euros
const calculatePointsPerMillion = (player: any): string => {
  const marketValue = player.kosten || 0;
  const totalPoints = player.punkte_sum || 0;
  if (marketValue === 0) return '0';
  const pointsPerMillion = (totalPoints / (marketValue / 1_000_000));
  return pointsPerMillion.toFixed(1);
};

// Function to translate positions to German
const translatePosition = (position: string): string => {
  const positionMap: Record<string, string> = {
    'GK': 'TW',
    'DEF': 'ABW',
    'MID': 'MF',
    'FWD': 'ANG'
  };
  return positionMap[position] || position;
};

const getPositionColor = (position: string): string => {
  switch (position) {
    case 'GK': return 'text-white';
    case 'DEF': return 'text-green-400';
    case 'MID': return 'text-yellow-400';
    case 'FWD': return 'text-red-400';
    default: return 'text-slate-300';
  }
};

const getClubColor = (clubName: string): string => {
  // Mapping basierend auf dominanten Logo-Farben der Bundesliga-Vereine
  switch (clubName) {
    case 'Bayern': return 'text-red-500';           // FC Bayern München - Rot
    case 'Dortmund': return 'text-yellow-400';      // Borussia Dortmund - Gelb
    case 'Leipzig': return 'text-red-600';          // RB Leipzig - Rot
    case 'Leverkusen': return 'text-red-500';       // Bayer 04 Leverkusen - Rot
    case 'Wolfsburg': return 'text-green-500';      // VfL Wolfsburg - Grün
    case 'Frankfurt': return 'text-red-600';        // Eintracht Frankfurt - Rot
    case 'M\'gladbach': return 'text-green-600';    // Borussia Mönchengladbach - Grün
    case 'Union Berlin': return 'text-red-700';     // 1. FC Union Berlin - Rot
    case 'Freiburg': return 'text-red-600';         // SC Freiburg - Rot
    case 'Stuttgart': return 'text-red-500';        // VfB Stuttgart - Rot
    case 'Mainz': return 'text-red-600';            // 1. FSV Mainz 05 - Rot
    case 'Hoffenheim': return 'text-blue-500';      // TSG 1899 Hoffenheim - Blau
    case 'Augsburg': return 'text-red-600';         // FC Augsburg - Rot
    case 'Köln': return 'text-red-500';             // 1. FC Köln - Rot
    case 'Bremen': return 'text-green-600';         // Werder Bremen - Grün
    case 'St. Pauli': return 'text-amber-600';      // FC St. Pauli - Braun
    case 'Heidenheim': return 'text-red-600';       // 1. FC Heidenheim - Rot
    case 'Kiel': return 'text-blue-600';            // Holstein Kiel - Blau
    default: return 'text-slate-300';               // Standard-Farbe
  }
};

// Helper function to display full player name
const getFullPlayerName = (player: Player): string => {
  if (player.firstName && player.firstName.trim()) {
    return `${player.firstName} ${player.name}`;
  }
  return player.name;
};

// Helper function to get player name color based on status
const getPlayerNameColor = (status?: string | number, isInjured?: boolean): string => {
  // If we have a status code, use it
  if (status !== undefined && status !== null) {
    const statusCode = typeof status === 'string' ? parseInt(status) : status;
    
    switch (statusCode) {
      case 1: // Verletzt
      case 8: // Glatt Rot
      case 16: // Gelb-Rote Karte
        return 'text-red-400';
      case 2: // Angeschlagen
      case 4: // Aufbautraining
        return 'text-yellow-400';
      case 0: // Fit
      default:
        return 'text-white';
    }
  }
  
  // Fallback: use isInjured field if available
  if (isInjured === true) {
    return 'text-red-400';
  }
  
  // Default to white
  return 'text-white';
};

// Helper function to get status label for tooltip
const getStatusLabel = (status?: string | number, isInjured?: boolean): string => {
  // If we have a status code, use it
  if (status !== undefined && status !== null) {
    const statusCode = typeof status === 'string' ? parseInt(status) : status;
    
    switch (statusCode) {
      case 0:
        return 'Fit';
      case 1:
        return 'Verletzt';
      case 2:
        return 'Angeschlagen';
      case 4:
        return 'Aufbautraining';
      case 8:
        return 'Glatt Rot';
      case 16:
        return 'Gelb-Rot';
      default:
        return 'Fit';
    }
  }
  
  // Fallback: use isInjured field if available
  if (isInjured === true) {
    return 'Verletzt';
  }
  
  // Default
  return 'Fit';
};

// Helper function to get status with emoji for display under name
const getStatusWithEmoji = (status?: string | number, isInjured?: boolean): string | null => {
  // If we have a status code, use it
  if (status !== undefined && status !== null) {
    const statusCode = typeof status === 'string' ? parseInt(status) : status;
    
    switch (statusCode) {
      case 1:
        return '🤕 Verletzt';
      case 2:
        return '⚠️ Angeschlagen';
      case 4:
        return '🏃 Aufbautraining';
      case 8:
        return '🟥 Glatt Rot';
      case 16:
        return '🟨🟥 Gelb-Rot';
      case 0:
      default:
        return null; // Don't show anything for "Fit"
    }
  }
  
  // Fallback: use isInjured field if available
  if (isInjured === true) {
    return '🤕 Verletzt';
  }
  
  // Default: don't show anything
  return null;
};

// Helper function to get status color for emoji display
const getStatusEmojiColor = (status?: string | number, isInjured?: boolean): string => {
  // If we have a status code, use it
  if (status !== undefined && status !== null) {
    const statusCode = typeof status === 'string' ? parseInt(status) : status;
    
    switch (statusCode) {
      case 1: // Verletzt
      case 8: // Glatt Rot
      case 16: // Gelb-Rote Karte
        return 'text-red-400';
      case 2: // Angeschlagen
      case 4: // Aufbautraining
        return 'text-yellow-400';
      case 0: // Fit
      default:
        return 'text-green-400';
    }
  }
  
  // Fallback: use isInjured field if available
  if (isInjured === true) {
    return 'text-red-400';
  }
  
  // Default to green
  return 'text-green-400';
};



// Optimierte Startelf-Wahrscheinlichkeitsberechnung


// Formatierung der Startelf-Wahrscheinlichkeit mit Ampelsystem
const formatStartingElevenProbability = (probability: number): { text: string; color: string } => {
  if (probability >= 0 && probability <= 30) {
    return { text: '🔴', color: 'text-red-500' }; // Rot: 0-30%
  } else if (probability >= 31 && probability <= 60) {
    return { text: '🟠', color: 'text-orange-500' }; // Orange: 31-60%
  } else if (probability >= 61 && probability <= 79) {
    return { text: '🟡', color: 'text-yellow-500' }; // Gelb: 61-79%
  } else if (probability >= 80 && probability <= 100) {
    return { text: '🟢', color: 'text-green-500' }; // Grün: 80-100%
  } else {
    // Fallback für unerwartete Werte
    return { text: '⚪', color: 'text-gray-500' };
  }
};

// Position grouping functions
const getPositionOrder = (): ('GK' | 'DEF' | 'MID' | 'FWD')[] => {
  return ['GK', 'DEF', 'MID', 'FWD'];
};

const groupPlayersByPosition = (lineup: OptimizationResult['lineup']) => {
  const grouped = lineup.reduce((acc, player) => {
    if (!acc[player.position]) {
      acc[player.position] = [];
    }
    acc[player.position].push(player);
    return acc;
  }, {} as Record<string, typeof lineup>);

  // Sortiere Spieler innerhalb jeder Position nach erwarteten Punkten (absteigend)
  Object.keys(grouped).forEach(position => {
    grouped[position].sort((a, b) => b.p_pred - a.p_pred);
  });

  return grouped;
};

const PositionSection = ({ 
  position, 
  players, 
  colorScheme 
}: { 
  position: 'GK' | 'DEF' | 'MID' | 'FWD'; 
  players: OptimizationResult['lineup']; 
  colorScheme: 'standard' | 'arena';
}) => {
  const positionColors = {
    standard: {
      GK: 'bg-yellow-800/30 border-yellow-700',
      DEF: 'bg-blue-800/30 border-blue-700', 
      MID: 'bg-green-800/30 border-green-700',
      FWD: 'bg-red-800/30 border-red-700'
    },
    arena: {
      GK: 'bg-yellow-800/20 border-yellow-600',
      DEF: 'bg-blue-800/20 border-blue-600',
      MID: 'bg-green-800/20 border-green-600', 
      FWD: 'bg-red-800/20 border-red-600'
    }
  } as const;

  const headerColors = {
    standard: {
      GK: 'text-yellow-400',
      DEF: 'text-blue-400',
      MID: 'text-green-400', 
      FWD: 'text-red-400'
    },
    arena: {
      GK: 'text-yellow-300',
      DEF: 'text-blue-300',
      MID: 'text-green-300',
      FWD: 'text-red-300'
    }
  } as const;

  const totalCost = players.reduce((sum, player) => sum + player.kosten, 0);
  const totalPoints = players.reduce((sum, player) => sum + player.p_pred, 0);

  return (
    <div className={`rounded-lg border p-4 ${positionColors[colorScheme][position]}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-lg font-semibold ${headerColors[colorScheme][position]}`}>
          {translatePosition(position)} ({players.length})
        </h3>
        <div className="text-sm text-slate-400">
          <span className="mr-3">{formatter.format(totalCost)}</span>
          <span className="text-green-400">{totalPoints.toFixed(1)}p</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {players.map((player) => (
          <div key={player.playerId} className={`${colorScheme === 'arena' ? 'bg-purple-800/20' : 'bg-slate-800/30'} p-3 rounded border ${colorScheme === 'arena' ? 'border-purple-700' : 'border-slate-700'}`}>
            <div className="flex items-center space-x-3">
              <PlayerImage 
                playerImageUrl={player.playerImageUrl} 
                playerName={player.name}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-200 truncate">{player.name}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-slate-300">{player.verein}</span>
                  <span>{formatter.format(player.kosten)}</span>
                  <span className="text-green-400">{player.p_pred.toFixed(1)}p</span>
                  <span className="text-blue-400">{player.value.toFixed(2)} P/M€</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function HomePage() {
  const [spieltag, setSpieltag] = useState(4);
  const [budget, setBudget] = useState(150_000_000);
  const [baseMode, setBaseMode] = useState<ProjectionParams['baseMode']>('avg');
  const defaultWeights: Omit<ProjectionParams, 'baseMode'> = useMemo(() => {
    const { baseMode: _baseMode, ...rest } = DEFAULT_PARAMS;
    return rest;
  }, []);
  const [weights, setWeights] = useState<Omit<ProjectionParams, 'baseMode'>>({ ...defaultWeights });
  const [formationMode, setFormationMode] = useState<'auto' | 'manuell'>('auto');
  const [formation, setFormation] = useState<Formation>('3-4-3');
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [odds, setOdds] = useState<Odds[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({});
  const [optState, setOptState] = useState<OptimizeState>({ loading: false });
  const [arenaOptState, setArenaOptState] = useState<ArenaOptimizeState>({ loading: false });
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [blacklistInput, setBlacklistInput] = useState('');
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Dashboard');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  
  // Excluded players management
  const [excludedPlayers, setExcludedPlayers] = useState<ReturnType<typeof getExcludedPlayersWithStats>>([]);
  const [showExcludedPlayers, setShowExcludedPlayers] = useState(false);
  
  // Spieler Hub Filter-Zustände
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('punkte_sum');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  

  
  // Berechne eindeutige Positionen und Vereine für Filter-Dropdowns
  const uniquePositions = useMemo(() => {
    const positions = [...new Set(players.map(player => player.position))];
    // Definiere die gewünschte Reihenfolge: TW, ABW, MF, ANG
    const positionOrder = ['GK', 'DEF', 'MID', 'FWD'];
    return positions.sort((a, b) => {
      const indexA = positionOrder.indexOf(a);
      const indexB = positionOrder.indexOf(b);
      // Falls Position nicht in der Liste ist, ans Ende setzen
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [players]);
  
  const uniqueClubs = useMemo(() => {
    const clubs = [...new Set(players.map(player => player.verein))];
    return clubs.sort();
  }, [players]);
  
  // Gefilterte Spielerliste
  const filteredPlayers = useMemo(() => {
    // Erst Blacklist-Spieler ausfiltern, dann andere Filter anwenden
    const nonExcludedPlayers = filterExcludedPlayers(players);
    
    return nonExcludedPlayers.filter(player => {
      const matchesSearch = searchTerm === '' || 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (player.firstName && player.firstName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesPosition = positionFilter === '' || player.position === positionFilter;
      const matchesClub = clubFilter === '' || player.verein === clubFilter;
      
      return matchesSearch && matchesPosition && matchesClub;
    });
  }, [players, searchTerm, positionFilter, clubFilter]);
  
  // Load excluded players on mount and when players change
  useEffect(() => {
    setExcludedPlayers(getExcludedPlayersWithStats());
  }, [players]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [playersPerPage, setPlayersPerPage] = useState(25);
  

  
  const hasMinutes = useMemo(
    () => players?.some((player) => player.minutes_hist && player.minutes_hist.length > 0) || false,
    [players]
  );

  // Function to load player and match data
  const loadData = async () => {
    setLoadingData(true);
    try {
      const [playersRes, matchesRes] = await Promise.all([
        fetch(`/api/players?spieltag=${spieltag}`).then((res) => res.json()),
        fetch(`/api/matches?spieltag=${spieltag}`).then((res) => res.json())
      ]);
      if (playersRes.error) {
        throw new Error(playersRes.error);
      }
      if (matchesRes.error) {
        throw new Error(matchesRes.error);
      }
      setPlayers((playersRes.players as Player[]) || []);
      setMatches((matchesRes.matches as Match[]) || []);
      setOdds((matchesRes.odds ?? []) as Odds[]);
      setCacheInfo({
        updatedAt: playersRes.updatedAt,
        cacheAgeDays: playersRes.cacheAgeDays
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [spieltag]);

  // Modal handlers
  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
    setIsPlayerModalOpen(true);
  };

  const handlePlayerSelect = handlePlayerClick;

  // Player exclusion handlers
  const handleExcludePlayer = (player: Player) => {
    excludePlayer(player);
    setExcludedPlayers(getExcludedPlayersWithStats());
    // Refresh player data to remove excluded player from the list
    loadData();
  };

  const handleIncludePlayer = (playerId: string) => {
    includePlayer(playerId);
    setExcludedPlayers(getExcludedPlayersWithStats());
    // Refresh player data to add player back to the list
    loadData();
  };

  const closePlayerModal = () => {
    setIsPlayerModalOpen(false);
    setSelectedPlayer(null);
  };

  // Optimization handlers
  const handleOptimize = async () => {
    setOptState({ loading: true, error: undefined, result: undefined });
    
    try {
      const projections = computeProjections(players, matches, odds, weights);
      
      // Use the excludedPlayers system instead of the old blacklist
      const excludedPlayerIds = getExcludedPlayersWithStats().map(ep => ep.id);
      
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spieltag,
          formation: formationMode === 'auto' ? undefined : formation,
          budget,
          baseMode,
          weights,
          blacklist: excludedPlayerIds
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Optimierung fehlgeschlagen');
      }
      
      setOptState({ loading: false, result });
      setActiveTab('Ergebnis');
    } catch (error) {
      setOptState({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      });
    }
  };

  const handleArenaOptimize = async () => {
    console.log('=== HANDLE ARENA OPTIMIZE CALLED ===');
    console.log('arenaOptState before:', arenaOptState);
    console.log('setArenaOptState function:', typeof setArenaOptState);
    console.log('arenaOptState keys:', arenaOptState ? Object.keys(arenaOptState) : 'undefined');
    console.log('players.length:', players.length);
    console.log('handleArenaOptimize function:', typeof handleArenaOptimize);
    
    try {
      console.log('Setting arenaOptState to loading...');
      setArenaOptState({ loading: true, error: undefined, result: undefined });
      console.log('arenaOptState set to loading successfully');
      
      console.log('Starting arena optimization...');
      console.log('players:', players.length);
      console.log('matches:', matches.length);
      console.log('odds:', odds.length);
      console.log('weights:', weights);
      console.log('blacklist:', blacklist);
      
      const projections = computeProjections(players, matches, odds, weights);
      console.log('Projections computed:', projections.length);
      
      // Use the excludedPlayers system instead of the old blacklist
      const excludedPlayerIds = getExcludedPlayersWithStats().map(ep => ep.id);
      
      console.log('Calling optimizeArena...');
      const result = await optimizeArena(players, projections, excludedPlayerIds);
      console.log('Arena optimization result:', result);
      
      console.log('Setting final result...');
      setArenaOptState({ loading: false, result });
      setActiveTab('Ergebnis');
      console.log('Arena optimization completed successfully');
    } catch (error) {
      console.error('=== ARENA OPTIMIZATION ERROR ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      try {
        setArenaOptState({ 
          loading: false, 
          error: error instanceof Error ? error.message : 'Arena-Optimierung fehlgeschlagen' 
        });
        console.log('Error state set successfully');
      } catch (setStateError) {
        console.error('Error setting error state:', setStateError);
      }
    }
  };

  // Get sorted players for table display
  const getSortedPlayers = () => {
    const sorted = [...filteredPlayers].sort((a: Player, b: Player) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'position':
          // Use the same order as position filter: GK, DEF, MID, FWD
          const positionOrder = ['GK', 'DEF', 'MID', 'FWD'];
          aValue = positionOrder.indexOf(a.position);
          bValue = positionOrder.indexOf(b.position);
          // If position not found, put it at the end
          if (aValue === -1) aValue = 999;
          if (bValue === -1) bValue = 999;
          break;
        case 'verein':
          aValue = getFullTeamName(a.verein);
          bValue = getFullTeamName(b.verein);
          break;
        case 'kosten':
          aValue = a.kosten;
          bValue = b.kosten;
          break;
        case 'points':
          aValue = baseMode === 'avg' 
            ? a.punkte_avg 
            : baseMode === 'sum' 
              ? a.punkte_sum 
              : a.punkte_hist.slice(-3).reduce((sum: number, p: number) => sum + p, 0) / 3;
          bValue = baseMode === 'avg' 
            ? b.punkte_avg 
            : baseMode === 'sum' 
              ? b.punkte_sum 
              : b.punkte_hist.slice(-3).reduce((sum: number, p: number) => sum + p, 0) / 3;
          break;
        case 'punkte_sum':
          aValue = a.punkte_sum;
          bValue = b.punkte_sum;
          break;
        case 'pointsPerMinute':
          // Parse the calculated values for sorting
          const aMinutes = a.totalMinutesPlayed || a.minutesPlayed || 0;
          const bMinutes = b.totalMinutesPlayed || b.minutesPlayed || 0;
          aValue = aMinutes > 0 ? (a.punkte_sum || 0) / aMinutes : 0;
          bValue = bMinutes > 0 ? (b.punkte_sum || 0) / bMinutes : 0;
          break;
        case 'pointsPerMillion':
          // Parse the calculated values for sorting
          const aMarketValue = a.kosten || 0;
          const bMarketValue = b.kosten || 0;
          aValue = aMarketValue > 0 ? (a.punkte_sum || 0) / (aMarketValue / 1_000_000) : 0;
          bValue = bMarketValue > 0 ? (b.punkte_sum || 0) / (bMarketValue / 1_000_000) : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const projections = useMemo(() => {
    if (!players || players.length === 0) {
      return [];
    }
    const params: ProjectionParams = { ...weights, baseMode };
    return computeProjections(players, matches, odds, params);
  }, [players, matches, odds, baseMode, weights]);

  // Memoized calculation for Start11 probabilities
  const newStart11Probabilities = useMemo(() => {
    if (!projections || projections.length === 0) {
      return new Map<string, number>();
    }
    const nonExcludedPlayers = filterExcludedPlayers(projections);
    return calculateFormationBasedStart11Probability(nonExcludedPlayers);
  }, [projections]);

  const formationSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    for (const pick of optState.result?.lineup ?? []) {
      summary[pick.position] = (summary[pick.position] ?? 0) + 1;
    }
    return summary;
  }, [optState.result]);

  // Filter and sort players for the explorer
  const filteredAndSortedPlayers = useMemo(() => {
    // First filter out excluded players
    const nonExcludedPlayers = filterExcludedPlayers(projections);
    
    let filtered = nonExcludedPlayers.filter(player => {
      const fullName = getFullPlayerName(player).toLowerCase();
      const matchesSearch = searchTerm === '' || 
        fullName.includes(searchTerm.toLowerCase()) ||
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (player.firstName && player.firstName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesPosition = positionFilter === '' || player.position === positionFilter;
      const matchesClub = clubFilter === '' || player.verein === clubFilter;
      
      return matchesSearch && matchesPosition && matchesClub;
    });

    // Sort players
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortColumn) {
          case 'position':
            // Use the same order as position filter: GK, DEF, MID, FWD
            const positionOrder = ['GK', 'DEF', 'MID', 'FWD'];
            aValue = positionOrder.indexOf(a.position);
            bValue = positionOrder.indexOf(b.position);
            // If position not found, put it at the end
            if (aValue === -1) aValue = 999;
            if (bValue === -1) bValue = 999;
            break;
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'status':
            // Sort by status code, treating undefined/null as 0 (Fit)
            aValue = a.status ? parseInt(a.status.toString()) : 0;
            bValue = b.status ? parseInt(b.status.toString()) : 0;
            break;
          case 'club':
            aValue = a.verein;
            bValue = b.verein;
            break;
          case 'marketValue':
            aValue = a.kosten || 0;
            bValue = b.kosten || 0;
            break;
          case 'totalPoints':
            aValue = a.punkte_sum || 0;
            bValue = b.punkte_sum || 0;
            break;
          case 'pointsPerMinute':
            const aMinutes = a.totalMinutesPlayed || a.minutesPlayed || 0;
            const bMinutes = b.totalMinutesPlayed || b.minutesPlayed || 0;
            aValue = aMinutes > 0 ? (a.punkte_sum || 0) / aMinutes : 0;
            bValue = bMinutes > 0 ? (b.punkte_sum || 0) / bMinutes : 0;
            break;
          case 'pointsPerMillion':
            const aMarketValue = a.kosten || 0;
            const bMarketValue = b.kosten || 0;
            aValue = aMarketValue > 0 ? (a.punkte_sum || 0) / (aMarketValue / 1_000_000) : 0;
            bValue = bMarketValue > 0 ? (b.punkte_sum || 0) / (bMarketValue / 1_000_000) : 0;
            break;
          case 'startingElevenProbability':
             aValue = newStart11Probabilities.get(a.id) || 0;
             bValue = newStart11Probabilities.get(b.id) || 0;
             break;
          default:
            return 0;
        }
        
        if (typeof aValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          return sortDirection === 'asc' 
            ? aValue - bValue
            : bValue - aValue;
        }
      });
    }

    return filtered;
  }, [projections, searchTerm, positionFilter, clubFilter, sortColumn, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedPlayers.length / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const endIndex = startIndex + playersPerPage;
  const paginatedPlayers = filteredAndSortedPlayers.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, positionFilter, clubFilter, playersPerPage]);



  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Get sort indicator
  const getSortIndicator = (column: string) => {
    if (sortColumn !== column) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };



  async function handleRefresh() {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/refresh?spieltag=${spieltag}&force=true`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Aktualisierung fehlgeschlagen');
      }
      setCacheInfo({ updatedAt: data.updatedAt, cacheAgeDays: data.cacheAge });
      // Reload players
      const [playersRes, matchesRes] = await Promise.all([
        fetch(`/api/players?spieltag=${spieltag}`).then((resp) => resp.json()),
        fetch(`/api/matches?spieltag=${spieltag}`).then((resp) => resp.json())
      ]);
      setPlayers(playersRes.players as Player[]);
      setMatches(matchesRes.matches as Match[]);
      setOdds((matchesRes.odds ?? []) as Odds[]);
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    } finally {
      setLoadingData(false);
    }
  }



  function handleBlacklistAdd(name: string) {
    if (!blacklist.includes(name)) {
      setBlacklist([...blacklist, name]);
    }
    setBlacklistInput('');
  }

  function handleBlacklistRemove(name: string) {
    setBlacklist(blacklist.filter((item) => item !== name));
  }

  function resetWeights() {
    setWeights({ ...defaultWeights });
  }

  const suggestions = useMemo(() => {
    if (!blacklistInput) return [];
    return players
      .filter((player) =>
        player.name.toLowerCase().includes(blacklistInput.toLowerCase()) ||
        player.verein.toLowerCase().includes(blacklistInput.toLowerCase())
      )
      .slice(0, 5);
  }, [blacklistInput, players]);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-4 px-4 sm:py-8 sm:px-6">
      <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as typeof tabs[number])}>
        <TabsList className="w-full mb-6">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 text-sm"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="Dashboard">
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
              <h2 className="text-xl font-semibold">Konfiguration</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span>Spieltag</span>
                  <input
                    type="number"
                    min={1}
                    value={spieltag}
                    onChange={(event) => setSpieltag(Number(event.target.value))}
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Budget (€)</span>
                  <input
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(event) => setBudget(Number(event.target.value))}
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Basis-Modus</span>
                  <select
                    value={baseMode}
                    onChange={(event) => setBaseMode(event.target.value as ProjectionParams['baseMode'])}
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  >
                    <option value="avg">Saison-Durchschnitt</option>
                    <option value="sum">Saison-Gesamtpunkte</option>
                    <option value="last3">Letzte 3 Spiele</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Formation</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormationMode('auto')}
                      className={`flex-1 rounded border px-3 py-2 ${
                        formationMode === 'auto' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-700'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormationMode('manuell')}
                      className={`flex-1 rounded border px-3 py-2 ${
                        formationMode === 'manuell' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-700'
                      }`}
                    >
                      Manuell
                    </button>
                  </div>
                  {formationMode === 'manuell' && (
                    <select
                      value={formation}
                      onChange={(event) => setFormation(event.target.value as Formation)}
                      className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
                    >
                      {FORMATION_LIST.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-xl font-semibold">Datenstatus</h2>
              <p className="text-sm text-slate-400">
                {loadingData && 'Lade Daten ...'}
                {!loadingData && cacheInfo.updatedAt && (
                  <>
                    Datenstand: {new Date(cacheInfo.updatedAt).toLocaleString('de-DE')} •{' '}
                    {cacheInfo.cacheAgeDays ?? '–'} Tage alt
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={handleRefresh}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Daten aktualisieren
              </button>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-xl font-semibold">Optimierung</h2>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleOptimize}
                  disabled={optState.loading || players.length === 0}
                  className="w-full rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {optState.loading ? 'Optimiere...' : 'Standard Optimierung'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    console.log('=== ARENA BUTTON CLICKED ===');
                    console.log('arenaOptState:', arenaOptState);
                    console.log('arenaOptState type:', typeof arenaOptState);
                    console.log('arenaOptState keys:', arenaOptState ? Object.keys(arenaOptState) : 'undefined');
                    console.log('players.length:', players.length);
                    console.log('handleArenaOptimize function:', typeof handleArenaOptimize);
                    
                    try {
                      handleArenaOptimize();
                    } catch (error) {
                      console.error('Error calling handleArenaOptimize:', error);
                      console.error('Error stack:', error.stack);
                    }
                  }}
                  disabled={arenaOptState?.loading || players.length === 0}
                  className="w-full rounded-lg bg-purple-500 px-4 py-2 font-semibold text-white transition hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {arenaOptState?.loading ? 'Optimiere Arena...' : 'Arena Optimierung (150M €)'}
                </button>
                
                {(optState.error || arenaOptState?.error) && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
                    {optState.error || arenaOptState?.error}
                  </div>
                )}
                
                <div className="text-xs text-slate-400 space-y-1">
                  <p><strong>Standard:</strong> Verwendet dein Budget und deine Konfiguration</p>
                  <p><strong>Arena:</strong> Festes Budget 150M €, filtert automatisch verletzte/gesperrte Spieler</p>
                </div>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="Spieler Hub">
          <section className="space-y-6">
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              
              {/* Search and Filter Controls */}
              <div className="mb-4 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Spieler suchen
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Name eingeben..."
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Position filtern
                  </label>
                  <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Alle Positionen</option>
                    {uniquePositions.map(pos => (
                      <option 
                        key={pos} 
                        value={pos}
                        className={getPositionColor(pos)}
                      >
                        {translatePosition(pos)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Verein filtern
                  </label>
                  <select
                    value={clubFilter}
                    onChange={(e) => setClubFilter(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Alle Vereine</option>
                    {uniqueClubs.map(club => (
                      <option 
                        key={club} 
                        value={club}
                        className="text-white"
                      >
                        {getFullTeamName(club)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Player Table */}
              <div className="mt-6">
                {filteredPlayers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-700 bg-slate-900/60 rounded-lg">
                      <thead>
                        <tr className="bg-slate-800">
                          <th 
                            className="border border-slate-700 px-4 py-3 text-left cursor-pointer hover:bg-slate-700 transition"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center gap-2">
                              Spieler
                              {sortColumn === 'name' && (
                                <span className="text-blue-400">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="border border-slate-700 px-4 py-3 text-center cursor-pointer hover:bg-slate-700 transition"
                            onClick={() => handleSort('verein')}
                          >
                            <div className="flex items-center justify-center gap-2">
                              Verein
                              {sortColumn === 'verein' && (
                                <span className="text-blue-400">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="border border-slate-700 px-4 py-3 text-center cursor-pointer hover:bg-slate-700 transition"
                            onClick={() => handleSort('position')}
                          >
                            <div className="flex items-center justify-center gap-2">
                              Position
                              {sortColumn === 'position' && (
                                <span className="text-blue-400">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="border border-slate-700 px-4 py-3 text-center cursor-pointer hover:bg-slate-700 transition"
                            onClick={() => handleSort('kosten')}
                          >
                            <div className="flex items-center justify-center gap-2">
                              Marktwert
                              {sortColumn === 'kosten' && (
                                <span className="text-blue-400">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="border border-slate-700 px-4 py-3 text-center cursor-pointer hover:bg-slate-700 transition"
                            onClick={() => handleSort('punkte_sum')}
                          >
                            <div className="flex items-center justify-center gap-2">
                              Gesamtpunkte
                              {sortColumn === 'punkte_sum' && (
                                <span className="text-blue-400">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="border border-slate-700 px-4 py-3 text-center cursor-pointer hover:bg-slate-700 transition"
                            onClick={() => handleSort('points')}
                          >
                            <div className="flex items-center justify-center gap-2">
                              Punkte ({baseMode === 'avg' ? 'Ø' : baseMode === 'sum' ? 'Σ' : 'Ø3'})
                              {sortColumn === 'points' && (
                                <span className="text-blue-400">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="border border-slate-700 px-4 py-3 text-center cursor-pointer hover:bg-slate-700 transition"
                            onClick={() => handleSort('pointsPerMinute')}
                          >
                            <div className="flex items-center justify-center gap-2">
                              Punkte/Min
                              {sortColumn === 'pointsPerMinute' && (
                                <span className="text-blue-400">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="border border-slate-700 px-4 py-3 text-center cursor-pointer hover:bg-slate-700 transition"
                            onClick={() => handleSort('pointsPerMillion')}
                          >
                            <div className="flex items-center justify-center gap-2">
                              Punkte/Mio €
                              {sortColumn === 'pointsPerMillion' && (
                                <span className="text-blue-400">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th className="border border-slate-700 px-2 py-3 text-center">
                            <div className="flex items-center justify-center">
                              Aktionen
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSortedPlayers().map((player, index) => {
                          const pointsValue = baseMode === 'avg' 
                            ? player.punkte_avg 
                            : baseMode === 'sum' 
                              ? player.punkte_sum 
                              : player.punkte_hist.slice(-3).reduce((sum, p) => sum + p, 0) / 3;
                          
                          return (
                            <tr 
                              key={player.id} 
                              className={`hover:bg-slate-800 transition cursor-pointer ${index % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/60'}`}
                              onClick={() => handlePlayerSelect(player)}
                            >
                              <td className="border border-slate-700 px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                                    <PlayerImage
                                      playerImageUrl={player.playerImageUrl}
                                      playerName={player.name}
                                      className="w-full h-full object-cover rounded-full"
                                      size="sm"
                                    />
                                  </div>
                                  <div>
                                    <div className={`font-medium ${getPlayerNameColor(player.status, player.isInjured)}`}>
                                      {player.name}
                                    </div>
                                    {getStatusWithEmoji(player.status, player.isInjured) && (
                                      <div className="text-xs text-slate-400 mt-1">
                                        {getStatusWithEmoji(player.status, player.isInjured)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="border border-slate-700 px-4 py-3 text-center">
                                <div className="flex justify-center">
                                  <BundesligaLogo teamName={player.verein} className="w-10 h-10" />
                                </div>
                              </td>
                              <td className="border border-slate-700 px-4 py-3 text-center">
                                <span className={`font-medium ${getPositionColor(player.position)}`}>
                                  {translatePosition(player.position)}
                                </span>
                              </td>
                              <td className="border border-slate-700 px-4 py-3 text-center font-medium">
                                <span className={getPlayerNameColor(player.status, player.isInjured)}>
                                  {formatter.format(player.kosten)}
                                </span>
                              </td>
                              <td className="border border-slate-700 px-4 py-3 text-center font-medium">
                                <span className={getPlayerNameColor(player.status, player.isInjured)}>
                                  {Math.round(player.punkte_sum)}
                                </span>
                              </td>
                              <td className="border border-slate-700 px-4 py-3 text-center font-medium">
                                <span className={getPlayerNameColor(player.status, player.isInjured)}>
                                  {Math.round(pointsValue)}
                                </span>
                              </td>
                              <td className="border border-slate-700 px-4 py-3 text-center font-medium text-sm">
                                <span className={getPlayerNameColor(player.status, player.isInjured)}>
                                  {calculatePointsPerMinute(player)}
                                </span>
                              </td>
                              <td className="border border-slate-700 px-4 py-3 text-center font-medium text-sm">
                                <span className={getPlayerNameColor(player.status, player.isInjured)}>
                                  {calculatePointsPerMillion(player)}
                                </span>
                              </td>
                              <td className="border border-slate-700 px-2 py-3 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent row click
                                    if (isPlayerExcluded(player.id)) {
                                      handleIncludePlayer(player.id);
                                    } else {
                                      handleExcludePlayer(player);
                                    }
                                  }}
                                  className="w-8 h-8 flex items-center justify-center text-lg transition-opacity hover:opacity-70 border-0 outline-none bg-transparent"
                                  title={isPlayerExcluded(player.id) ? 'Spieler wieder einschließen' : 'Spieler ausschließen'}
                                >
                                  {isPlayerExcluded(player.id) ? '✅' : '🚫'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400">Keine Spieler gefunden</p>
                  </div>
                )}
              </div>

              {/* Blacklist Section */}
              {excludedPlayers.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">
                    Ausgeschlossene Spieler ({excludedPlayers.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-700 bg-slate-900/60 rounded-lg">
                      <thead>
                        <tr className="bg-slate-800">
                          <th className="border border-slate-700 px-4 py-3 text-left text-slate-200 font-medium">
                            Spieler
                          </th>
                          <th className="border border-slate-700 px-4 py-3 text-center text-slate-200 font-medium">
                            Verein
                          </th>
                          <th className="border border-slate-700 px-4 py-3 text-center text-slate-200 font-medium">
                            Position
                          </th>
                          <th className="border border-slate-700 px-4 py-3 text-center text-slate-200 font-medium">
                            Ausgeschlossen seit
                          </th>
                          <th className="border border-slate-700 px-4 py-3 text-center text-slate-200 font-medium">
                            Aktion
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {excludedPlayers.map((excludedPlayer) => (
                          <tr key={excludedPlayer.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="border border-slate-700 px-4 py-3">
                              <div className="flex items-center space-x-3">
                                <PlayerImage 
                                  playerId={excludedPlayer.id} 
                                  playerName={excludedPlayer.name}
                                  className="w-8 h-8 rounded-full"
                                />
                                <span className="text-slate-200 font-medium">
                                  {excludedPlayer.name}
                                </span>
                              </div>
                            </td>
                            <td className="border border-slate-700 px-4 py-3 text-center">
                              <div className="flex items-center justify-center">
                                <BundesligaLogo 
                                  teamName={excludedPlayer.verein} 
                                  className="w-6 h-6"
                                />
                              </div>
                            </td>
                            <td className="border border-slate-700 px-4 py-3 text-center">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPositionColor(excludedPlayer.position)}`}>
                                {translatePosition(excludedPlayer.position)}
                              </span>
                            </td>
                            <td className="border border-slate-700 px-4 py-3 text-center text-slate-400 text-sm">
                              {excludedPlayer.daysSinceExclusion === 0 
                                ? 'Heute' 
                                : `${excludedPlayer.daysSinceExclusion} Tag${excludedPlayer.daysSinceExclusion === 1 ? '' : 'e'}`
                              }
                            </td>
                            <td className="border border-slate-700 px-4 py-3 text-center">
                              <button
                                onClick={() => handleIncludePlayer(excludedPlayer.id)}
                                className="w-8 h-8 flex items-center justify-center text-lg transition-opacity hover:opacity-70 border-0 outline-none bg-transparent"
                                title="Spieler wieder einschließen"
                              >
                                ✅
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="Ergebnis">
          <section className="space-y-6">
            {/* Standard Optimierung Ergebnis */}
            {optState.result && (
              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-blue-400">Standard Optimierung</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportJson(optState.result!, budget)}
                      className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                    >
                      JSON Export
                    </button>
                    <button
                      onClick={() => exportCsv(optState.result!, budget)}
                      className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                    >
                      CSV Export
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-slate-800/50 p-3 rounded">
                    <div className="text-slate-400">Formation</div>
                    <div className="text-lg font-semibold">{optState.result.formation}</div>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded">
                    <div className="text-slate-400">Erwartete Punkte</div>
                    <div className="text-lg font-semibold text-green-400">{optState.result.objective.toFixed(2)}</div>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded">
                    <div className="text-slate-400">Restbudget</div>
                    <div className="text-lg font-semibold">{formatter.format(optState.result.restbudget)}</div>
                  </div>
                </div>
                
                {/* Position-based Lineup Display */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Object.entries(groupPlayersByPosition(optState.result.lineup))
                    .sort(([a], [b]) => getPositionOrder(a) - getPositionOrder(b))
                    .map(([position, players]) => (
                      <PositionSection
                        key={position}
                        position={position}
                        players={players}
                        colorScheme="standard"
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Arena Optimierung Ergebnis */}
            {arenaOptState?.result && (
              <div className="space-y-4 rounded-xl border border-purple-800 bg-purple-900/20 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-purple-400">Arena Optimierung (150M €)</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportJson(arenaOptState.result!, 150_000_000)}
                      className="px-3 py-1 text-xs bg-purple-700 hover:bg-purple-600 rounded transition-colors"
                    >
                      JSON Export
                    </button>
                    <button
                      onClick={() => exportCsv(arenaOptState.result!, 150_000_000)}
                      className="px-3 py-1 text-xs bg-purple-700 hover:bg-purple-600 rounded transition-colors"
                    >
                      CSV Export
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-purple-800/30 p-3 rounded">
                    <div className="text-purple-300">Formation</div>
                    <div className="text-lg font-semibold">{arenaOptState.result.formation}</div>
                  </div>
                  <div className="bg-purple-800/30 p-3 rounded">
                    <div className="text-purple-300">Erwartete Punkte</div>
                    <div className="text-lg font-semibold text-green-400">{arenaOptState.result.objective.toFixed(2)}</div>
                  </div>
                  <div className="bg-purple-800/30 p-3 rounded">
                    <div className="text-purple-300">Restbudget</div>
                    <div className="text-lg font-semibold">{formatter.format(arenaOptState.result.restbudget)}</div>
                  </div>
                </div>
                
                {/* Position-based Lineup Display */}
                <div className="space-y-4">
                  {getPositionOrder().map(position => {
                    const positionPlayers = groupPlayersByPosition(arenaOptState.result.lineup)[position];
                    if (!positionPlayers || positionPlayers.length === 0) return null;
                    
                    return (
                      <PositionSection
                        key={position}
                        position={position as 'GK' | 'DEF' | 'MID' | 'FWD'}
                        players={positionPlayers}
                        colorScheme="arena"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Keine Ergebnisse */}
            {!optState.result && !arenaOptState?.result && (
              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <h2 className="text-xl font-semibold">Optimierungsergebnisse</h2>
                <p className="text-sm text-slate-400">
                  Noch keine Optimierung durchgeführt. Verwende die Buttons im Dashboard-Tab, um eine Optimierung zu starten.
                </p>
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
      
      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          isOpen={isPlayerModalOpen}
          onClose={closePlayerModal}
        />
      )}
    </div>
  );
}

function exportJson(result: OptimizationResult, budget: number) {
  const payload = {
    formation: result.formation,
    objective: result.objective,
    restbudget: result.restbudget,
    budget,
    lineup: result.lineup
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `arenahelper_${result.formation}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCsv(result: OptimizationResult, budget: number) {
  const headers = ['playerId', 'name', 'position', 'verein', 'kosten', 'p_pred', 'value'];
  const rows = result.lineup.map((player) => headers.map((key) => String(player[key as keyof typeof player] ?? '')));
  rows.unshift(headers);
  rows.push(['formation', result.formation, '', '', '', '', '']);
  rows.push(['budget', String(budget), 'restbudget', String(result.restbudget), 'objective', String(result.objective), '']);
  const csv = rows.map((row) => row.map((value) => `"${value}"`).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `arenahelper_${result.formation}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

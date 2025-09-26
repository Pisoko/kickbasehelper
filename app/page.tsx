'use client';

import { useEffect, useMemo, useState } from 'react';

import { DEFAULT_PARAMS, FORMATION_LIST } from '../lib/constants';
import { computeProjections } from '../lib/projection';
import { excludePlayer, getExcludedPlayersWithStats, includePlayer, filterExcludedPlayers } from '../lib/playerExclusion';
import type { Formation, Match, Odds, OptimizationResult, Player, ProjectionParams } from '../lib/types';
import { calculateFormationBasedStart11Probability } from '../lib/formationBasedStart11';
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

const tabs = ['Dashboard', 'Spieler-Explorer', 'Ergebnis'] as const;

const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

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
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [blacklistInput, setBlacklistInput] = useState('');
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Dashboard');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  
  // Excluded players management
  const [excludedPlayers, setExcludedPlayers] = useState<ReturnType<typeof getExcludedPlayersWithStats>>([]);
  const [showExcludedPlayers, setShowExcludedPlayers] = useState(false);
  
  // Load excluded players on mount and when players change
  useEffect(() => {
    setExcludedPlayers(getExcludedPlayersWithStats());
  }, [players]);
  
  // New state variables for player explorer
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [clubFilter, setClubFilter] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('totalPoints');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
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
            aValue = a.position;
            bValue = b.position;
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

  // Get unique positions and clubs for filters
  const uniquePositions = useMemo(() => {
    const positions = [...new Set(projections.map(p => p.position))];
    return positions.sort();
  }, [projections]);

  const uniqueClubs = useMemo(() => {
    const clubs = [...new Set(projections.map(p => p.verein))];
    return clubs.sort();
  }, [projections]);

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

  async function handleOptimize() {
    setOptState({ loading: true });
    try {
      const body = {
        spieltag,
        formation: formationMode === 'auto' ? 'auto' : formation,
        budget,
        baseMode,
        weights: {
          w_base: weights.w_base,
          w_form: weights.w_form,
          w_odds: weights.w_odds,
          w_home: weights.w_home,
          w_minutes: weights.w_minutes,
          w_risk: weights.w_risk,
          alpha: weights.alpha,
          beta: weights.beta,
          gamma: weights.gamma
        },
        blacklist
      };
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Optimierung fehlgeschlagen');
      }
      setOptState({ loading: false, result: data });
      setActiveTab('Ergebnis');
    } catch (error) {
      setOptState({ loading: false, error: (error as Error).message });
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
    <div className="space-y-6">


      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard' && (
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

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Gewichtungen</h3>
                <button type="button" className="text-xs text-emerald-400" onClick={resetWeights}>
                  Zurücksetzen
                </button>
              </div>
              <div className="space-y-4">
                {(
                  [
                    ['w_base', 'Basis'],
                    ['w_form', 'FormBoost'],
                    ['w_odds', 'OddsModifier'],
                    ['w_home', 'HomeBonus'],
                    ['w_minutes', 'MinutesWeight'],
                    ['w_risk', 'RiskPenalty']
                  ] as const
                ).map(([key, label]) => {
                  const disabled = key === 'w_minutes' && !hasMinutes;
                  return (
                    <div key={key} className={`text-sm ${disabled ? 'opacity-50' : ''}`}>
                    <div className="mb-1 flex justify-between">
                      <span>{label}</span>
                      <span className="text-slate-400">{weights[key].toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={weights[key]}
                      disabled={disabled}
                      onChange={(event) =>
                        setWeights((prev) => ({ ...prev, [key]: Number(event.target.value) }))
                      }
                      className="w-full"
                    />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ['alpha', 'α'],
                    ['beta', 'β'],
                    ['gamma', 'γ']
                  ] as const
                ).map(([key, symbol]) => (
                  <label key={key} className="flex flex-col gap-1 text-sm">
                    <span>Odds-Faktor {symbol}</span>
                    <input
                      type="number"
                      step={0.05}
                      value={weights[key]}
                      onChange={(event) =>
                        setWeights((prev) => ({ ...prev, [key]: Number(event.target.value) }))
                      }
                      className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
                    />
                  </label>
                ))}
              </div>
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
            <div>
              <h3 className="mb-2 font-semibold">Blacklist</h3>
              <div className="flex gap-2">
                <input
                  value={blacklistInput}
                  onChange={(event) => setBlacklistInput(event.target.value)}
                  placeholder="Spieler suchen"
                  className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleBlacklistAdd(blacklistInput)}
                  className="rounded bg-slate-700 px-3 py-2 text-sm"
                  disabled={!blacklistInput}
                >
                  Hinzufügen
                </button>
              </div>
              {suggestions.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  {suggestions.map((player) => (
                    <li key={player.id}>
                      <button
                        type="button"
                        className="hover:text-emerald-300"
                        onClick={() => handleBlacklistAdd(player.name)}
                      >
                        {player.name} ({getFullTeamName(player.verein)})
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {blacklist.map((name) => (
                  <span key={name} className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs">
                    {name}
                    <button type="button" onClick={() => handleBlacklistRemove(name)} className="text-emerald-400">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleOptimize}
              className="w-full rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-emerald-300"
              disabled={optState.loading}
            >
              {optState.loading ? 'Rechne ...' : 'Optimieren'}
            </button>
            {optState.error && <p className="text-sm text-red-400">{optState.error}</p>}
          </div>
        </section>
      )}

      {activeTab === 'Spieler-Explorer' && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Spieler Explorer</h2>
            </div>
            
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
                    <option key={pos} value={pos}>{translatePosition(pos)}</option>
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
                    <option key={club} value={club}>{getFullTeamName(club)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results count */}
            <div className="mb-4 text-sm text-slate-400">
              {filteredAndSortedPlayers.length} von {projections.length} Spielern
              {filteredAndSortedPlayers.length > 0 && (
                <span className="ml-2">
                  (Seite {currentPage} von {totalPages})
                </span>
              )}
            </div>

            {/* Player Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-700">
                    <th 
                      className="px-3 py-3 cursor-pointer hover:text-slate-200 transition-colors"
                      onClick={() => handleSort('position')}
                    >
                      Position {getSortIndicator('position')}
                    </th>
                    <th className="px-3 py-3">{/* Image column - no header */}</th>
                    <th 
                      className="px-3 py-3 cursor-pointer hover:text-slate-200 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      Name {getSortIndicator('name')}
                    </th>
                    <th 
                      className="px-3 py-3 cursor-pointer hover:text-slate-200 transition-colors"
                      onClick={() => handleSort('club')}
                    >
                      Verein {getSortIndicator('club')}
                    </th>
                    <th 
                      className="px-3 py-3 cursor-pointer hover:text-slate-200 transition-colors"
                      onClick={() => handleSort('marketValue')}
                    >
                      Marktwert in Mio € {getSortIndicator('marketValue')}
                    </th>
                    <th 
                      className="px-3 py-3 cursor-pointer hover:text-slate-200 transition-colors"
                      onClick={() => handleSort('totalPoints')}
                    >
                      Gesamtpunkte {getSortIndicator('totalPoints')}
                    </th>
                    <th 
                      className="px-3 py-3 cursor-pointer hover:text-slate-200 transition-colors"
                      onClick={() => handleSort('pointsPerMinute')}
                    >
                      Punkte/Min {getSortIndicator('pointsPerMinute')}
                    </th>
                    <th 
                      className="px-3 py-3 cursor-pointer hover:text-slate-200 transition-colors"
                      onClick={() => handleSort('pointsPerMillion')}
                    >
                      Punkte/Mio € {getSortIndicator('pointsPerMillion')}
                    </th>
                    <th 
                      className="px-3 py-3 cursor-pointer hover:text-slate-200 transition-colors"
                      onClick={() => handleSort('startingElevenProbability')}
                    >
                      Startelf-Chance {getSortIndicator('startingElevenProbability')}
                    </th>
                    <th className="px-3 py-3">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPlayers.map((player) => (
                    <tr 
                      key={player.id} 
                      className="border-t border-slate-800 hover:bg-slate-800 cursor-pointer transition-colors"
                      onClick={() => handlePlayerClick(player)}
                    >
                      {/* Position */}
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-6 bg-slate-700 text-slate-200 rounded text-xs font-medium">
                          {translatePosition(player.position)}
                        </span>
                      </td>
                      
                      {/* Player Image */}
                      <td className="px-3 py-3">
                        <PlayerImage 
                          playerImageUrl={player.playerImageUrl}
                          playerName={getFullPlayerName(player)}
                          size="md"
                        />
                      </td>
                      
                      {/* Player Name */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span 
                            className={`font-medium ${getPlayerNameColor(player.status, player.isInjured)}`}
                          >
                            {getFullPlayerName(player)}
                          </span>
                          {player.isInjured && (
                            <span className="text-red-500 text-xs">🤕 Verletzt</span>
                          )}
                          {!player.isInjured && getStatusWithEmoji(player.status, player.isInjured) && (
                            <span className={`${getStatusEmojiColor(player.status, player.isInjured)} text-xs`}>{getStatusWithEmoji(player.status, player.isInjured)}</span>
                          )}
                        </div>
                      </td>
                      
                      {/* Club */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center">
                          <BundesligaLogo 
                            teamName={player.verein} 
                            size="md"
                          />
                        </div>
                      </td>
                      
                      {/* Market Value */}
                      <td className="px-3 py-3 font-medium text-emerald-400">
                        {player.kosten ? formatMarketValue(player.kosten) : '-'}
                      </td>
                      
                      {/* Total Points */}
                      <td className="px-3 py-3 font-semibold text-blue-400">
                        {player.punkte_sum || 0}
                      </td>
                      
                      {/* Points per Minute */}
                      <td className="px-3 py-3 text-slate-300">
                        {calculatePointsPerMinute(player)}
                      </td>
                      
                      {/* Points per Million € */}
                      <td className="px-3 py-3 text-yellow-400">
                        {calculatePointsPerMillion(player)}
                      </td>
                      
                      {/* Starting Eleven Probability */}
                       <td className="px-3 py-3">
                         {(() => {
                           const probability = newStart11Probabilities.get(player.id) || 0;
                           const formatted = formatStartingElevenProbability(probability);
                           return (
                             <span 
                               className={`font-medium ${formatted.color} cursor-help`}
                               title={`${probability.toFixed(1)}% Wahrscheinlichkeit`}
                             >
                               {formatted.text}
                             </span>
                           );
                         })()}
                       </td>
                      
                      {/* Actions */}
                      <td className="px-3 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            handleExcludePlayer(player);
                          }}
                          className="w-8 h-8 flex items-center justify-center text-lg hover:bg-red-600 hover:text-white rounded transition-colors"
                          title="auf blacklist setzen"
                        >
                          🚫
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredAndSortedPlayers.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  Keine Spieler gefunden. Versuchen Sie andere Suchkriterien.
                </div>
              )}
              
              {filteredAndSortedPlayers.length > 0 && paginatedPlayers.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  Keine Spieler auf dieser Seite. Gehen Sie zu einer anderen Seite.
                </div>
              )}
            </div>

            {/* Excluded Players Section */}
            {excludedPlayers.length > 0 && (
              <div className="mt-8 border-t border-slate-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Ausgeschlossene Spieler ({excludedPlayers.length})
                  </h3>
                  <button
                    onClick={() => setShowExcludedPlayers(!showExcludedPlayers)}
                    className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                  >
                    {showExcludedPlayers ? 'Ausblenden' : 'Anzeigen'}
                  </button>
                </div>
                
                {showExcludedPlayers && (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="grid gap-2">
                      {excludedPlayers.map((excludedPlayer) => (
                        <div
                          key={excludedPlayer.id}
                          className="flex items-center justify-between p-3 bg-slate-700 rounded border border-slate-600"
                        >
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center justify-center w-8 h-6 bg-slate-600 text-slate-200 rounded text-xs font-medium">
                              {translatePosition(excludedPlayer.position)}
                            </span>
                            <div>
                              <div className="font-medium text-white">{excludedPlayer.name}</div>
                              <div className="text-sm text-slate-400">
                                {getFullTeamName(excludedPlayer.verein)} • Ausgeschlossen vor {excludedPlayer.daysSinceExclusion} Tag{excludedPlayer.daysSinceExclusion !== 1 ? 'en' : ''}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleIncludePlayer(excludedPlayer.id)}
                            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                          >
                            Wieder einschließen
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pagination controls at bottom */}
            {filteredAndSortedPlayers.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Players per page selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">Pro Seite:</label>
                    <select
                      value={playersPerPage}
                      onChange={(e) => setPlayersPerPage(Number(e.target.value))}
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                
                {/* Pagination buttons */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm rounded border border-slate-700 bg-slate-950 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                    >
                      ← Zurück
                    </button>
                    
                    <span className="text-sm text-slate-400 px-2">
                      {currentPage} / {totalPages}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm rounded border border-slate-700 bg-slate-950 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                    >
                      Weiter →
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

      {activeTab === 'Ergebnis' && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Optimale Startelf</h2>
              {optState.result ? (
                <p className="text-sm text-slate-400">
                  Auto-Formation gewählt: {optState.result.formation} • Gesamt: {optState.result.objective.toFixed(2)} • Restbudget:{' '}
                  {formatter.format(optState.result.restbudget)}
                </p>
              ) : (
                <p className="text-sm text-slate-400">Noch keine Berechnung durchgeführt.</p>
              )}
            </div>
            {optState.result && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => exportJson(optState.result!, budget)}
                  className="rounded border border-slate-700 px-3 py-2 text-sm"
                >
                  JSON Export
                </button>
                <button
                  type="button"
                  onClick={() => exportCsv(optState.result!, budget)}
                  className="rounded border border-slate-700 px-3 py-2 text-sm"
                >
                  CSV Export
                </button>
                <button type="button" className="rounded border border-emerald-500 px-3 py-2 text-sm" onClick={handleOptimize}>
                  Neu rechnen
                </button>
              </div>
            )}
          </div>

          {optState.result && (
            <div className="mt-4 grid gap-4 lg:grid-cols-4">
              {['GK', 'DEF', 'MID', 'FWD'].map((pos) => (
                <div key={pos} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    {pos} • {formationSummary[pos] ?? 0}
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {optState.result?.lineup
                      .filter((player) => player.position === pos)
                      .map((player) => (
                        <li key={player.playerId} className="rounded bg-slate-800/60 px-3 py-2">
                          <div className="font-semibold text-emerald-200">{player.name}</div>
                          <div className="text-xs text-slate-400">{getFullTeamName(player.verein)}</div>
                          <div className="mt-1 flex justify-between text-xs text-slate-300">
                            <span>Pᵢ: {player.p_pred.toFixed(2)}</span>
                            <span>Kosten: {formatter.format(player.kosten)}</span>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      
      {/* Player Detail Modal */}
      <PlayerDetailModal
        player={selectedPlayer}
        isOpen={isPlayerModalOpen}
        onClose={closePlayerModal}
      />
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

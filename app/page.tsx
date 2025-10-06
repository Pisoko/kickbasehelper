'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import PlayerDetailModal from '../components/PlayerDetailModal';
import PlayerImage from '../components/PlayerImage';
import PlayerStatusTag, { isPlayerFit, getRowTextColor } from '../components/PlayerStatusTag';
import BundesligaLogo from '../components/BundesligaLogo';
import AppHeader from '../components/AppHeader';
import MatchdayMonitor from '../components/MatchdayMonitor';
import MatchdayOverview from '../components/MatchdayOverview';
import TeamOverview from '../components/TeamOverview';
import { Arena } from '../components/arena/Arena';
import TeamOddsManager from '../components/TeamOddsManager';
import { getFullTeamName } from '../lib/teamMapping';
import type { Player, Match } from '../lib/types';
import { 
  getGermanPosition, 
  getPositionColorClasses, 
  getOrderedGermanPositions,
  calculatePointsPerMinute,
  calculatePointsPerMillion,
  calculateXFactor,
  type GermanPosition 
} from '../lib/positionUtils';
import { 
  getPlayerDataCache, 
  setPlayerDataCache, 
  isPlayerDataCacheValid,
  type PlayerCacheData 
} from '../lib/cache';
import { optimizedFetch } from '../lib/requestDeduplication';
import { cachedFetch } from '../lib/apiCache';
import { SmartPagination } from '../components/ui/smart-pagination';
import { cn } from '../lib/utils';
import { exportPlayersToExcel, getFilteredPlayersCount } from '../lib/excelExport';



interface CacheInfo {
  updatedAt?: string;
  cacheAgeDays?: number | null;
}

const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

type TabType = 'players' | 'matchday' | 'teams' | 'arena' | 'team-odds';

export default function PlayerHubPage() {
  const [activeTab, setActiveTab] = useState<TabType>('players');
  const [spieltag, setSpieltag] = useState(4);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [playerLast3GamesData, setPlayerLast3GamesData] = useState<Map<string, PlayerLast3GamesData>>(new Map());
  const [isLoadingMatchday, setIsLoadingMatchday] = useState(false);
  
  // Spieler Hub Filter-Zustände
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [clubFilter, setClubFilter] = useState<string>('');
  const [showStart11Only, setShowStart11Only] = useState(false);
  const [sortColumn, setSortColumn] = useState<'name' | 'position' | 'verein' | 'kosten' | 'punkte_avg' | 'punkte_sum' | 'pointsPerMinute' | 'pointsPerMillion' | 'xFactor'>('punkte_sum');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 20;

  // Memoized unique values for filters
  const uniquePositions = useMemo(() => {
    // Use ordered German positions
    return getOrderedGermanPositions();
  }, []);

  const uniqueClubs = useMemo(() => {
    const clubs = [...new Set(players.map(p => p.verein))];
    return clubs.sort();
  }, [players]);

  // Function to get current matchday from API
  const getCurrentMatchday = useCallback(async () => {
    setIsLoadingMatchday(true);
    try {
      const response = await fetch('/api/matchday/check');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.currentMatchday) {
          const currentMatchday = data.data.currentMatchday;
          console.log(`Aktueller Spieltag erkannt: ${currentMatchday}`);
          setSpieltag(currentMatchday);
          return currentMatchday;
        }
      }
    } catch (error) {
      console.error('Fehler beim Ermitteln des aktuellen Spieltags:', error);
    } finally {
      setIsLoadingMatchday(false);
    }
    return spieltag; // Fallback to current value
  }, [spieltag]);

  // Function to load player and match data with caching
  const loadData = useCallback(async (forceRefresh = false) => {
    setLoadingData(true);
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh && isPlayerDataCacheValid()) {
        const cachedData = getPlayerDataCache();
        if (cachedData) {
          setPlayers(cachedData.players || []);
          setMatches(cachedData.matches || []);
          setCacheInfo({
            updatedAt: cachedData.updatedAt,
            cacheAgeDays: cachedData.cacheAgeDays
          });
          setLoadingData(false);
          return;
        }
      }

      // Fetch fresh data with request deduplication and enhanced caching
      const [playersRes, matchesRes] = await Promise.all([
        forceRefresh 
          ? fetch(`/api/players?spieltag=${spieltag}&refresh=true`).then(res => res.json())
          : cachedFetch<{players: Player[], updatedAt: string, cacheAgeDays: number | null}>(`/api/players?spieltag=${spieltag}`, 'players'),
        forceRefresh
          ? fetch(`/api/matches?spieltag=${spieltag}&refresh=true`).then(res => res.json())
          : cachedFetch<{matches: Match[], updatedAt: string}>(`/api/matches?spieltag=${spieltag}`, 'matches')
      ]);
      
      const playerData = (playersRes.players as Player[]) || [];
      const matchData = (matchesRes.matches as Match[]) || [];
      
      setPlayers(playerData);
      setMatches(matchData);
      setCacheInfo({
        updatedAt: playersRes.updatedAt,
        cacheAgeDays: playersRes.cacheAgeDays
      });

      // Cache the data
      const cacheData: PlayerCacheData = {
        players: playerData,
        matches: matchData,
        updatedAt: playersRes.updatedAt,
        cacheAgeDays: playersRes.cacheAgeDays
      };
      setPlayerDataCache(cacheData);
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  }, [spieltag]);

  // Get current matchday on component mount
  useEffect(() => {
    getCurrentMatchday();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Modal handlers
  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
    setIsPlayerModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsPlayerModalOpen(false);
    setSelectedPlayer(null);
  };

  // Filtered and sorted players
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchesSearch = searchTerm === '' || 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.verein.toLowerCase().includes(searchTerm.toLowerCase());
      // Convert position to German for filtering
      const germanPosition = getGermanPosition(player.position as any);
      const matchesPosition = positionFilter === '' || germanPosition === positionFilter;
      const matchesClub = clubFilter === '' || player.verein === clubFilter;
      
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
      
      return matchesSearch && matchesPosition && matchesClub && start11Match;
    });
  }, [players, searchTerm, positionFilter, clubFilter, showStart11Only, playerLast3GamesData]);

  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      // Handle calculated columns
      if (sortColumn === 'pointsPerMinute') {
        aValue = calculatePointsPerMinute(a.punkte_sum || 0, a.totalMinutesPlayed || 0);
        bValue = calculatePointsPerMinute(b.punkte_sum || 0, b.totalMinutesPlayed || 0);
      } else if (sortColumn === 'pointsPerMillion') {
        aValue = calculatePointsPerMillion(a.punkte_sum || 0, a.marketValue || 0);
        bValue = calculatePointsPerMillion(b.punkte_sum || 0, b.marketValue || 0);
      } else if (sortColumn === 'xFactor') {
        aValue = calculateXFactor(a.punkte_sum || 0, a.totalMinutesPlayed || 0, a.marketValue || a.kosten || 0, a.verein || '');
        bValue = calculateXFactor(b.punkte_sum || 0, b.totalMinutesPlayed || 0, b.marketValue || b.kosten || 0, b.verein || '');
      } else if (sortColumn === 'position') {
        // Use position order for sorting (TW, ABW, MF, ANG)
        const positionOrder = getOrderedGermanPositions();
        const aGermanPos = getGermanPosition(a.position as any);
        const bGermanPos = getGermanPosition(b.position as any);
        aValue = positionOrder.indexOf(aGermanPos);
        bValue = positionOrder.indexOf(bGermanPos);
      } else {
        aValue = a[sortColumn as keyof Player];
        bValue = b[sortColumn as keyof Player];
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredPlayers, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedPlayers.length / playersPerPage);
  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * playersPerPage;
    return sortedPlayers.slice(startIndex, startIndex + playersPerPage);
  }, [sortedPlayers, currentPage, playersPerPage]);
  
  // Lade die Last-3-Games-Daten für die angezeigten Spieler
  useEffect(() => {
    async function loadLast3GamesData() {
      const newData = new Map<string, PlayerLast3GamesData>(playerLast3GamesData);
      let dataChanged = false;
      
      // Lade die Daten für alle angezeigten Spieler
      for (const player of paginatedPlayers) {
        if (!newData.has(player.id)) {
          const last3GamesData = await getPlayerLast3GamesData(player.id);
          newData.set(player.id, last3GamesData);
          dataChanged = true;
        }
      }
      
      // Aktualisiere den State nur, wenn sich die Daten geändert haben
      if (dataChanged) {
        setPlayerLast3GamesData(newData);
      }
    }
    
    loadLast3GamesData();
  }, [paginatedPlayers, playerLast3GamesData]);

  const handleSort = (column: typeof sortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };



  return (
    <>
      <AppHeader 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={() => loadData(true)}
      />
      <div className="container mx-auto max-w-7xl space-y-6 py-4 px-4 sm:py-8 sm:px-6">

      {/* Matchday Monitor - ausgeblendet auf Benutzerwunsch */}
      {false && (
        <MatchdayMonitor 
          onMatchdayUpdate={(newMatchday) => {
            console.log(`Neuer Spieltag erkannt: ${newMatchday}`);
            // Refresh player data when new matchday is detected
            loadData(true);
          }}
        />
      )}

      {/* Tab Content */}
      {activeTab === 'players' && (
        <section className="space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Spieler Übersicht</h2>
            <div className="text-sm text-slate-400">
              {isLoadingMatchday ? (
                <span>Spieltag wird ermittelt...</span>
              ) : (
                <span>Spieltag {spieltag}</span>
              )}
            </div>
          </div>
          
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Suche</label>
              <input
                type="text"
                placeholder="Name oder Verein..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Position</label>
              <select
                value={positionFilter}
                onChange={(e) => {
                  setPositionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
              >
                <option value="">Alle Positionen</option>
                {uniquePositions.map(pos => (
                  <option 
                    key={pos} 
                    value={pos}
                    className={getPositionColorClasses(pos)}
                  >
                    {pos}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Verein</label>
              <select
                value={clubFilter}
                onChange={(e) => {
                  setClubFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
              >
                <option value="">Alle Vereine</option>
                {uniqueClubs.map(club => (
                  <option key={club} value={club}>{getFullTeamName(club)}</option>
                ))}
              </select>
            </div>
            
            {/* Start 11 Filter */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="start11Filter"
                checked={showStart11Only}
                onChange={(e) => setShowStart11Only(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="start11Filter" className="text-sm font-medium text-gray-700">
                Nur Letztes Spiel Start-11
              </label>
            </div>
            
            <div className="flex items-end space-x-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setPositionFilter('');
                  setClubFilter('');
                  setCurrentPage(1);
                }}
                className="flex-1 rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600"
              >
                Filter zurücksetzen
              </button>
              <button
                onClick={() => {
                  exportPlayersToExcel(players, playerLast3GamesData);
                }}
                className="flex-1 rounded bg-green-700 px-3 py-2 text-sm hover:bg-green-600 flex items-center justify-center"
                title={`Excel-Export: ${getFilteredPlayersCount(players, playerLast3GamesData)} Spieler (fit/angeschlagen + Start11)`}
              >
                📊 Excel Export
              </button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4 text-sm text-slate-400">
            {filteredPlayers.length} von {players.length} Spielern
          </div>

          {/* Player Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-2">Spieler</th>
                  <th 
                    className="text-center py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('verein')}
                  >
                    Verein {sortColumn === 'verein' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-center py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('position')}
                  >
                    Position {sortColumn === 'position' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-center py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('kosten')}
                  >
                    Marktwert {sortColumn === 'kosten' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-center py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('punkte_sum')}
                  >
                    Punkte {sortColumn === 'punkte_sum' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-center py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('punkte_avg')}
                  >
                    Ø Punkte {sortColumn === 'punkte_avg' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-center py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('pointsPerMinute')}
                  >
                    Punkte/Min {sortColumn === 'pointsPerMinute' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-center py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('pointsPerMillion')}
                  >
                    Punkte/Mio€ {sortColumn === 'pointsPerMillion' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-center py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('xFactor')}
                  >
                    X-Faktor {sortColumn === 'xFactor' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-center py-3 px-2 cursor-help"
                    title="🟢 Start-11 | 🔴 Nicht Start-11"
                  >
                    <div className="flex items-center justify-center">
                      <span>Letzte Start-11</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlayers.map((player) => {
                  const playerFit = isPlayerFit(player.status, player.isInjured);
                  const rowTextColor = getRowTextColor(player.status, player.isInjured);
                  
                  return (
                    <tr 
                      key={player.id}
                      className={`border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer ${rowTextColor}`}
                      onClick={() => handlePlayerClick(player)}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-3">
                          <PlayerImage 
                            playerImageUrl={player.playerImageUrl} 
                            playerName={player.name}
                            className="h-11 w-11 rounded-full" 
                          />
                          <div>
                            <div className="font-medium">{player.name}</div>
                            {!playerFit && (
                              <PlayerStatusTag status={player.status} isInjured={player.isInjured} />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center">
                          <BundesligaLogo teamName={player.verein} size="sm" className="!h-14 !w-14" />
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPositionColorClasses(getGermanPosition(player.position as any))}`}>
                            {getGermanPosition(player.position as any)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-medium">
                        {formatter.format(player.kosten)}
                      </td>
                      <td className="py-3 px-2 text-center font-medium">
                        {player.punkte_sum}
                      </td>
                      <td className="py-3 px-2 text-center font-medium">
                        {Math.round(player.punkte_avg)}
                      </td>
                      <td className="py-3 px-2 text-center font-medium">
                        {calculatePointsPerMinute(player.punkte_sum || 0, player.totalMinutesPlayed || 0).toFixed(1)}
                      </td>
                      <td className="py-3 px-2 text-center font-medium">
                        {calculatePointsPerMillion(player.punkte_sum || 0, player.marketValue || 0).toFixed(1)}
                      </td>
                      <td className="py-3 px-2 text-center font-medium">
                        {calculateXFactor(player.punkte_sum || 0, player.totalMinutesPlayed || 0, player.marketValue || player.kosten || 0, player.verein || '').toFixed(1)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <SmartPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
        </section>
      )}

      {/* Matchday Overview Tab */}
      {activeTab === 'matchday' && (
        <MatchdayOverview />
      )}

      {/* Team Overview Tab */}
      {activeTab === 'teams' && (
        <TeamOverview />
      )}

      {/* Arena Tab */}
      {activeTab === 'arena' && (
        <Arena />
      )}

      {/* Team Odds Management Tab */}
      {activeTab === 'team-odds' && (
        <TeamOddsManager />
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          isOpen={isPlayerModalOpen}
          onClose={closePlayerModal}
        />
      )}
      </div>
    </>
  );
}

/**
 * Erstellt die farbigen Blöcke für die letzten 3 Spiele
 * 
 * @param data - PlayerLast3GamesData mit den Informationen zu den letzten 3 Spielen
 * @returns JSX-Element mit den farbigen Blöcken
 */
function getLast3GamesBlocks(data: PlayerLast3GamesData): JSX.Element {
  return (
    <div className="flex space-x-1 justify-center">
      {data.last3Games.map((isStart11, index) => {
        const gameNumber = 3 - index; // 3. letztes, 2. letztes, letztes Spiel
        const gameLabel = gameNumber === 3 ? "Drittletztes Spiel" : 
                         gameNumber === 2 ? "Vorletztes Spiel" : "Letztes Spiel";
        
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

// Interface für die Spieldaten der letzten 3 Spiele
interface PlayerLast3GamesData {
  playerId: string;
  last3Games: boolean[]; // true = Start-11, false = keine Start-11
  totalGames: number;
}

// Cache für die Spieldaten der letzten 3 Spiele
const last3GamesDataCache = new Map<string, PlayerLast3GamesData>();

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
    console.error(`Fehler beim Abrufen der Spieldaten für Spieler ${playerId}:`, error);
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

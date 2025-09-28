'use client';

import { useEffect, useMemo, useState } from 'react';
import PlayerDetailModal from '../components/PlayerDetailModal';
import PlayerImage from '../components/PlayerImage';
import PlayerStatusTag from '../components/PlayerStatusTag';
import BundesligaLogo from '../components/BundesligaLogo';
import { getFullTeamName } from '../lib/teamMapping';
import type { Player, Match } from '../lib/types';
import { 
  getPlayerDataCache, 
  setPlayerDataCache, 
  isPlayerDataCacheValid,
  type PlayerCacheData 
} from '../lib/cache';

interface CacheInfo {
  updatedAt?: string;
  cacheAgeDays?: number | null;
}

const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export default function PlayerHubPage() {
  const [spieltag, setSpieltag] = useState(4);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  
  // Spieler Hub Filter-Zustände
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [clubFilter, setClubFilter] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<'name' | 'position' | 'verein' | 'kosten' | 'punkte_avg' | 'punkte_sum'>('punkte_avg');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 20;

  // Memoized unique values for filters
  const uniquePositions = useMemo(() => {
    const positions = [...new Set(players.map(p => p.position))];
    return positions.sort();
  }, [players]);

  const uniqueClubs = useMemo(() => {
    const clubs = [...new Set(players.map(p => p.verein))];
    return clubs.sort();
  }, [players]);

  // Function to load player and match data with caching
  const loadData = async (forceRefresh = false) => {
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

      // Fetch fresh data
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
  };

  useEffect(() => {
    loadData();
  }, [spieltag]);

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
      const matchesPosition = positionFilter === '' || player.position === positionFilter;
      const matchesClub = clubFilter === '' || player.verein === clubFilter;
      
      return matchesSearch && matchesPosition && matchesClub;
    });
  }, [players, searchTerm, positionFilter, clubFilter]);

  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];
      
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

  const handleSort = (column: typeof sortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  async function handleRefresh() {
    await loadData(true);
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-4 px-4 sm:py-8 sm:px-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-white">Spieler Hub</h1>
          <button
            onClick={handleRefresh}
            disabled={loadingData}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loadingData ? 'Lade...' : 'Daten aktualisieren'}
          </button>
        </div>
        <p className="text-slate-400">Entdecke und analysiere alle Bundesliga-Spieler für dein Kickbase-Team.</p>
      </div>

      {/* Data Status and Controls */}
      <div className="grid gap-6 lg:grid-cols-2">
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
          <div className="text-sm text-slate-400">
            Verwende den Button oben rechts zum Aktualisieren der Daten.
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-xl font-semibold">Spieltag</h2>
          <p className="text-sm text-slate-400">
            Aktueller Spieltag für die Analyse
          </p>
          <input
            type="number"
            min={1}
            value={spieltag}
            onChange={(event) => setSpieltag(Number(event.target.value))}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </div>
      </div>

      {/* Player Hub Content */}
      <section className="space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-xl font-semibold mb-4">Spieler Übersicht</h2>
          
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
                  <option key={pos} value={pos}>{pos}</option>
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
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setPositionFilter('');
                  setClubFilter('');
                  setCurrentPage(1);
                }}
                className="w-full rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600"
              >
                Filter zurücksetzen
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
                    className="text-left py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('position')}
                  >
                    Position {sortColumn === 'position' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('verein')}
                  >
                    Verein {sortColumn === 'verein' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-right py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('kosten')}
                  >
                    Kosten {sortColumn === 'kosten' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-right py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('punkte_avg')}
                  >
                    Ø Punkte {sortColumn === 'punkte_avg' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-right py-3 px-2 cursor-pointer hover:text-white"
                    onClick={() => handleSort('punkte_sum')}
                  >
                    Gesamt {sortColumn === 'punkte_sum' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlayers.map((player) => (
                  <tr 
                    key={player.id} 
                    className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => handlePlayerClick(player)}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-3">
                        <PlayerImage 
                          playerImageUrl={player.playerImageUrl} 
                          playerName={player.name}
                          className="h-10 w-10 rounded-full" 
                        />
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <PlayerStatusTag status={player.status} isInjured={player.isInjured} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-700 text-slate-200">
                        {player.position}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-2">
                        <BundesligaLogo teamName={player.verein} size="sm" />
                        <span className="text-sm">{getFullTeamName(player.verein)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-medium">
                      {formatter.format(player.kosten)}
                    </td>
                    <td className="py-3 px-2 text-right font-medium">
                      {player.punkte_avg.toFixed(1)}
                    </td>
                    <td className="py-3 px-2 text-right font-medium">
                      {player.punkte_sum}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Seite {currentPage} von {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zurück
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

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

'use client';

import { useState, useEffect } from 'react';
import { optimizedFetch } from '../lib/requestDeduplication';

interface MatchEvent {
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty';
  minute: number;
  playerId: string;
  playerName: string;
  description: string;
}

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: 'live' | 'finished' | 'scheduled' | 'halftime';
  events: MatchEvent[];
  kickoff: string;
  competition: string;
}

interface LiveMatchDataProps {
  refreshInterval?: number;
  maxMatches?: number;
}

export function LiveMatchData({ 
  refreshInterval = 60000, // 1 minute default
  maxMatches = 10 
}: LiveMatchDataProps) {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveMatches = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await optimizedFetch('/api/live-matches');
      setMatches(data.matches || []);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Live-Spiele');
      console.error('Live matches fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMatches();
    
    const interval = setInterval(fetchLiveMatches, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return '🔴';
      case 'halftime':
        return '⏸️';
      case 'finished':
        return '✅';
      case 'scheduled':
        return '⏰';
      default:
        return '⚽';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live':
        return 'Live';
      case 'halftime':
        return 'Halbzeit';
      case 'finished':
        return 'Beendet';
      case 'scheduled':
        return 'Geplant';
      default:
        return 'Unbekannt';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'goal':
        return '⚽';
      case 'yellow_card':
        return '🟨';
      case 'red_card':
        return '🟥';
      case 'substitution':
        return '🔄';
      case 'penalty':
        return '🥅';
      default:
        return '📝';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          ⚽ Live Spiele
        </h2>
        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Letztes Update: {lastUpdate.toLocaleTimeString('de-DE')}
            </span>
          )}
          <button
            onClick={fetchLiveMatches}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '🔄 Aktualisiere...' : '🔄 Aktualisieren'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {loading && matches.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin text-2xl mb-2">⚽</div>
          <p className="text-gray-600">Lade Live-Spiele...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Keine Live-Spiele verfügbar</p>
          <p className="text-sm text-gray-500 mt-2">
            Aktuell finden keine Spiele statt
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.slice(0, maxMatches).map((match) => (
            <div
              key={match.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getStatusIcon(match.status)}</span>
                  <span className="text-sm font-medium text-gray-600">
                    {getStatusText(match.status)}
                  </span>
                  {match.status === 'live' && (
                    <span className="text-sm text-green-600 font-bold">
                      {match.minute}&apos;
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {match.competition}
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 text-right">
                  <div className="font-semibold text-gray-900">
                    {match.homeTeam}
                  </div>
                </div>
                <div className="mx-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {match.homeScore} : {match.awayScore}
                  </div>
                  {match.status === 'scheduled' && (
                    <div className="text-sm text-gray-500">
                      {formatTime(match.kickoff)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {match.awayTeam}
                  </div>
                </div>
              </div>

              {match.events.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Ereignisse:
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {match.events
                      .sort((a, b) => b.minute - a.minute)
                      .slice(0, 5)
                      .map((event, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 text-sm"
                        >
                          <span className="w-8 text-center text-gray-500">
                            {event.minute}&apos;
                          </span>
                          <span>{getEventIcon(event.type)}</span>
                          <span className="text-gray-700">
                            {event.playerName}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {event.description}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">📊 Spielübersicht</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-red-600">
                  {matches.filter(m => m.status === 'live').length}
                </div>
                <div className="text-sm text-gray-600">Live</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {matches.filter(m => m.status === 'halftime').length}
                </div>
                <div className="text-sm text-gray-600">Halbzeit</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {matches.filter(m => m.status === 'finished').length}
                </div>
                <div className="text-sm text-gray-600">Beendet</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {matches.filter(m => m.status === 'scheduled').length}
                </div>
                <div className="text-sm text-gray-600">Geplant</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
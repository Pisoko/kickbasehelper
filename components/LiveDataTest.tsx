'use client';

import { useState } from 'react';

interface LiveDataResponse {
  success: boolean;
  data?: {
    players: any[];
    matches: any[];
    config: any;
    timestamp: string;
    source: string;
  };
  error?: string;
  message?: string;
}

export function LiveDataTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<LiveDataResponse | null>(null);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  const fetchLiveData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/season/live');
      const result: LiveDataResponse = await response.json();
      setData(result);
      setLastFetch(new Date().toLocaleString('de-DE'));
    } catch (error) {
      setData({
        success: false,
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLiveData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/season/live', { method: 'POST' });
      const result: LiveDataResponse = await response.json();
      setData(result);
      setLastFetch(new Date().toLocaleString('de-DE'));
    } catch (error) {
      setData({
        success: false,
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-slate-700/50">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-white">
          🏆 Live Kickbase API Test
        </h2>
        <p className="text-slate-300 mb-4">
          Teste die Integration mit der echten Kickbase API für Live-Daten
        </p>
        
        <div className="flex gap-2 mb-4">
          <button 
            onClick={fetchLiveData} 
            disabled={isLoading || isRefreshing}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200"
          >
            {isLoading ? '⏳' : '👥'} Live-Daten abrufen
          </button>
          
          <button 
            onClick={refreshLiveData} 
            disabled={isLoading || isRefreshing}
            className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200"
          >
            {isRefreshing ? '⏳' : '🔄'} Daten aktualisieren
          </button>
        </div>

        {lastFetch && (
          <p className="text-sm text-slate-400 flex items-center gap-2">
            📅 Letzter Abruf: {lastFetch}
          </p>
        )}
      </div>

      {data && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
            {data.success ? '✅' : '❌'} API Response
          </h3>
          
          {data.success && data.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50">
                  <div className="text-2xl font-bold text-white">{data.data.players.length}</div>
                  <p className="text-sm text-slate-300">Spieler geladen</p>
                </div>
                
                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50">
                  <div className="text-2xl font-bold text-white">{data.data.matches.length}</div>
                  <p className="text-sm text-slate-300">Spiele geladen</p>
                </div>
                
                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded text-sm inline-block">
                    {data.data.source}
                  </div>
                  <p className="text-sm text-slate-300 mt-1">Datenquelle</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-white">Beispiel Spieler (erste 5):</h4>
                <div className="space-y-2">
                  {data.data.players.slice(0, 5).map((player, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div>
                        <span className="font-medium text-white">{player.name}</span>
                        <span className="ml-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded text-xs">
                          {player.position}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-200">{player.verein}</div>
                        <div className="text-xs text-slate-400">
                          {player.marketValue ? `${player.marketValue.toLocaleString()}€` : 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-400 border-t border-slate-600/50 pt-2">
                <p>Timestamp: {data.data.timestamp}</p>
                <p>Quelle: {data.data.source}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-red-400 font-medium">
                Fehler: {data.error}
              </div>
              {data.message && (
                <div className="text-sm text-slate-300">
                  {data.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
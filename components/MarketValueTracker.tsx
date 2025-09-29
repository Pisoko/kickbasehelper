'use client';

import { useState, useEffect, useCallback } from 'react';
import { optimizedFetch } from '../lib/requestDeduplication';

interface MarketValueData {
  playerId: string;
  playerName: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

interface MarketValueTrackerProps {
  playerIds?: string[];
  refreshInterval?: number; // in milliseconds
}

export function MarketValueTracker({ 
  playerIds = [], 
  refreshInterval = 300000 // 5 minutes default
}: MarketValueTrackerProps) {
  const [marketData, setMarketData] = useState<MarketValueData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketValues = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await optimizedFetch('/api/market-values', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerIds }),
      });
      setMarketData(data.marketValues || []);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Marktwerte');
      console.error('Market value fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [playerIds]);

  useEffect(() => {
    fetchMarketValues();
    
    const interval = setInterval(fetchMarketValues, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMarketValues, refreshInterval]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${formatCurrency(change)} (${sign}${changePercent.toFixed(1)}%)`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-slate-700/50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">
          📊 Live Marktwerte
        </h2>
        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <span className="text-sm text-slate-400">
              Letztes Update: {lastUpdate.toLocaleTimeString('de-DE')}
            </span>
          )}
          <button
            onClick={fetchMarketValues}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? '🔄 Aktualisiere...' : '🔄 Aktualisieren'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400">❌ {error}</p>
        </div>
      )}

      {loading && marketData.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin text-2xl mb-2">⚽</div>
          <p className="text-slate-300">Lade Marktwerte...</p>
        </div>
      ) : marketData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-300">Keine Marktwertdaten verfügbar</p>
          <p className="text-sm text-slate-400 mt-2">
            Klicke auf &quot;Aktualisieren&quot; um Live-Daten zu laden
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketData.map((player) => (
              <div
                key={player.playerId}
                className="border border-slate-600/30 bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white truncate">
                    {player.playerName}
                  </h3>
                  <span className="text-lg">
                    {getTrendIcon(player.trend)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-slate-400">Aktueller Wert:</span>
                    <div className="text-lg font-bold text-white">
                      {formatCurrency(player.currentValue)}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-slate-400">Veränderung:</span>
                    <div className={`text-sm font-medium ${getTrendColor(player.trend)}`}>
                      {formatChange(player.change, player.changePercent)}
                    </div>
                  </div>
                  
                  <div className="text-xs text-slate-500">
                    Vorheriger Wert: {formatCurrency(player.previousValue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-slate-700/30 to-slate-600/30 rounded-lg border border-slate-600/30">
            <h3 className="font-semibold text-white mb-2">📈 Marktübersicht</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-400">
                  {marketData.filter(p => p.trend === 'up').length}
                </div>
                <div className="text-sm text-slate-300">Gestiegen</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-400">
                  {marketData.filter(p => p.trend === 'down').length}
                </div>
                <div className="text-sm text-slate-300">Gefallen</div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-300">
                  {marketData.filter(p => p.trend === 'stable').length}
                </div>
                <div className="text-sm text-slate-300">Stabil</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
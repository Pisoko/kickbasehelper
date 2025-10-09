'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface MatchdayState {
  currentMatchday: number;
  totalMatchdays: number;
  lastUpdate: string;
  isNewMatchdayDetected: boolean;
}

interface MatchdayMonitorProps {
  onMatchdayUpdate?: (newMatchday: number) => void;
}

export default function MatchdayMonitor({ onMatchdayUpdate }: MatchdayMonitorProps) {
  const [matchdayState, setMatchdayState] = useState<MatchdayState | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch current matchday state
  const fetchMatchdayState = async () => {
    try {
      const response = await fetch('/api/matchday/check');
      if (!response.ok) {
        throw new Error(`Failed to fetch matchday state: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setMatchdayState(data.data);
        setError(null);
        
        // Check if new matchday was detected
        if (data.data.hasNewMatchday && onMatchdayUpdate) {
          onMatchdayUpdate(data.data.currentMatchday);
        }
        
        // Show info message if authentication is required
        if (data.data.authenticationRequired) {
          console.info('MatchdayMonitor:', data.data.message);
        }
      } else {
        setError(data.message || 'Failed to fetch matchday state');
      }
    } catch (err) {
      console.error('Error fetching matchday state:', err);
      setError('Fehler beim Laden des Spieltag-Status');
    }
  };

  // Manual check for new matchday
  const checkForNewMatchday = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const response = await fetch('/api/matchday/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check for new matchday: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMatchdayState(data.data);
        setLastCheckTime(new Date().toISOString());
        
        // If new matchday detected, trigger callback
        if (data.data.isNewMatchdayDetected && onMatchdayUpdate) {
          onMatchdayUpdate(data.data.currentMatchday);
        }
        
        setError(null);
      } else {
        setError(data.message || 'Fehler bei der Spieltag-Prüfung');
      }
    } catch (err) {
      console.error('Error checking for new matchday:', err);
      setError('Fehler bei der Spieltag-Prüfung');
    } finally {
      setIsChecking(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load initial state
  useEffect(() => {
    fetchMatchdayState();
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMatchdayState();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  if (!matchdayState && !error) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
          <span className="text-sm text-slate-300">Lade Spieltag-Status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      {/* Compact view */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {matchdayState?.isNewMatchdayDetected ? (
                <AlertCircle className="h-5 w-5 text-orange-400" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-400" />
              )}
              <div>
                <div className="text-sm font-medium text-white">
                  Spieltag {matchdayState?.currentMatchday ? matchdayState.currentMatchday + 1 : '?'} / {matchdayState?.totalMatchdays || '?'}
                </div>
                <div className="text-xs text-slate-400">
                  {matchdayState?.isNewMatchdayDetected 
                    ? 'Neuer Spieltag erkannt!' 
                    : 'Aktuell'
                  }
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                checkForNewMatchday();
              }}
              disabled={isChecking}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 text-white ${isChecking ? 'animate-spin' : ''}`} />
            </button>
            
            <Info className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700">
          <div className="mt-4 space-y-3">
            {/* Status information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-400 mb-1">Letztes Update</div>
                <div className="text-white">
                  {matchdayState?.lastUpdate 
                    ? formatDate(matchdayState.lastUpdate)
                    : 'Unbekannt'
                  }
                </div>
              </div>
              
              {lastCheckTime && (
                <div>
                  <div className="text-slate-400 mb-1">Letzte Prüfung</div>
                  <div className="text-white">
                    {formatDate(lastCheckTime)}
                  </div>
                </div>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-300">{error}</span>
                </div>
              </div>
            )}

            {/* Info about automatic monitoring */}
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <div className="font-medium mb-1">Automatische Überwachung</div>
                  <div className="text-xs text-blue-400">
                    Das System prüft stündlich automatisch auf neue Spieltage. 
                    Spielerdaten werden automatisch aktualisiert, wenn ein neuer Spieltag erkannt wird.
                  </div>
                </div>
              </div>
            </div>

            {/* Manual actions */}
            <div className="flex space-x-2">
              <button
                onClick={checkForNewMatchday}
                disabled={isChecking}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isChecking ? 'Prüfe...' : 'Jetzt prüfen'}
              </button>
              
              <button
                onClick={fetchMatchdayState}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Status aktualisieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
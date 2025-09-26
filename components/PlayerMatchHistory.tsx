'use client';

import { useState, useEffect } from 'react';
import BundesligaLogo from './BundesligaLogo';

interface MatchHistoryData {
  matchday: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  playerMinutes: number;
  playerPoints: number;
  matchDate: string;
  playerTeam: string;
}

interface PlayerMatchHistoryProps {
  playerId: string;
  playerName: string;
  currentTeam: string;
}

export default function PlayerMatchHistory({ playerId, playerName, currentTeam }: PlayerMatchHistoryProps) {
  const [matchHistory, setMatchHistory] = useState<MatchHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`[PlayerMatchHistory] Fetching data for playerId: ${playerId}`);

        // Fetch player performance data from Kickbase API
        const response = await fetch(`/api/player-performance?playerId=${playerId}`);
        console.log(`[PlayerMatchHistory] Response status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch player performance data: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[PlayerMatchHistory] Received data:`, data);
        
        // Transform the data to match our interface
        const transformedHistory: MatchHistoryData[] = data.matches?.map((match: any) => ({
          matchday: match.matchday || 0,
          homeTeam: match.homeTeam || 'Heimteam',
          awayTeam: match.awayTeam || 'Auswärtsteam',
          homeScore: match.homeScore || 0,
          awayScore: match.awayScore || 0,
          playerMinutes: match.playerMinutes || 0,
          playerPoints: match.playerPoints || 0,
          matchDate: match.matchDate || new Date().toISOString(),
          playerTeam: match.playerTeam || currentTeam
        })) || [];

        console.log(`[PlayerMatchHistory] Transformed history:`, transformedHistory);
        setMatchHistory(transformedHistory);
      } catch (err) {
        console.error('[PlayerMatchHistory] Error fetching match history:', err);
        setError('Fehler beim Laden der Spielhistorie');
        
        // Set empty array instead of mock data to see if real data loads
        setMatchHistory([]);
      } finally {
        setLoading(false);
      }
    };

    if (playerId) {
      fetchMatchHistory();
    }
  }, [playerId, currentTeam]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Color coding based on performance according to new scale
  const getPerformanceColor = (points: number): string => {
    if (points >= 200) return 'from-red-500 via-orange-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-violet-500'; // Regenbogen-Gradient für außergewöhnliche Leistung
    if (points >= 150) return 'from-emerald-600 to-emerald-500'; // Dunkelgrün für sehr gute Leistung
    if (points >= 100) return 'from-green-500 to-green-400'; // Hellgrün für gute Leistung
    if (points >= 50) return 'from-yellow-500 to-yellow-400'; // Gelb für solide Leistung
    if (points >= 0) return 'from-red-500 to-red-400'; // Rot für schwache Leistung
    return 'from-red-900 to-red-800'; // Dunkelrot für negative Punkte
  };

  const getBarFillPercentage = (points: number) => {
    if (points <= 0) return 0; // No fill for negative or zero points
    
    // Fixed scale: 300 points = 100% fill, 150 points = 50% fill
    const maxPoints = 300;
    const percentage = (points / maxPoints) * 100;
    
    // Cap at 100% for points above 300, minimum 2% for very low scores to show something
    return Math.min(Math.max(percentage, 2), 100);
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Vergangene Spiele 2025/2026</h3>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  if (error && matchHistory.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Vergangene Spiele 2025/2026</h3>
        <div className="text-center text-slate-400 py-8">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const maxPoints = Math.max(...matchHistory.map(match => match.playerPoints), 400);
  const totalPoints = matchHistory.reduce((sum, match) => sum + match.playerPoints, 0);
  const totalMinutes = matchHistory.reduce((sum, match) => sum + match.playerMinutes, 0);
  
  // Calculate actual appearances (only games with minutes > 0) for correct averages
  const actualAppearances = matchHistory.filter(match => match.playerMinutes > 0);



  // Sort matchHistory by matchday to ensure proper order
  const sortedMatchHistory = [...matchHistory].sort((a, b) => a.matchday - b.matchday);
  
  // Determine if we need scrolling (more than 4 matchdays)
  const needsScrolling = sortedMatchHistory.length > 4;

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Vergangene Spiele</h3>
        <p className="text-sm text-slate-400">2025/2026</p>
        {needsScrolling && (
          <p className="text-xs text-slate-500 mt-1">
            {sortedMatchHistory.length} Spieltage • Scroll für alle Spiele →
          </p>
        )}
      </div>

      {/* Scrollable container for matchdays and performance bars */}
      <div className={`${needsScrolling ? 'overflow-x-auto' : ''} pb-2`}>
        <div className={`flex ${needsScrolling ? 'w-max' : 'justify-between'} gap-4`}>
          {sortedMatchHistory.map((match) => (
            <div key={match.matchday} className={`${needsScrolling ? 'w-20 flex-shrink-0' : 'flex-1'} flex flex-col`}>
              {/* Matchday Header */}
              <div className="text-center mb-4">
                <div className="text-xs font-medium text-slate-400 mb-2">
                  #{match.matchday}
                </div>
                
                {/* Team Logos and Score */}
                <div className="flex flex-col items-center space-y-1 mb-2">
                  <div className="flex items-center space-x-1">
                    <BundesligaLogo teamName={match.homeTeam} size="sm" />
                    <BundesligaLogo teamName={match.awayTeam} size="sm" />
                  </div>
                  <div className="text-xs font-medium text-white">
                    {match.homeScore} : {match.awayScore}
                  </div>
                </div>
              </div>

              {/* Performance Bar - Fixed height container with variable fill */}
              <div className="flex flex-col items-center">
                {/* Fixed height bar container - 50% taller (h-48 instead of h-32), 25% narrower (max-w-9 instead of max-w-12) */}
                <div className="relative w-full max-w-9 h-48 bg-slate-700/30 rounded border border-slate-600/50 overflow-hidden mx-auto">
                  {/* Background grid pattern for better visual reference */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="h-full w-full bg-gradient-to-t from-transparent via-slate-500/10 to-transparent"></div>
                    <div className="absolute top-1/4 left-0 right-0 h-px bg-slate-500/20"></div>
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-500/30"></div>
                    <div className="absolute top-3/4 left-0 right-0 h-px bg-slate-500/20"></div>
                  </div>
                  
                  {/* Filled portion - grows from bottom */}
                  <div 
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-r ${getPerformanceColor(match.playerPoints)} rounded-b transition-all duration-500 ease-out`}
                    style={{ 
                      height: `${getBarFillPercentage(match.playerPoints)}%`,
                      minHeight: match.playerPoints > 0 ? '2px' : '0px'
                    }}
                  >
                    {/* Points label centered in filled area - only for good performance (yellow and above) */}
                    {match.playerPoints > 0 && match.playerPoints >= 50 && getBarFillPercentage(match.playerPoints) > 15 && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <span className="text-[10px] font-semibold text-white drop-shadow-lg">
                          {match.playerPoints}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Points label outside bar for red bars (poor performance 0-49 points) or very low bars */}
                  {match.playerPoints > 0 && (match.playerPoints < 50 || getBarFillPercentage(match.playerPoints) <= 15) && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <span className="text-xs font-semibold text-white drop-shadow-lg">
                        {match.playerPoints}
                      </span>
                    </div>
                  )}
                  
                  {/* Zero points indicator - 100% transparent background */}
                  {match.playerPoints === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-slate-300 drop-shadow-lg">0</span>
                    </div>
                  )}
                </div>
                
                {/* Minutes below the bar */}
                <div className="mt-2 text-center">
                  <div className={`text-xs font-medium ${
                    match.playerMinutes > 47 
                      ? 'text-green-400 font-bold' 
                      : 'text-slate-400'
                  }`}>
                    {match.playerMinutes}'
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="border-t border-slate-600 pt-4">
        <div className="flex justify-between items-center text-center">
          <div className="flex-1">
            <div className="text-lg font-semibold text-white">{actualAppearances.length}/{matchHistory.length}</div>
            <div className="text-xs text-slate-400">Einsätze</div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-white">{totalPoints}</div>
            <div className="text-xs text-slate-400">Gesamtpunkte</div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-white">{actualAppearances.length > 0 ? Math.round(totalPoints / actualAppearances.length) : 0}</div>
            <div className="text-xs text-slate-400">Ø Punkte</div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-white">{actualAppearances.length > 0 ? Math.round(totalMinutes / actualAppearances.length) : 0}</div>
            <div className="text-xs text-slate-400">Ø Minuten</div>
          </div>
        </div>
      </div>
    </div>
  );
}
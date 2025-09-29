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
  goals: number;
  assists: number;
  marketValue: number;
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

        // Fetch enhanced player performance data from new API endpoint
        const response = await fetch(`/api/player-performance-history?playerId=${playerId}`);
        console.log(`[PlayerMatchHistory] Response status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch player performance history: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[PlayerMatchHistory] Received enhanced data:`, data);
        
        // Use the enhanced data structure - check both possible data formats
        let matchesArray = data.data?.matches || data.matchHistory || [];
        
        const transformedHistory: MatchHistoryData[] = matchesArray.map((match: any) => ({
          matchday: match.matchday || 0,
          homeTeam: match.homeTeam || 'Heimteam',
          awayTeam: match.awayTeam || 'Auswärtsteam',
          homeScore: match.homeScore || 0,
          awayScore: match.awayScore || 0,
          playerMinutes: match.playerMinutes || 0,
          playerPoints: match.playerPoints || 0,
          matchDate: match.matchDate || new Date().toISOString(),
          playerTeam: match.playerTeam || currentTeam,
          goals: match.goals || 0,
          assists: match.assists || 0,
          marketValue: match.marketValue || 0
        }));

        console.log(`[PlayerMatchHistory] Transformed history:`, transformedHistory);
        setMatchHistory(transformedHistory);
      } catch (err) {
        console.error('[PlayerMatchHistory] Error fetching match history:', err);
        
        // Check if it's an authentication error
        if (err instanceof Error && err.message.includes('401')) {
          setError('Authentifizierung erforderlich - Bitte melde dich bei Kickbase an');
        } else {
          setError('Spielhistorie nicht verfügbar - Verwende Mock-Daten');
        }
        
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
    // Für negative Punkte: Minimale Höhe von 10% mit rotem Balken
    if (points < 0) return 10;
    
    // Für 0 Punkte: Minimale Höhe von 5%
    if (points === 0) return 5;
    
    // Für niedrige Punktzahlen (1-30): Mindesthöhe von 15% + zusätzliche Höhe basierend auf Punkten
    if (points > 0 && points <= 30) {
      return 15 + (points / 30) * 10; // 15% bis 25% für 1-30 Punkte
    }
    
    // Für normale Punktzahlen: Skalierte Höhe
    const maxPoints = 300;
    const percentage = (points / maxPoints) * 100;
    
    // Cap at 100% for points above 300
    return Math.min(percentage, 100);
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

      {/* Mobile View (Card Layout) */}
      <div className="md:hidden space-y-4 mb-4">
        {sortedMatchHistory.map((match) => {
          const isHomeTeam = match.playerTeam === match.homeTeam;
          const opponentTeam = isHomeTeam ? match.awayTeam : match.homeTeam;
          
          return (
            <div key={match.matchday} className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-slate-400">#{match.matchday}</span>
                <div className="flex items-center space-x-2">
                  {(match.goals > 0 || match.assists > 0) && (
                    <div className="flex items-center space-x-1 text-xs">
                      {match.goals > 0 && (
                        <span className="text-green-400 font-bold">⚽{match.goals}</span>
                      )}
                      {match.assists > 0 && (
                        <span className="text-blue-400 font-bold">🅰️{match.assists}</span>
                      )}
                    </div>
                  )}
                  <span className={`text-xs font-medium ${
                    match.playerMinutes > 47 ? 'text-green-400 font-bold' : 'text-slate-400'
                  }`}>{match.playerMinutes}&apos;</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  {isHomeTeam ? (
                    <>
                      <BundesligaLogo teamName={match.homeTeam} size="sm" />
                      <span className="text-xs font-medium text-white">vs</span>
                      <BundesligaLogo teamName={match.awayTeam} size="sm" />
                    </>
                  ) : (
                    <>
                      <BundesligaLogo teamName={match.awayTeam} size="sm" />
                      <span className="text-xs font-medium text-white">vs</span>
                      <BundesligaLogo teamName={match.homeTeam} size="sm" />
                    </>
                  )}
                </div>
                <div className="text-xs font-medium text-white">
                  {match.homeScore} : {match.awayScore}
                </div>
              </div>
              
              <div className="relative h-10 bg-slate-700/50 rounded overflow-hidden">
                <div 
                  className={`absolute bottom-0 left-0 right-0 bg-gradient-to-r ${getPerformanceColor(match.playerPoints)} rounded-b transition-all duration-500 ease-out`}
                  style={{ height: `${getBarFillPercentage(match.playerPoints)}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{match.playerPoints} Pkt</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop View (Original Layout) */}
      <div className="hidden md:block">
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
                      {/* Points label always centered in the bar regardless of fill height */}
                      {match.playerPoints > 0 && getBarFillPercentage(match.playerPoints) > 15 && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <span className="text-[10px] font-bold text-white">
                            {match.playerPoints}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Zero points indicator - 100% transparent background */}
                    {match.playerPoints === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">0</span>
                      </div>
                    )}
                    
                    {/* Negative points indicator */}
                    {match.playerPoints < 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{match.playerPoints}</span>
                      </div>
                    )}
                    
                    {/* For low points, show outside the bar */}
                    {match.playerPoints > 0 && getBarFillPercentage(match.playerPoints) <= 15 && (
                      <div className="absolute bottom-0 left-0 right-0 flex justify-center -mb-5">
                        <span className="text-xs font-bold text-white">
                          {match.playerPoints}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Minutes and stats below the bar */}
                  <div className="mt-2 text-center space-y-1">
                    <div className={`text-xs font-medium ${
                      match.playerMinutes > 47 
                        ? 'text-green-400 font-bold' 
                        : 'text-slate-400'
                    }`}>
                      {match.playerMinutes}&apos;
                    </div>
                    {(match.goals > 0 || match.assists > 0) && (
                      <div className="flex justify-center space-x-1 text-xs">
                        {match.goals > 0 && (
                          <span className="text-green-400 font-bold">⚽{match.goals}</span>
                        )}
                        {match.assists > 0 && (
                          <span className="text-blue-400 font-bold">🅰️{match.assists}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
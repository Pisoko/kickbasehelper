'use client';

import { useState, useEffect } from 'react';
import BundesligaLogo from './BundesligaLogo';
import { calculateFillHeight, getBarColorClasses, getValueColor } from './KickbaseBar';

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
  yellowCards: number;
  redCards: number;
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
          yellowCards: match.yellowCards || 0,
          redCards: match.redCards || 0,
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

  // Kickbase-Balkenfüllung mit konkaver Kurve
  const getKickbaseFillPercentage = (points: number, maxPoints: number = 356): number => {
    const fillHeight = calculateFillHeight(points, maxPoints);
    return Math.round(fillHeight * 100);
  };

  // Kickbase-Farblogik
  const getKickbaseColorClass = (points: number): string => {
    return getBarColorClasses(points);
  };

  // Kickbase-Textwertfarbe
  const getKickbaseValueColor = (points: number): string => {
    return getValueColor(points);
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
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Vergangene Spiele 2025/2026</h3>
          <div className="text-center text-slate-300 py-8">
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
  
  // Determine if we need scrolling (more than 9 matchdays)
  const needsScrolling = sortedMatchHistory.length > 9;

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Vergangene Spiele</h3>
        <p className="text-sm text-slate-300">2025/2026</p>
        {needsScrolling && (
          <p className="text-xs text-slate-400 mt-1">
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
                  {(match.goals > 0 || match.assists > 0 || match.yellowCards > 0 || match.redCards > 0) && (
                    <div className="flex items-center space-x-1 text-xs">
                      {match.goals > 0 && (
                        <span className="text-green-400 font-bold">⚽{match.goals > 1 ? match.goals : ''}</span>
                      )}
                      {match.assists > 0 && (
                        <span className="text-blue-400 font-bold">⚡{match.assists > 1 ? match.assists : ''}</span>
                      )}
                      {match.yellowCards > 0 && (
                        <span className="text-yellow-400 font-bold">🟨{match.yellowCards > 1 ? match.yellowCards : ''}</span>
                      )}
                      {match.redCards > 0 && (
                        <span className="text-red-400 font-bold">🟥{match.redCards > 1 ? match.redCards : ''}</span>
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
              
              {/* Spielminuten oberhalb der Balken */}
              <div className="text-center mb-1">
                <div className={`text-xs font-medium ${
                  match.playerMinutes > 47 
                    ? 'text-green-400 font-bold' 
                    : 'text-slate-400'
                }`}>
                  {match.playerMinutes}&apos;
                </div>
              </div>
              
              <div className="relative h-10 bg-gray-800 rounded-lg overflow-hidden border border-gray-600">
                <div 
                  className={`absolute top-0 left-0 bottom-0 w-full transition-all duration-300 ease-out ${getKickbaseColorClass(match.playerPoints)}`}
                  style={{
                    '--fill': `${getKickbaseFillPercentage(match.playerPoints)}%`,
                    WebkitMask: `linear-gradient(to right, black var(--fill), transparent var(--fill))`,
                    mask: `linear-gradient(to right, black var(--fill), transparent var(--fill))`,
                    borderRadius: '0.5rem'
                  } as React.CSSProperties}
                />
              </div>
              
              {/* Punktzahlen unterhalb der Balken */}
              <div className="text-center mt-1">
                <span 
                  className="text-sm font-bold"
                  style={{ color: getKickbaseValueColor(match.playerPoints) }}
                >
                  {match.playerPoints}
                </span>
              </div>
              
              {/* Event-Symbole unterhalb der Punktzahlen */}
              {(match.goals > 0 || match.assists > 0 || match.yellowCards > 0 || match.redCards > 0) && (
                <div className="flex justify-center space-x-1 text-xs mt-1">
                  {match.goals > 0 && (
                    <span className="text-green-400 font-bold">{match.goals > 1 ? `${match.goals}x` : ''}⚽</span>
                  )}
                  {match.assists > 0 && (
                    <span className="text-blue-400 font-bold">{match.assists > 1 ? `${match.assists}x` : ''}⚡</span>
                  )}
                  {match.yellowCards > 0 && (
                    <span className="text-yellow-400 font-bold">{match.yellowCards > 1 ? `${match.yellowCards}x` : ''}🟨</span>
                  )}
                  {match.redCards > 0 && (
                    <span className="text-red-400 font-bold">{match.redCards > 1 ? `${match.redCards}x` : ''}🟥</span>
                  )}
                </div>
              )}
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
                  {/* Spielminuten oberhalb der Balken */}
                  <div className="mb-2 text-center">
                    <div className={`text-xs font-medium ${
                      match.playerMinutes > 47 
                        ? 'text-green-400 font-bold' 
                        : 'text-slate-400'
                    }`}>
                      {match.playerMinutes}&apos;
                    </div>
                  </div>
                  
                  {/* Kickbase-Balken mit konkaver Kurve */}
                  <div className="relative w-full max-w-9 h-48 bg-gray-800 rounded-lg overflow-hidden border border-gray-600 mx-auto">
                    {/* Kickbase-Balkenfüllung */}
                    <div 
                      className={`absolute bottom-0 left-0 right-0 h-full transition-all duration-300 ease-out ${getKickbaseColorClass(match.playerPoints)}`}
                      style={{
                        '--fill': `${getKickbaseFillPercentage(match.playerPoints)}%`,
                        WebkitMask: `linear-gradient(to top, black var(--fill), transparent var(--fill))`,
                        mask: `linear-gradient(to top, black var(--fill), transparent var(--fill))`,
                        borderRadius: '0.5rem'
                      } as React.CSSProperties}
                    />
                  </div>
                  
                  {/* Punktzahlen unterhalb der Balken */}
                  <div className="mt-2 text-center">
                    <span 
                      className="text-sm font-bold"
                      style={{ color: getKickbaseValueColor(match.playerPoints) }}
                    >
                      {match.playerPoints}
                    </span>
                  </div>
                  
                  {/* Event-Symbole unterhalb der Punktzahlen */}
                  <div className="mt-1 text-center space-y-1">
                    {(match.goals > 0 || match.assists > 0 || match.yellowCards > 0 || match.redCards > 0) && (
                        <div className="flex justify-center space-x-1 text-xs">
                          {match.goals > 0 && (
                            <span className="text-green-400 font-bold">{match.goals > 1 ? `${match.goals}x` : ''}⚽</span>
                          )}
                          {match.assists > 0 && (
                            <span className="text-blue-400 font-bold">{match.assists > 1 ? `${match.assists}x` : ''}⚡</span>
                          )}
                          {match.yellowCards > 0 && (
                            <span className="text-yellow-400 font-bold">{match.yellowCards > 1 ? `${match.yellowCards}x` : ''}🟨</span>
                          )}
                          {match.redCards > 0 && (
                            <span className="text-red-400 font-bold">{match.redCards > 1 ? `${match.redCards}x` : ''}🟥</span>
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
      
      {/* Kickbase-Balken CSS-Stile */}
      <style jsx>{`
        .kickbase-bar-red {
          background: linear-gradient(to top, #ff4444, #ff6666);
        }
        
        .kickbase-bar-red::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: repeating-linear-gradient(
            90deg,
            #ff4444 0px,
            #ff4444 4px,
            transparent 4px,
            transparent 8px
          );
        }
        
        .kickbase-bar-orange {
          background: linear-gradient(to top, #ff8800, #ffaa33);
        }
        
        .kickbase-bar-green {
          background: linear-gradient(to top, #00ff88, #33ffaa);
          box-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
        }
        
        .kickbase-bar-mint {
          background: #66ffcc;
        }
      `}</style>
    </div>
  );
}
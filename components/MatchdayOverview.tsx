'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { getTeamByKickbaseId } from '@/lib/teamMapping';
import BundesligaLogo from './BundesligaLogo';

// Variants für die Komponente
const matchRowVariants = cva(
  "flex items-center justify-between p-4 border-b border-border transition-colors hover:bg-muted/50",
  {
    variants: {
      status: {
        upcoming: "bg-background",
        live: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
        finished: "bg-background"
      }
    },
    defaultVariants: {
      status: "upcoming"
    }
  }
);

interface Match {
  id: string;
  homeTeam: {
    id: string;
    name: string;
    shortName: string;
    logo?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    shortName: string;
    logo?: string;
  };
  kickoff: string;
  status: 'upcoming' | 'live' | 'finished';
  result?: {
    homeGoals: number;
    awayGoals: number;
  };
  odds?: {
    heim: number;
    unentschieden: number;
    auswaerts: number;
    format: 'decimal' | 'fractional' | 'american';
  };
}

interface MatchdayData {
  matchday: number;
  matches: Match[];
  startDate: string;
  endDate: string;
}

interface MatchdayOverviewProps extends VariantProps<typeof matchRowVariants> {
  className?: string;
}

export default function MatchdayOverview({ className }: MatchdayOverviewProps) {
  const [currentMatchday, setCurrentMatchday] = useState(6); // Standard: aktueller Spieltag + 1
  const [actualCurrentMatchday, setActualCurrentMatchday] = useState<number | null>(null); // Der tatsächlich aktuelle Spieltag
  const [matchdayData, setMatchdayData] = useState<MatchdayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funktion zum Ermitteln des aktuellen Spieltags
  const fetchCurrentMatchday = async () => {
    try {
      const response = await fetch('/api/matchday/current');
      if (response.ok) {
        const data = await response.json();
        setActualCurrentMatchday(data.currentMatchday);
      }
    } catch (err) {
      console.error('Error fetching current matchday:', err);
      // Fallback: Nehme an, dass Spieltag 5 der aktuelle ist
      setActualCurrentMatchday(5);
    }
  };

  // Prüfe, ob Siegquoten angezeigt werden sollen (nur für den nächsten Spieltag)
  const shouldShowOdds = () => {
    if (actualCurrentMatchday === null) return false;
    return currentMatchday === actualCurrentMatchday + 1;
  };

  // Funktion zum Gruppieren der Spiele nach Tagen
  const groupMatchesByDay = (matches: Match[]) => {
    const grouped: { [key: string]: Match[] } = {};
    
    matches.forEach(match => {
      const date = new Date(match.kickoff);
      const dayName = date.toLocaleDateString('de-DE', { weekday: 'long' });
      const dayKey = `${dayName}, ${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`;
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(match);
    });

    // Sortiere Spiele innerhalb jedes Tages nach Anstoßzeit
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
    });

    return grouped;
  };

  // Funktion zum Formatieren der Zeit
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const fetchMatchdayData = async (matchday: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/matchday/${matchday}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Spieltag ${matchday} nicht gefunden. Möglicherweise sind noch keine Daten verfügbar.`);
        } else if (response.status === 500) {
          throw new Error('Serverfehler beim Laden der Spieltag-Daten. Bitte versuchen Sie es später erneut.');
        } else {
          throw new Error(`Fehler beim Laden der Daten (Status: ${response.status})`);
        }
      }
      
      const data = await response.json();
      
      // Validate response data
      if (!data || typeof data.matchday !== 'number' || !Array.isArray(data.matches)) {
        throw new Error('Ungültige Datenstruktur erhalten. Bitte versuchen Sie es erneut.');
      }
      
      setMatchdayData(data);
    } catch (err) {
      console.error('Error fetching matchday data:', err);
      
      // Provide user-friendly error messages
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
      } else {
        setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentMatchday();
    fetchMatchdayData(currentMatchday);
  }, [currentMatchday]);

  const handlePreviousMatchday = () => {
    if (currentMatchday > 1) {
      setCurrentMatchday(currentMatchday - 1);
    }
  };

  const handleNextMatchday = () => {
    if (currentMatchday < 34) {
      setCurrentMatchday(currentMatchday + 1);
    }
  };

  const handleRefresh = () => {
    fetchMatchdayData(currentMatchday);
  };

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-10 w-10 bg-muted rounded animate-pulse"></div>
            <div className="h-10 w-10 bg-muted rounded animate-pulse"></div>
            <div className="h-10 w-10 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg border p-6">
              <div className="h-6 bg-muted rounded w-32 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-16 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Spieltag {currentMatchday}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handlePreviousMatchday}
              disabled={currentMatchday <= 1}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 hover:text-slate-100 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextMatchday}
              disabled={currentMatchday >= 34}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold">Fehler beim Laden</h3>
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Spieltag {currentMatchday}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handlePreviousMatchday}
            disabled={currentMatchday <= 1}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 hover:text-slate-100 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleNextMatchday}
            disabled={currentMatchday >= 34}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Matches grouped by day */}
      {matchdayData && matchdayData.matches.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupMatchesByDay(matchdayData.matches)).map(([day, dayMatches]) => (
            <div key={day} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              {/* Day Header */}
              <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-slate-100">
                  {day}
                </h3>
              </div>
              
              {/* Matches for this day */}
              <div className="p-6 space-y-4">
                {dayMatches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between p-4">
                    {/* Time and Live Status */}
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className="text-sm font-medium text-muted-foreground">
                        {formatTime(match.kickoff)}
                      </div>
                      {match.status === 'live' && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-red-500">LIVE</span>
                        </div>
                      )}
                      {/* Kickbase MatchID */}
                      <div className="text-xs text-slate-500 mt-1">
                        ID: {match.id}
                      </div>
                    </div>



                    {/* Teams and Score */}
                    <div className="flex-1 flex items-center justify-center gap-4 md:gap-8">
                      {/* Home Team */}
                      <div className="flex flex-col items-center flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-base md:text-lg font-medium">
                            {match.homeTeam.name}
                          </span>
                          <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                            <BundesligaLogo 
                              teamName={match.homeTeam.name} 
                              size="md" 
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                        {/* Home Team Odds - only for upcoming matches and only for next matchday */}
                        {match.status === 'upcoming' && match.odds && shouldShowOdds() && (
                          <div className="mt-2 text-center">
                            <div className="text-sm font-medium text-slate-300">{match.odds.heim.toFixed(2)}</div>
                          </div>
                        )}
                      </div>

                      {/* Score or VS */}
                      <div className="flex items-center justify-center min-w-[60px] md:min-w-[80px]">
                        {match.status === 'finished' || match.status === 'live' ? (
                          <div className="text-xl md:text-2xl font-bold text-center">
                            {match.result?.homeGoals || 0} : {match.result?.awayGoals || 0}
                          </div>
                        ) : (
                          <div className="text-lg md:text-xl font-medium text-muted-foreground text-center">
                            vs
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex flex-col items-center flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                            <BundesligaLogo 
                              teamName={match.awayTeam.name} 
                              size="md" 
                              className="w-full h-full"
                            />
                          </div>
                          <span className="text-base md:text-lg font-medium">
                            {match.awayTeam.name}
                          </span>
                        </div>
                        {/* Away Team Odds - only for upcoming matches and only for next matchday */}
                        {match.status === 'upcoming' && match.odds && shouldShowOdds() && (
                          <div className="mt-2 text-center">
                            <div className="text-sm font-medium text-slate-300">{match.odds.auswaerts.toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Match Minute for Live Games */}
                    <div className="min-w-[80px] text-right">
                      {match.status === 'live' && (
                        <div className="text-sm text-muted-foreground">
                          90&apos;
                        </div>
                      )}
                    </div>
                    </div>


                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-semibold mb-2 text-slate-100">Keine Spiele verfügbar</h3>
          <p className="text-slate-400">
            Für Spieltag {currentMatchday} sind derzeit keine Spiele verfügbar.
          </p>
        </div>
      )}
    </div>
  );
}
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
  meta?: {
    dataSource: 'live' | 'mock';
    apiError: string | null;
    timestamp: string;
    season: string;
  };
}

interface MatchdayOverviewProps extends VariantProps<typeof matchRowVariants> {
  className?: string;
}

export default function MatchdayOverview({ className }: MatchdayOverviewProps) {
  const [currentMatchday, setCurrentMatchday] = useState<number | null>(null); // Wird dynamisch geladen
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
        // Setze den angezeigten Spieltag auf den nächsten Spieltag (aktueller + 1)
        if (currentMatchday === null) {
          setCurrentMatchday(data.currentMatchday + 1);
        }
      }
    } catch (err) {
      console.error('Error fetching current matchday:', err);
      // Fallback: Nehme an, dass Spieltag 5 der aktuelle ist
      setActualCurrentMatchday(5);
      if (currentMatchday === null) {
        setCurrentMatchday(6); // Nächster Spieltag als Fallback
      }
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
        } else if (response.status === 503) {
          // Handle 503 Service Unavailable - try to get error message from response
          try {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || 'Service temporarily unavailable');
          } catch {
            throw new Error('Die Kickbase API ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.');
          }
        } else {
          throw new Error(`Fehler beim Laden der Daten (Status: ${response.status})`);
        }
      }
      
      const responseData = await response.json();
      console.log('Raw API Response:', responseData);
      
      // Check if the API returned an error response
      if (responseData.error) {
        console.error('API returned error response:', responseData);
        throw new Error(responseData.message || responseData.error || 'API Error');
      }
      
      // Handle API response structure: { success: true, data: {...} }
      const data = responseData.success ? responseData.data : responseData;
      console.log('Extracted data:', data);
      
      // Enhanced validation with better error messages and environment-specific handling
      if (!data) {
        console.error('No data received from API:', {
          responseData,
          hasSuccess: 'success' in responseData,
          successValue: responseData.success,
          hasData: 'data' in responseData
        });
        throw new Error('Keine Daten vom Server erhalten. Bitte versuchen Sie es erneut.');
      }
      
      // Check if this is an error response that wasn't caught above
      if (data.error || data.dataSource === 'error') {
        console.error('Data contains error information:', data);
        throw new Error(data.message || data.error || 'Fehler beim Laden der Spieltag-Daten');
      }
      
      // Additional check for empty or malformed data
      if (typeof data !== 'object' || data === null) {
        console.error('Data is not a valid object:', {
          data,
          type: typeof data,
          isNull: data === null,
          responseData
        });
        throw new Error('Ungültige Datenstruktur vom Server erhalten.');
      }
      
      // More robust type checking for different environments
      // The API can return matchday in different places: data.matchday, data.spieltag, or data.matches.spieltag
      let matchdayValue = data.matchday || data.spieltag;
      if (!matchdayValue && data.matches && typeof data.matches === 'object' && 'spieltag' in data.matches) {
        matchdayValue = data.matches.spieltag;
      }
      
      if (matchdayValue === null || matchdayValue === undefined || (typeof matchdayValue !== 'number' && !Number.isInteger(Number(matchdayValue)))) {
        console.error('Invalid matchday value:', {
          value: matchdayValue,
          type: typeof matchdayValue,
          isNumber: typeof matchdayValue === 'number',
          canConvert: Number.isInteger(Number(matchdayValue)),
          environment: process.env.NODE_ENV,
          availableKeys: Object.keys(data),
          dataMatchday: data.matchday,
          dataSpielTag: data.spieltag,
          nestedSpielTag: data.matches && typeof data.matches === 'object' ? data.matches.spieltag : 'not available',
          fullData: data
        });
        throw new Error('Ungültige Spieltag-Nummer erhalten. Bitte versuchen Sie es erneut.');
      }
      
      // Handle nested matches structure: data.matches.matches or data.matches
      let matchesValue = data.matches;
      if (matchesValue && typeof matchesValue === 'object' && 'matches' in matchesValue) {
        // Nested structure: data.matches.matches
        matchesValue = matchesValue.matches;
      }
      
      if (!Array.isArray(matchesValue)) {
        console.error('Invalid matches value:', {
          value: matchesValue,
          type: typeof matchesValue,
          isArray: Array.isArray(matchesValue),
          isNull: matchesValue === null,
          isUndefined: matchesValue === undefined,
          keys: matchesValue && typeof matchesValue === 'object' ? Object.keys(matchesValue) : 'not an object',
          environment: process.env.NODE_ENV,
          dataKeys: Object.keys(data),
          originalMatches: data.matches,
          originalMatchesType: typeof data.matches,
          fullData: data
        });
        throw new Error('Ungültige Spiele-Daten erhalten. Bitte versuchen Sie es erneut.');
      }
      
      // Check if matches array is empty
      if (matchesValue.length === 0) {
        console.warn('Matches array is empty for matchday:', matchdayValue);
        // Don't throw an error for empty matches, just log a warning
      }
      
      // Safe data transformation with fallbacks for missing properties
      const transformedData: MatchdayData = {
        matchday: typeof matchdayValue === 'number' ? matchdayValue : Number(matchdayValue),
        matches: matchesValue.map((match: any, index: number) => {
          try {
            // Validate essential match properties
            if (!match) {
              console.warn(`Match at index ${index} is null/undefined`);
              return null;
            }
            
            const homeTeamName = match.heim || match.homeTeam?.name || `Team ${index + 1}A`;
            const awayTeamName = match.auswaerts || match.awayTeam?.name || `Team ${index + 1}B`;
            
            return {
              id: match.id || `match-${index}`,
              homeTeam: {
                id: match.homeTeamSymbol || match.homeTeam?.id || 'unknown',
                name: homeTeamName,
                shortName: match.homeTeamSymbol || homeTeamName.substring(0, 3).toUpperCase(),
                logo: match.homeTeamImage || match.homeTeam?.logo
              },
              awayTeam: {
                id: match.awayTeamSymbol || match.awayTeam?.id || 'unknown',
                name: awayTeamName,
                shortName: match.awayTeamSymbol || awayTeamName.substring(0, 3).toUpperCase(),
                logo: match.awayTeamImage || match.awayTeam?.logo
              },
              kickoff: match.kickoff || match.startTime || new Date().toISOString(),
              status: match.isLive ? 'live' : (match.matchStatus === 2 ? 'finished' : 'upcoming'),
              result: (match.homeGoals !== undefined && match.awayGoals !== undefined) ? {
                homeGoals: Number(match.homeGoals) || 0,
                awayGoals: Number(match.awayGoals) || 0
              } : undefined,
              odds: match.odds ? {
                heim: Number(match.odds.heim) || 1.0,
                unentschieden: Number(match.odds.unentschieden) || 1.0,
                auswaerts: Number(match.odds.auswaerts) || 1.0,
                format: match.odds.format || 'decimal'
              } : undefined
            };
          } catch (matchError) {
            console.error(`Error processing match at index ${index}:`, matchError, match);
            return null;
          }
        }).filter(Boolean), // Remove null entries
        startDate: data.startDate || new Date().toISOString(),
        endDate: data.endDate || new Date().toISOString(),
        meta: {
          dataSource: data.dataSource || 'unknown',
          apiError: data.apiError || null,
          timestamp: new Date().toISOString(),
          season: '2025/2026'
        }
      };
      
      console.log('Transformed data:', transformedData);
      setMatchdayData(transformedData);
    } catch (err) {
      console.error('Error fetching matchday data:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        environment: process.env.NODE_ENV,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server'
      });
      
      // Provide user-friendly error messages with environment context
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
      } else if (err instanceof Error && err.message.includes('Ungültige')) {
        // This is our custom validation error
        setError(`${err.message} (Umgebung: ${process.env.NODE_ENV || 'unknown'})`);
      } else {
        setError(err instanceof Error ? err.message : 'Ungültige Datenstruktur erhalten. Bitte versuchen Sie es erneut.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentMatchday();
  }, []);

  useEffect(() => {
    if (currentMatchday !== null) {
      fetchMatchdayData(currentMatchday);
    }
  }, [currentMatchday]);

  const handlePreviousMatchday = () => {
    if (currentMatchday !== null && currentMatchday > 1) {
      setCurrentMatchday(currentMatchday - 1);
    }
  };

  const handleNextMatchday = () => {
    if (currentMatchday !== null && currentMatchday < 34) {
      setCurrentMatchday(currentMatchday + 1);
    }
  };

  const handleRefresh = () => {
    if (currentMatchday !== null) {
      fetchMatchdayData(currentMatchday);
    }
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
              disabled={!currentMatchday || currentMatchday <= 1}
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
              disabled={currentMatchday === null || currentMatchday >= 34}
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
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Spieltag {currentMatchday ?? '...'}
          </h2>
          

        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handlePreviousMatchday}
            disabled={currentMatchday === null || currentMatchday <= 1}
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
            disabled={currentMatchday === null || currentMatchday >= 34}
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
                            <div className="text-sm font-medium text-green-400 bg-green-900/30 px-2 py-1 rounded">
                              {match.odds.heim.toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Score or VS */}
                      <div className="flex flex-col items-center justify-center min-w-[60px] md:min-w-[80px]">
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
                            <div className="text-sm font-medium text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                              {match.odds.auswaerts.toFixed(2)}
                            </div>
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
'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, Users, Target, DollarSign } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Variants für die Komponente
const tableRowVariants = cva(
  "border-b border-border hover:bg-muted/50 transition-colors",
  {
    variants: {
      position: {
        champions: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
        europa: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
        conference: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
        relegation: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
        default: ""
      }
    },
    defaultVariants: {
      position: "default"
    }
  }
);

interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string[];
  // Kickbase-spezifische Daten
  averageMarketValue?: number;
  totalMarketValue?: number;
  playerCount?: number;
  topPlayer?: {
    name: string;
    marketValue: number;
    points: number;
  };
}

interface TableData {
  teams: Team[];
  season: string;
  lastUpdate: string;
}

interface TeamOverviewProps extends VariantProps<typeof tableRowVariants> {
  className?: string;
}

export default function TeamOverview({ className }: TeamOverviewProps) {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'position' | 'marketValue' | 'points'>('position');
  const [showKickbaseData, setShowKickbaseData] = useState(true);

  // Fetch table data
  const fetchTableData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/competition-table');
      
      if (!response.ok) {
        throw new Error(`Fehler beim Laden der Tabellendaten: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform API data to our format
      if (data.table && data.table.teams) {
        const transformedData: TableData = {
          teams: data.table.teams.map((team: any, index: number) => ({
            id: team.id || team.teamId || `team-${index}`,
            name: team.name || team.teamName || 'Unbekannt',
            shortName: team.shortName || team.name?.substring(0, 3) || 'UNK',
            logo: team.logo || team.logoUrl,
            position: team.position || index + 1,
            points: team.points || 0,
            played: team.played || team.matchesPlayed || 0,
            won: team.won || team.wins || 0,
            drawn: team.drawn || team.draws || 0,
            lost: team.lost || team.losses || 0,
            goalsFor: team.goalsFor || team.goalsScored || 0,
            goalsAgainst: team.goalsAgainst || team.goalsConceded || 0,
            goalDifference: (team.goalsFor || 0) - (team.goalsAgainst || 0),
            form: team.form || [],
            // Kickbase-Daten (falls verfügbar)
            averageMarketValue: team.averageMarketValue,
            totalMarketValue: team.totalMarketValue,
            playerCount: team.playerCount,
            topPlayer: team.topPlayer
          })),
          season: data.table.season || '2025/2026',
          lastUpdate: data.updatedAt
        };
        
        setTableData(transformedData);
      } else {
        setError('Keine Tabellendaten verfügbar');
      }
    } catch (err) {
      console.error('Error fetching table data:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchTableData();
  }, []);

  // Get position category for styling
  const getPositionCategory = (position: number): 'champions' | 'europa' | 'conference' | 'relegation' | 'default' => {
    if (position <= 4) return 'champions';
    if (position <= 6) return 'europa';
    if (position === 7) return 'conference';
    if (position >= 16) return 'relegation';
    return 'default';
  };

  // Get form indicator
  const getFormIndicator = (result: string) => {
    switch (result?.toLowerCase()) {
      case 'w':
      case 'win':
        return <div className="w-2 h-2 bg-green-500 rounded-full" title="Sieg" />;
      case 'd':
      case 'draw':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Unentschieden" />;
      case 'l':
      case 'loss':
        return <div className="w-2 h-2 bg-red-500 rounded-full" title="Niederlage" />;
      default:
        return <div className="w-2 h-2 bg-gray-300 rounded-full" />;
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M €`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K €`;
    }
    return `${value} €`;
  };

  // Sort teams
  const sortedTeams = tableData?.teams ? [...tableData.teams].sort((a, b) => {
    switch (sortBy) {
      case 'marketValue':
        return (b.totalMarketValue || 0) - (a.totalMarketValue || 0);
      case 'points':
        return b.points - a.points;
      default:
        return a.position - b.position;
    }
  }) : [];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Team-Übersicht</h2>
            <p className="text-sm text-muted-foreground">
              Bundesliga {tableData?.season || '2025/2026'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKickbaseData(!showKickbaseData)}
            className="inline-flex items-center justify-center rounded-md h-9 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm"
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Kickbase
          </button>
          
          <button
            onClick={fetchTableData}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-md h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 bg-card rounded-lg p-4 border">
        <span className="text-sm font-medium">Sortieren nach:</span>
        <div className="flex gap-1">
          {[
            { key: 'position', label: 'Position', icon: Trophy },
            { key: 'points', label: 'Punkte', icon: Target },
            { key: 'marketValue', label: 'Marktwert', icon: DollarSign }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSortBy(key as any)}
              className={cn(
                "inline-flex items-center justify-center rounded-md h-8 px-3 text-xs transition-colors",
                sortBy === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <Icon className="h-3 w-3 mr-1" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {tableData && !isLoading && (
        <div className="bg-card rounded-lg border overflow-hidden">
          {/* Table Header */}
          <div className="bg-muted/50 border-b border-border">
            <div className="grid grid-cols-12 gap-2 p-3 text-xs font-medium text-muted-foreground">
              <div className="col-span-1">#</div>
              <div className="col-span-3 md:col-span-2">Team</div>
              <div className="col-span-1 text-center">Sp</div>
              <div className="col-span-1 text-center">S</div>
              <div className="col-span-1 text-center">U</div>
              <div className="col-span-1 text-center">N</div>
              <div className="col-span-1 text-center">Tore</div>
              <div className="col-span-1 text-center">Diff</div>
              <div className="col-span-1 text-center">Pkt</div>
              {showKickbaseData && (
                <div className="col-span-1 text-center hidden md:block">MW</div>
              )}
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border">
            {sortedTeams.map((team) => (
              <div
                key={team.id}
                className={cn(tableRowVariants({ position: getPositionCategory(team.position) }))}
              >
                <div className="grid grid-cols-12 gap-2 p-3 items-center">
                  {/* Position */}
                  <div className="col-span-1">
                    <span className="text-sm font-medium">{team.position}</span>
                  </div>

                  {/* Team */}
                  <div className="col-span-3 md:col-span-2 flex items-center gap-2 min-w-0">
                    {team.logo && (
                      <img 
                        src={team.logo} 
                        alt={team.name}
                        className="w-6 h-6 object-contain flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{team.shortName}</p>
                      <p className="text-xs text-muted-foreground truncate md:hidden">
                        {team.name}
                      </p>
                    </div>
                  </div>

                  {/* Games Played */}
                  <div className="col-span-1 text-center text-sm">{team.played}</div>

                  {/* Wins */}
                  <div className="col-span-1 text-center text-sm">{team.won}</div>

                  {/* Draws */}
                  <div className="col-span-1 text-center text-sm">{team.drawn}</div>

                  {/* Losses */}
                  <div className="col-span-1 text-center text-sm">{team.lost}</div>

                  {/* Goals */}
                  <div className="col-span-1 text-center text-sm">
                    {team.goalsFor}:{team.goalsAgainst}
                  </div>

                  {/* Goal Difference */}
                  <div className="col-span-1 text-center text-sm">
                    <span className={cn(
                      "font-medium",
                      team.goalDifference > 0 && "text-green-600",
                      team.goalDifference < 0 && "text-red-600"
                    )}>
                      {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-bold">{team.points}</span>
                  </div>

                  {/* Market Value (Kickbase) */}
                  {showKickbaseData && (
                    <div className="col-span-1 text-center hidden md:block">
                      {team.totalMarketValue ? (
                        <span className="text-xs font-medium">
                          {formatCurrency(team.totalMarketValue)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Form (Mobile) */}
                {team.form && team.form.length > 0 && (
                  <div className="px-3 pb-2 md:hidden">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground mr-2">Form:</span>
                      {team.form.slice(-5).map((result, index) => (
                        <div key={index}>
                          {getFormIndicator(result)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="bg-muted/30 p-3 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                <span>Champions League</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                <span>Europa League</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
                <span>Conference League</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                <span>Abstieg</span>
              </div>
            </div>
            {tableData.lastUpdate && (
              <p className="text-xs text-muted-foreground mt-2">
                Letzte Aktualisierung: {new Date(tableData.lastUpdate).toLocaleString('de-DE')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tableData && !tableData.teams?.length && !isLoading && (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Keine Tabellendaten gefunden</h3>
          <p className="text-muted-foreground">
            Die Bundesliga-Tabelle konnte nicht geladen werden.
          </p>
        </div>
      )}
    </div>
  );
}
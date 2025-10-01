'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, Users, Target, DollarSign } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import BundesligaLogo from './BundesligaLogo';

// Variants für die Komponente
const tableRowVariants = cva(
  "border-b border-border hover:bg-muted/50 transition-colors",
  {
    variants: {
      position: {
        champions: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
        europa: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
        conference: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
        relegation_playoff: "bg-white dark:bg-white/10 border-gray-300 dark:border-gray-600",
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
  const getPositionCategory = (position: number): 'champions' | 'europa' | 'conference' | 'relegation_playoff' | 'relegation' | 'default' => {
    if (position <= 4) return 'champions';
    if (position <= 6) return 'europa';
    if (position === 7) return 'conference';
    if (position === 16) return 'relegation_playoff';
    if (position >= 17) return 'relegation';
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
      case 'points':
        return b.points - a.points;
      default:
        return a.position - b.position;
    }
  }) : [];

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Hidden: Trophy icon
            <Trophy className="h-6 w-6 text-primary" />
            */}
            <div>
              <h2 className="text-xl font-semibold">Bundesliga Tabelle</h2>
              <p className="text-sm text-slate-400">
                Saison {tableData?.season || '2025/2026'}
              </p>
            </div>
          </div>
          
{/* Hidden: Kickbase button
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKickbaseData(!showKickbaseData)}
              className={cn(
                "inline-flex items-center justify-center rounded-md h-9 px-3 transition-colors text-sm",
                showKickbaseData 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              )}
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Kickbase
            </button>
          </div>
          */}
        </div>



        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-800 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-2 mb-4">
            {[...Array(18)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-slate-700/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {tableData && !isLoading && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
            {/* Table Header */}
            <div className="bg-slate-700/50 border-b border-slate-600">
              <div className="grid grid-cols-12 gap-1 p-3 text-xs font-medium text-slate-300">
                <div className="col-span-1">#</div>
                <div className="col-span-4 md:col-span-3">Team</div>
                <div className="col-span-1 text-center">Sp</div>
                <div className="col-span-1 text-center">S</div>
                <div className="col-span-1 text-center">U</div>
                <div className="col-span-1 text-center">N</div>
                <div className="col-span-1 text-center">Tore</div>
                <div className="col-span-1 text-center">Diff</div>
                <div className="col-span-1 text-center">Pkt</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-700">
              {sortedTeams.map((team) => (
                <div
                  key={team.id}
                  className={cn(
                    "border-b border-slate-700 hover:bg-slate-700/30 transition-colors",
                    getPositionCategory(team.position) === 'champions' && "bg-green-900/20 border-green-800",
                    getPositionCategory(team.position) === 'europa' && "bg-blue-900/20 border-blue-800",
                    getPositionCategory(team.position) === 'conference' && "bg-yellow-900/20 border-yellow-800",
                    getPositionCategory(team.position) === 'relegation_playoff' && "bg-white/10 border-gray-600",
                    getPositionCategory(team.position) === 'relegation' && "bg-red-900/20 border-red-800"
                  )}
                >
                  <div className="grid grid-cols-12 gap-1 p-3 items-center">
                    {/* Position */}
                    <div className="col-span-1">
                      <span className="text-sm font-medium text-white">{team.position}</span>
                    </div>

                    {/* Team */}
                    <div className="col-span-4 md:col-span-3 flex items-center gap-2 min-w-0">
                      <BundesligaLogo 
                        teamName={team.name}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm text-white">{team.name}</p>
                        <p className="text-xs text-slate-400 truncate md:hidden">
                          {team.shortName}
                        </p>
                      </div>
                    </div>

                    {/* Games Played */}
                    <div className="col-span-1 text-center text-sm text-slate-300">{team.played}</div>

                    {/* Wins */}
                    <div className="col-span-1 text-center text-sm text-slate-300">{team.won}</div>

                    {/* Draws */}
                    <div className="col-span-1 text-center text-sm text-slate-300">{team.drawn}</div>

                    {/* Losses */}
                    <div className="col-span-1 text-center text-sm text-slate-300">{team.lost}</div>

                    {/* Goals */}
                    <div className="col-span-1 text-center text-sm text-slate-300">
                      {team.goalsFor}:{team.goalsAgainst}
                    </div>

                    {/* Goal Difference */}
                    <div className="col-span-1 text-center text-sm">
                      <span className={cn(
                        "font-medium",
                        team.goalDifference > 0 && "text-green-400",
                        team.goalDifference < 0 && "text-red-400",
                        team.goalDifference === 0 && "text-slate-300"
                      )}>
                        {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                      </span>
                    </div>

                    {/* Points */}
                    <div className="col-span-1 text-center">
                      <span className="text-sm font-bold text-white">{team.points}</span>
                    </div>
                  </div>

                  {/* Form (Mobile) */}
                  {team.form && team.form.length > 0 && (
                    <div className="px-3 pb-2 md:hidden">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 mr-2">Form:</span>
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
            <div className="bg-slate-700/30 p-3 border-t border-slate-600">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-900/40 border border-green-700 rounded"></div>
                  <span className="text-slate-300">Champions League</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-900/40 border border-blue-700 rounded"></div>
                  <span className="text-slate-300">Europa League</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-900/40 border border-yellow-700 rounded"></div>
                  <span className="text-slate-300">Conference League</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white/20 border border-gray-600 rounded"></div>
                  <span className="text-slate-300">Relegation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-900/40 border border-red-700 rounded"></div>
                  <span className="text-slate-300">Abstieg</span>
                </div>
              </div>
{/* Hidden: Last update timestamp
              {tableData.lastUpdate && (
                <p className="text-xs text-slate-400 mt-2">
                  Letzte Aktualisierung: {new Date(tableData.lastUpdate).toLocaleString('de-DE')}
                </p>
              )}
              */}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tableData && !tableData.teams?.length && !isLoading && (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-white">Keine Tabellendaten gefunden</h3>
            <p className="text-slate-400">
              Die Bundesliga-Tabelle konnte nicht geladen werden.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Save, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BundesligaLogo from '@/components/BundesligaLogo';
import { getTeamByShortName, getFullTeamName, TEAM_MAPPING } from '@/lib/teamMapping';

// Hilfsfunktion um verschiedene Team-Namen-Varianten zu generieren
const getTeamNameVariants = (shortName: string, fullName: string): string[] => {
  const variants = [shortName, fullName];
  
  // Spezielle Mappings für häufige API-Namen-Varianten
  const specialMappings: { [key: string]: string[] } = {
    'Bayern': ['Bayern München', 'FC Bayern München', 'Bayern'],
    'Dortmund': ['Borussia Dortmund', 'BVB', 'Dortmund'],
    'Leipzig': ['RB Leipzig', 'Leipzig'],
    'Leverkusen': ['Bayer 04 Leverkusen', 'Bayer Leverkusen', 'Leverkusen'],
    'Frankfurt': ['Eintracht Frankfurt', 'Frankfurt'],
    'Gladbach': ['Borussia Mönchengladbach', 'Mönchengladbach', 'Gladbach'],
    'Union': ['1. FC Union Berlin', 'Union Berlin', 'Union'],
    'Mainz': ['FSV Mainz 05', '1. FSV Mainz 05', 'Mainz'],
    'Hoffenheim': ['TSG 1899 Hoffenheim', 'Hoffenheim'],
    'Augsburg': ['FC Augsburg', 'Augsburg'],
    'Bremen': ['Werder Bremen', 'Bremen'],
    'Heidenheim': ['1. FC Heidenheim', 'Heidenheim'],
    'St. Pauli': ['FC St. Pauli', 'St. Pauli'],
    'Kiel': ['Holstein Kiel', 'Kiel'],
    'Bochum': ['VfL Bochum', 'Bochum'],
    'Wolfsburg': ['VfL Wolfsburg', 'Wolfsburg'],
    'Stuttgart': ['VfB Stuttgart', 'Stuttgart'],
    'Freiburg': ['SC Freiburg', 'Freiburg'],
    'Köln': ['1. FC Köln', 'FC Köln', 'Köln']
  };
  
  if (specialMappings[shortName]) {
    variants.push(...specialMappings[shortName]);
  }
  
  return [...new Set(variants)]; // Entferne Duplikate
};

interface TeamOdds {
  [teamName: string]: number;
}

interface CompetitionTableEntry {
  id: string;
  name: string;
  shortName: string;
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  logo?: string;
}

interface TeamOddsData {
  teamName: string;
  fullName: string;
  kickbaseId: string;
  odds: number;
  isModified: boolean;
  position?: number;
}

interface TeamOddsManagerProps {
  onOddsChange?: (odds: TeamOdds) => void;
}

/**
 * TeamOddsManager - Komponente zur Verwaltung der Team-Quoten für X-Faktor-Berechnung
 * 
 * Features:
 * - Tabellen-Ansicht aller Bundesliga-Teams mit vollständigen Namen und Logos
 * - Sortierung nach aktuellem Bundesliga-Tabellenstand
 * - Bearbeitung der Quoten-Werte
 * - Speichern und Zurücksetzen von Änderungen
 * - Visuelle Hervorhebung geänderter Werte
 */
export default function TeamOddsManager({ onOddsChange }: TeamOddsManagerProps) {
  const [teamOddsData, setTeamOddsData] = useState<TeamOddsData[]>([]);
  const [competitionTable, setCompetitionTable] = useState<CompetitionTableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Default-Mapping für Team-Quoten (Fallback) - Aktualisierte realistische Werte
  const defaultTeamOddsMapping: TeamOdds = {
    'Augsburg': 2.5,
    'Bayern': 6.0,  // Realistischere Quote basierend auf aktueller Form
    'Bremen': 2.8,
    'Dortmund': 1.8,
    'Frankfurt': 2.2,
    'Freiburg': 2.4,
    'Hamburg': 2.6,
    'Heidenheim': 3.2,
    'Hoffenheim': 2.3,
    'Köln': 2.9,
    'Leipzig': 1.9,
    'Leverkusen': 1.7,
    'M\'gladbach': 2.1,
    'Mainz': 2.7,
    'St. Pauli': 3.0,
    'Stuttgart': 2.0,
    'Union Berlin': 2.5,
    'Wolfsburg': 2.4
  };

  // Lade Team-Quoten von der API - Priorisiere echte Niederlagen-Quoten
  const loadTeamOdds = async (): Promise<TeamOdds> => {
    // Primär: Lade echte Niederlagen-Quoten für den nächsten Spieltag
    try {
      const response = await fetch('/api/defeat-odds');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.teamOdds) {
          console.log('Verwende echte Niederlagen-Quoten für Spieltag', data.matchdayInfo?.matchday);
          return data.teamOdds;
        }
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Defeat-Odds von /api/defeat-odds:', error);
    }

    // Fallback: Versuche allgemeine Team-Odds zu laden
    try {
      const response = await fetch('/api/team-odds');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          console.log('Verwende allgemeine Team-Quoten als Fallback');
          return data.data;
        }
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Team-Quoten von /api/team-odds:', error);
    }

    // Letzter Fallback: Default-Mapping
    console.warn('Verwende Default-Mapping als letzten Fallback');
    return defaultTeamOddsMapping;
  };

  // Lade Bundesliga-Tabelle
  const loadCompetitionTable = async (): Promise<CompetitionTableEntry[]> => {
    try {
      const response = await fetch('/api/competition-table');
      if (response.ok) {
        const data = await response.json();
        return data.table?.teams || [];
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Bundesliga-Tabelle:', error);
    }
    return [];
  };

  // Initialisierung der Daten
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [odds, table] = await Promise.all([
          loadTeamOdds(),
          loadCompetitionTable()
        ]);

        setCompetitionTable(table);

        // Erstelle Team-Daten mit vollständigen Namen und Positionen
        const teamData: TeamOddsData[] = [];
        
        // Verwende die Tabelle als Basis für die Sortierung
        if (table.length > 0) {
          table.forEach((entry) => {
            const fullName = getFullTeamName(entry.shortName) || entry.name;
            
            // Erweiterte Suche nach Team-Quoten mit verschiedenen Namen-Varianten
            let teamOdds = odds[entry.shortName] || odds[fullName];
            
            // Spezielle Behandlung für verschiedene Team-Namen-Varianten
            if (!teamOdds) {
              const nameVariants = getTeamNameVariants(entry.shortName, fullName);
              for (const variant of nameVariants) {
                if (odds[variant]) {
                  teamOdds = odds[variant];
                  break;
                }
              }
            }
            
            // Fallback auf Default-Mapping
            if (!teamOdds) {
              teamOdds = defaultTeamOddsMapping[entry.shortName] || 2.5;
            }
            
            teamData.push({
              teamName: entry.shortName,
              fullName: fullName,
              kickbaseId: entry.id,
              odds: teamOdds,
              isModified: false,
              position: entry.position
            });
          });
          
          // Sortiere nach Tabellenposition (1 = oben, 18 = unten)
          teamData.sort((a, b) => (a.position || 99) - (b.position || 99));
        } else {
          // Fallback: Verwende alle aktiven Teams aus dem Mapping
          Object.values(TEAM_MAPPING).forEach((team) => {
            if (team.isActive) {
              const teamOdds = odds[team.shortName] || odds[team.fullName] || defaultTeamOddsMapping[team.shortName] || 2.5;
              
              teamData.push({
                teamName: team.shortName,
                fullName: team.fullName,
                kickbaseId: team.kickbaseId,
                odds: teamOdds,
                isModified: false
              });
            }
          });
          
          // Sortiere alphabetisch wenn keine Tabelle verfügbar
          teamData.sort((a, b) => a.fullName.localeCompare(b.fullName));
        }

        setTeamOddsData(teamData);
      } catch (error) {
        console.error('Fehler beim Initialisieren der Daten:', error);
        setError('Fehler beim Laden der Team-Daten');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Aktualisiere einzelne Team-Quote
  const updateTeamOdds = (teamName: string, newOdds: number) => {
    setTeamOddsData(prev => {
      const updated = prev.map(team => 
        team.teamName === teamName 
          ? { ...team, odds: newOdds, isModified: true }
          : team
      );
      
      const hasModifications = updated.some(team => team.isModified);
      setHasChanges(hasModifications);
      
      // Benachrichtige Parent-Komponente
      if (onOddsChange) {
        const oddsObject: TeamOdds = {};
        updated.forEach(team => {
          oddsObject[team.teamName] = team.odds;
        });
        onOddsChange(oddsObject);
      }
      
      return updated;
    });
  };

  // Speichere Änderungen
  const saveChanges = async () => {
    try {
      const oddsToSave: TeamOdds = {};
      teamOddsData.forEach(team => {
        oddsToSave[team.teamName] = team.odds;
      });

      const response = await fetch('/api/team-odds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamOdds: oddsToSave }),
      });

      if (response.ok) {
        setTeamOddsData(prev => prev.map(team => ({ ...team, isModified: false })));
        setHasChanges(false);
        console.log('Team-Quoten erfolgreich gespeichert');
        
        // Sende Event für Cache-Invalidierung an andere Komponenten
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('teamOddsUpdated', { 
            detail: { timestamp: Date.now() } 
          }));
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Team-Quoten:', error);
      setError(`Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  // Setze Änderungen zurück
  const resetChanges = async () => {
    const originalOdds = await loadTeamOdds();
    
    setTeamOddsData(prev => prev.map(team => ({
      ...team,
      odds: originalOdds[team.teamName] || originalOdds[team.fullName] || defaultTeamOddsMapping[team.teamName] || 2.5,
      isModified: false
    })));
    
    setHasChanges(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team-Quoten werden geladen...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold">Team-Quoten Verwaltung</CardTitle>
          <div className="flex gap-2">
            {hasChanges && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetChanges}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Zurücksetzen
                </Button>
                <Button 
                  size="sm" 
                  onClick={saveChanges}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Speichern
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Pos.
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Team
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Aktuelle Quote
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Neue Quote
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamOddsData.map((team) => (
                    <tr key={team.teamName} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                          {team.position || '-'}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                         <div className="flex items-center gap-3">
                           <BundesligaLogo 
                             kickbaseId={team.kickbaseId}
                             className="w-8 h-8"
                           />
                           <div className="font-medium">{team.fullName}</div>
                         </div>
                       </td>
                      <td className="p-4 align-middle">
                        <div className="font-mono text-sm">
                          {team.odds.toFixed(2)}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <input
                          type="number"
                          step="0.1"
                          min="1.0"
                          max="10.0"
                          value={team.odds}
                          onChange={(e) => updateTeamOdds(team.teamName, parseFloat(e.target.value) || 1.0)}
                          className={`w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                            team.isModified 
                              ? 'border-orange-500 bg-orange-50 text-orange-900' 
                              : 'border-gray-300 bg-white text-gray-900'
                          }`}
                        />
                      </td>
                      <td className="p-4 align-middle">
                        {team.isModified && (
                          <div className="flex items-center gap-1 text-orange-600">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs">Geändert</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {hasChanges && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Sie haben ungespeicherte Änderungen. Vergessen Sie nicht zu speichern!
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
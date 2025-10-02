'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArenaTeam } from '@/lib/arena-types';
import { useStart11Generator } from '@/lib/hooks/useStart11Generator';
import { Loader2, Sparkles, AlertCircle, TrendingUp } from 'lucide-react';

interface Start11GeneratorButtonProps {
  /** Current arena team state */
  currentTeam: ArenaTeam;
  /** Function to update the arena team */
  onTeamUpdate: (team: ArenaTeam) => void;
  /** Optional className for styling */
  className?: string;
}

export function Start11GeneratorButton({ 
  currentTeam, 
  onTeamUpdate, 
  className = '' 
}: Start11GeneratorButtonProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const {
    generateStart11,
    isGenerating,
    lastResult,
    error,
    clearError
  } = useStart11Generator({
    currentTeam,
    onTeamUpdate
  });

  const handleGenerate = async () => {
    console.log('[DEBUG] Start11 Generator Button clicked');
    console.log('[DEBUG] Current team:', currentTeam);
    console.log('[DEBUG] Budget:', currentTeam.budget);
    
    clearError();
    
    try {
      console.log('[DEBUG] Calling generateStart11...');
      await generateStart11({
        onlyStart11Players: false,
        maxBudget: currentTeam.budget
      });
      console.log('[DEBUG] generateStart11 completed successfully');
    } catch (err) {
      console.error('[DEBUG] Error in handleGenerate:', err);
    }
  };

  const selectedPlayersCount = Object.keys(currentTeam.players).length;
  const hasSelectedPlayers = selectedPlayersCount > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            KI generiert...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            KI S11 Gen
          </>
        )}
      </Button>

      {/* Info Text */}
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>Generiert optimale Start11 basierend auf X-Werten</p>
        <p>Berücksichtigt alle verfügbaren und fitten Spieler</p>
        {hasSelectedPlayers && (
          <p className="text-blue-400">
            {selectedPlayersCount} bereits ausgewählte Spieler werden berücksichtigt
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded-md text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Fehler bei der Generierung</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Result */}
      {lastResult && !error && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-2 rounded-md text-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">Start11 erfolgreich generiert!</span>
          </div>
          <div className="text-xs space-y-1">
            <p>Formation: {lastResult.team.formation}</p>
            <p>Gesamtkosten: {(lastResult.team.totalCost / 1000000).toFixed(1)}M €</p>
            <p>Spieler berücksichtigt: {lastResult.stats.totalPlayersConsidered}</p>
            <p>Generierungszeit: {lastResult.stats.generationTimeMs}ms</p>
          </div>
          
          {/* Toggle Details Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="mt-2 h-6 px-2 text-xs text-green-400 hover:text-green-300"
          >
            {showDetails ? 'Details ausblenden' : 'Details anzeigen'}
          </Button>
          
          {/* Detailed Results */}
          {showDetails && lastResult.alternatives.length > 1 && (
            <div className="mt-2 pt-2 border-t border-green-500/20">
              <p className="text-xs font-medium mb-1">Alternative Formationen:</p>
              <div className="space-y-1">
                {lastResult.alternatives.slice(1, 4).map((alt, index) => (
                  <div key={alt.formation} className="text-xs flex justify-between">
                    <span>{alt.formation}</span>
                    <span>{(alt.totalCost / 1000000).toFixed(1)}M € (Score: {alt.score.toFixed(1)})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2">
        <p className="font-medium mb-1">💡 Wie funktioniert die KI-Generierung?</p>
        <ul className="space-y-0.5 text-xs">
          <li>• Berechnet X-Faktor für alle verfügbaren Spieler</li>
          <li>• Berücksichtigt alle fitten und verfügbaren Spieler</li>
          <li>• Optimiert Formation und Spielerauswahl</li>
          <li>• Respektiert Budget und bereits ausgewählte Spieler</li>
        </ul>
      </div>
    </div>
  );
}
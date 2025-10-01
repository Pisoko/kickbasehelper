'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WarmupProgress {
  isWarming: boolean;
  total: number;
  completed: number;
  currentTask: string;
  errors: string[];
}

interface WarmupRecommendation {
  recommended: boolean;
  reasons: string[];
}

interface WarmupResult {
  success: boolean;
  duration: number;
  results: {
    allPlayers: number;
    playerDetails: number;
    teamLogos: number;
    matches: number;
  };
  errors: string[];
}

export function CacheWarmupIndicator() {
  const [progress, setProgress] = useState<WarmupProgress>({
    isWarming: false,
    total: 0,
    completed: 0,
    currentTask: '',
    errors: []
  });
  
  const [recommendation, setRecommendation] = useState<WarmupRecommendation>({
    recommended: false,
    reasons: []
  });
  
  const [lastResult, setLastResult] = useState<WarmupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial status
  useEffect(() => {
    fetchStatus();
  }, []);

  // Poll progress during warmup
  useEffect(() => {
    if (progress.isWarming) {
      const interval = setInterval(fetchStatus, 1000);
      return () => clearInterval(interval);
    }
  }, [progress.isWarming]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/cache/warmup');
      const data = await response.json();
      
      if (data.success) {
        setProgress(data.progress);
        setRecommendation(data.recommendation);
      }
    } catch (error) {
      console.error('Failed to fetch warmup status:', error);
    }
  };

  const startWarmup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cache/warmup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeAllPlayers: true,
          includePlayerDetails: true,
          includeTeamLogos: true
        })
      });
      
      const result = await response.json();
      setLastResult(result);
      
      // Refresh status after warmup
      await fetchStatus();
    } catch (error) {
      console.error('Failed to start warmup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {progress.isWarming ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : lastResult?.success ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : recommendation.recommended ? (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          Cache Warmup Status
        </CardTitle>
        <CardDescription>
          Lädt alle Daten vor für optimale Performance
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recommendation Alert */}
        {recommendation.recommended && !progress.isWarming && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Cache-Warmup empfohlen: {recommendation.reasons.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Progress during warmup */}
        {progress.isWarming && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Fortschritt: {progress.completed} / {progress.total}</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            
            <Progress value={progressPercentage} className="w-full" />
            
            {progress.currentTask && (
              <p className="text-sm text-muted-foreground">
                Aktuell: {progress.currentTask}
              </p>
            )}
            
            {progress.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {progress.errors.length} Fehler aufgetreten
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Last result */}
        {lastResult && !progress.isWarming && (
          <div className="space-y-2">
            <h4 className="font-medium">Letztes Warmup-Ergebnis:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Alle Spieler: {lastResult.results.allPlayers}</div>
              <div>Spielerdetails: {lastResult.results.playerDetails}</div>
              <div>Team-Logos: {lastResult.results.teamLogos}</div>
              <div>Spiele: {lastResult.results.matches}</div>
            </div>
            <p className="text-sm text-muted-foreground">
              Dauer: {(lastResult.duration / 1000).toFixed(1)}s
            </p>
            
            {lastResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {lastResult.errors.length} Fehler: {lastResult.errors.slice(0, 3).join(', ')}
                  {lastResult.errors.length > 3 && '...'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={startWarmup}
            disabled={progress.isWarming || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {progress.isWarming ? 'Läuft...' : 'Cache Warmup starten'}
          </Button>
          
          <Button
            variant="outline"
            onClick={fetchStatus}
            disabled={progress.isWarming}
          >
            Status aktualisieren
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Inline Badge component
const Badge = ({ children, variant = 'default', className = '' }: { 
  children: React.ReactNode; 
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'; 
  className?: string;
}) => {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border border-input bg-background hover:bg-accent hover:text-accent-foreground"
  };
  
  return (
    <div className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      variants[variant],
      className
    )}>
      {children}
    </div>
  );
};

interface CacheInvalidationButtonProps {
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function CacheInvalidationButton({ 
  className, 
  variant = 'outline', 
  size = 'default' 
}: CacheInvalidationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    timestamp: string;
  } | null>(null);

  const invalidateCurrentMatchday = async () => {
    setIsLoading(true);
    setLastResult(null);

    try {
      // First get current matchday info
      const statusResponse = await fetch('/api/cache/invalidate-matchday');
      const statusData = await statusResponse.json();
      
      if (!statusData.success) {
        throw new Error('Failed to get current matchday info');
      }

      const currentMatchday = statusData.data.currentMatchday;

      // Invalidate cache for current matchday
      const response = await fetch('/api/cache/invalidate-matchday', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spieltag: currentMatchday
        }),
      });

      const result = await response.json();

      if (result.success) {
        setLastResult({
          success: true,
          message: `Cache für Spieltag ${currentMatchday} invalidiert`,
          timestamp: new Date().toLocaleTimeString()
        });

        // Trigger a page refresh to load fresh data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const invalidateAllMatchdays = async () => {
    setIsLoading(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/cache/invalidate-matchday', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invalidateAll: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        setLastResult({
          success: true,
          message: `Cache für ${result.invalidatedMatchdays.length} Spieltage invalidiert`,
          timestamp: new Date().toLocaleTimeString()
        });

        // Trigger a page refresh to load fresh data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex gap-2">
        <Button
          variant={variant}
          size={size}
          onClick={invalidateCurrentMatchday}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Cache aktualisieren
        </Button>

        <Button
          variant="destructive"
          size={size}
          onClick={invalidateAllMatchdays}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Alle invalidieren
        </Button>
      </div>

      {lastResult && (
        <div className="flex items-center gap-2">
          {lastResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <Badge 
            variant={lastResult.success ? 'default' : 'destructive'}
            className="text-xs"
          >
            {lastResult.message} ({lastResult.timestamp})
          </Badge>
        </div>
      )}
    </div>
  );
}
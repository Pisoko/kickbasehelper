import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import { cva } from 'class-variance-authority';
import { cn } from '../lib/utils';
import PlayerImage from './PlayerImage';
import BundesligaLogo from './BundesligaLogo';
import { getFullTeamName } from '../lib/teamMapping';

// Dynamic import for PlayerMatchHistory with loading skeleton
const PlayerMatchHistory = dynamic(() => import('./PlayerMatchHistory'), {
  ssr: false,
  loading: () => (
    <div className="space-y-3" role="status" aria-label="Lade Spielhistorie...">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
      <span className="sr-only">Lade Spielhistorie...</span>
    </div>
  )
});

// Number formatters
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('de-DE').format(num)
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Function to translate positions to German
const translatePosition = (position: string): string => {
  const positionMap: Record<string, string> = {
    'GK': 'TW',
    'DEF': 'ABW',
    'MID': 'MF',
    'FWD': 'ANG'
  };
  return positionMap[position] || position;
};

// Helper function to get position color
const getPositionColor = (position: string): string => {
  switch (position) {
    case 'GK': return 'bg-blue-500 text-white';
    case 'DEF': return 'bg-green-500 text-white';
    case 'MID': return 'bg-yellow-500 text-black';
    case 'FWD': return 'bg-red-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

// Dialog variants with mobile-first approach and dark mode support
const dialogVariants = cva(
  "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background text-foreground shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] p-4 sm:p-6 sm:rounded-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-lg h-[90vh] overflow-y-auto",
        lg: "max-w-2xl h-[90vh] overflow-y-auto",
        xl: "max-w-4xl h-[90vh] overflow-y-auto",
      },
    },
    defaultVariants: {
      size: "lg",
    },
  }
);

// Stat card component props interface
interface StatCardProps {
  title: string;
  value: string;
  className?: string;
}

// Stat card component with mobile-first design and accessibility
const StatCard: React.FC<StatCardProps> = ({ title, value, className }) => (
  <div 
    className={cn(
      "bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors",
      className
    )}
    role="group"
    aria-labelledby={`stat-${title.replace(/\s+/g, '-').toLowerCase()}`}
    tabIndex={0}
  >
    <dt 
      id={`stat-${title.replace(/\s+/g, '-').toLowerCase()}`}
      className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1"
    >
      {title}
    </dt>
    <dd 
      className="text-lg font-semibold text-gray-900 dark:text-gray-100"
      aria-label={`${title}: ${value}`}
    >
      {value}
    </dd>
  </div>
);

// Badge component props interface
interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "destructive" | "secondary";
  className?: string;
}

// Badge component
const Badge: React.FC<BadgeProps> = ({ children, variant = "default", className }) => {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const variantClasses = {
    default: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800",
    destructive: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800",
    secondary: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
  };

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </span>
  );
};

// Player interface with strict typing - matching global Player type
interface Player {
  id: string;
  name: string;
  firstName?: string;
  position: string;
  verein: string;
  kosten: number;
  punkte_hist: number[];
  punkte_avg: number;
  punkte_sum: number;
  totalPoints?: number;
  marketValue?: number;
  playerImageUrl?: string;
  isInjured?: boolean;
  status?: string;
  goals?: number;
  assists?: number;
  minutesPlayed?: number;
  totalMinutesPlayed?: number;
  appearances?: number;
  jerseyNumber?: number;
  yellowCards?: number;
  redCards?: number;
}

// Performance data interface
interface PerformanceData {
  start11Count: number;
  actualAppearances: number;
}

export interface PlayerDetailModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerDetailModal({ player, isOpen, onClose }: PlayerDetailModalProps) {
  const [start11Count, setStart11Count] = useState<number>(0);
  const [actualAppearances, setActualAppearances] = useState<number>(0);
  const [totalMatchdays, setTotalMatchdays] = useState<number>(4);

  useEffect(() => {
    if (player?.id) {
      // Fetch performance data with proper typing
      const fetchPerformanceData = async (): Promise<void> => {
        try {
          // Fix: Use query parameter instead of path parameter
          const response = await fetch(`/api/player-performance?playerId=${player.id}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log('Performance data received:', data);
          
          // Use the new API response format
          if (data.actualAppearances !== undefined && data.start11Count !== undefined && data.totalMatchdays !== undefined) {
            setActualAppearances(data.actualAppearances);
            setStart11Count(data.start11Count);
            setTotalMatchdays(data.totalMatchdays);
          } else if (data.matches && Array.isArray(data.matches)) {
            // Fallback to old calculation method
            const actualAppearances = data.matches.filter((match: any) => match.playerMinutes > 0).length;
            const start11Count = data.matches.filter((match: any) => match.playerMinutes >= 45).length;
            const totalMatchdays = data.matches.length > 0 ? Math.max(...data.matches.map((match: any) => match.matchday)) : 4;
            
            setActualAppearances(actualAppearances);
            setStart11Count(start11Count);
            setTotalMatchdays(totalMatchdays);
          } else {
            // Fallback to mock data if no matches found
            setActualAppearances(3);
            setStart11Count(2);
            setTotalMatchdays(4);
          }
        } catch (error) {
          console.error('Error fetching performance data:', error);
          // Set mock values for demonstration
          setStart11Count(2);
          setActualAppearances(3);
          setTotalMatchdays(4);
        }
      };
      
      fetchPerformanceData();
    }
  }, [player?.id]);

  if (!player) return null;

  // Calculate derived stats
  const totalMinutes = actualAppearances * 90;
  const totalPoints = player.totalPoints || player.punkte_sum || 0;
  const marketValue = player.marketValue || player.kosten || 0;
  const pointsPerMinute = totalMinutes > 0 ? totalPoints / totalMinutes : 0;
  const pointsPerMillion = marketValue > 0 ? (totalPoints / (marketValue / 1000000)) : 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content 
          className={cn(dialogVariants({ size: "xl" }))}
          aria-labelledby="player-detail-title"
          aria-describedby="player-detail-description"
        >
          {/* Header - Mobile optimized - Reduced horizontal spacing */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                 <PlayerImage 
                   playerImageUrl={player.playerImageUrl} 
                   playerName={player.name}
                   className="rounded-full object-cover w-24 h-24 sm:w-32 sm:h-32"
                   size="xl"
                 />
               </div>
              <div className="flex flex-col">
                {/* Vorname */}
                {player.firstName && (
                  <p className="text-sm sm:text-base text-muted-foreground mb-1">
                    {player.firstName}
                  </p>
                )}
                {/* Nachname - größer und fett */}
                <Dialog.Title id="player-detail-title" className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {player.name}
                </Dialog.Title>
                {/* Vereinsinformationen */}
                <div className="flex items-center gap-1 mb-2">
                  {player.verein && <BundesligaLogo teamName={player.verein} size="sm" />}
                  <span className="text-sm text-muted-foreground">{getFullTeamName(player.verein || '') || 'Unbekanntes Team'}</span>
                </div>
                {/* Position mit Farbkodierung */}
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${getPositionColor(player.position)}`}>
                    {translatePosition(player.position)}
                  </span>
                  {player.isInjured && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      ⚠️ Verletzt
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Dialog.Close asChild>
              <button 
                className="h-11 w-11 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="Schließen"
              >
                <span className="sr-only">Schließen</span>
                ✕
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description id="player-detail-description" className="sr-only">
            Detaillierte Statistiken für {player.name}
          </Dialog.Description>

          {/* Stats Grid - Mobile First - Reduced spacing */}
           <section aria-labelledby="main-stats-heading" className="mb-4">
             <h3 id="main-stats-heading" className="sr-only">Hauptstatistiken</h3>
             <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
               <StatCard
                 title="Punkte"
                 value={formatNumber(player.totalPoints || player.punkte_sum || 0)}
               />
               <StatCard
                 title="Marktwert"
                 value={formatCurrency(player.marketValue || player.kosten || 0)}
               />
               <StatCard
                 title="Punkte/Min"
                 value={pointsPerMinute.toFixed(2)}
               />
               <StatCard
                 title="Punkte/Mio €"
                 value={pointsPerMillion.toFixed(1)}
               />
             </div>
           </section>

          {/* Additional Stats - Reduced spacing */}
           <section aria-labelledby="additional-stats-heading" className="mb-4">
             <h3 id="additional-stats-heading" className="text-lg font-semibold mb-3">Weitere Statistiken</h3>
             <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
               <StatCard
                 title="Einsätze"
                 value={`${actualAppearances} von ${totalMatchdays}`}
               />
               <StatCard
                 title="Start-11"
                 value={`${start11Count} von ${totalMatchdays}`}
               />
               <StatCard
                 title="Spielzeit"
                 value={`${totalMinutes} Min`}
               />
             </div>
           </section>

          {/* Match History - Reduced spacing */}
           <section aria-labelledby="match-history-heading">
             <PlayerMatchHistory 
               playerId={player.id} 
               playerName={player.name}
               currentTeam={player.verein}
             />
           </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
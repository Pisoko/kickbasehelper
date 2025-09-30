import React from 'react';
import { cn } from '../lib/utils';

interface KickbaseBarProps {
  points: number;
  minutes?: number | null;
  maxPoints?: number;
  className?: string;
  showValue?: boolean;
  showMinutes?: boolean;
}

/**
 * Berechnet die Balkenfüllung nach der Kickbase-Kurve
 * f = a·t^g + b mit t = clamp(points / max, 0, 1)
 */
function calculateFillHeight(points: number, max: number = 356): number {
  // Normalisierung: t = clamp(points / max, 0, 1)
  const t = Math.max(0, Math.min(1, points / max));
  
  // Kurvenparameter für Kickbase-Look
  const g = 0.71; // Konkaver Exponent
  const a = 1.3142521077;
  const b = -0.1179719468;
  
  // Kurvenberechnung: f = a·t^g + b
  const f = a * Math.pow(t, g) + b;
  
  // Clamping auf [0,1]
  return Math.max(0, Math.min(1, f));
}

/**
 * Bestimmt die Farbe basierend auf der Punktzahl
 */
function getBarColorClasses(points: number): string {
  if (points <= 0) return 'kickbase-bar-red';
  if (points <= 99) return 'kickbase-bar-orange';
  if (points <= 199) return 'kickbase-bar-green';
  return 'kickbase-bar-mint';
}

/**
 * Bestimmt die Textfarbe basierend auf der Punktzahl
 */
function getValueColor(points: number): string {
  if (points <= 0) return '#ff4444';
  if (points <= 99) return '#ff8800';
  if (points <= 199) return '#00ff88';
  return '#66ffcc';
}

/**
 * Kickbase-Stil Balkenkomponente mit konkaver Kurvenberechnung
 * 
 * Die Kurve f = a·t^g + b sorgt dafür, dass niedrige Punktzahlen visuell 
 * stärker repräsentiert werden, während hohe Punktzahlen weniger stark 
 * ansteigen - typisch für Kickbase's visuelle Darstellung.
 */
export default function KickbaseBar({
  points,
  minutes = null,
  maxPoints = 356,
  className,
  showValue = true,
  showMinutes = true
}: KickbaseBarProps) {
  // Berechnung der Füllhöhe über die Kickbase-Kurve
  const fillHeight = calculateFillHeight(points, maxPoints);
  const fillPercent = Math.round(fillHeight * 100);
  
  // Farbbestimmung
  const colorClass = getBarColorClasses(points);
  const valueColor = getValueColor(points);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {/* Balken */}
      <div 
        className="relative w-11 h-30 bg-gray-800 rounded-lg overflow-hidden border border-gray-600"
        role="progressbar"
        aria-valuenow={points}
        aria-valuemin={0}
        aria-valuemax={maxPoints}
        aria-label={`Spielerpunkte: ${points} von ${maxPoints}`}
      >
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 h-full rounded-lg transition-all duration-300 ease-out",
            colorClass
          )}
          style={{
            '--fill': `${fillPercent}%`,
            WebkitMask: `linear-gradient(to top, black var(--fill), transparent var(--fill))`,
            mask: `linear-gradient(to top, black var(--fill), transparent var(--fill))`
          } as React.CSSProperties}
        />
      </div>
      
      {/* Wert */}
      {showValue && (
        <div 
          className="text-sm font-semibold text-center min-h-5"
          style={{ color: valueColor }}
        >
          {points}
        </div>
      )}
      
      {/* Minuten */}
      {showMinutes && minutes !== null && (
        <div className="text-xs text-gray-400 text-center">
          {minutes} Min
        </div>
      )}
      
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

// Export der Hilfsfunktionen für externe Nutzung
export { calculateFillHeight, getBarColorClasses, getValueColor };
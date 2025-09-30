'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  onRefresh: () => void;
  isLoading?: boolean;
  className?: string;
}

const COOLDOWN_DURATION = 60 * 60 * 1000; // 60 Minuten in Millisekunden
const STORAGE_KEY = 'refresh-button-last-click';

export default function RefreshButton({ 
  onRefresh, 
  isLoading = false, 
  className = '' 
}: RefreshButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Setze isClient auf true nach der Hydration
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Prüfe nur auf der Client-Seite, ob der Button sichtbar sein soll
    if (!isClient) return;
    
    const checkVisibility = () => {
      const lastClickTime = localStorage.getItem(STORAGE_KEY);
      if (lastClickTime) {
        const timeSinceLastClick = Date.now() - parseInt(lastClickTime);
        if (timeSinceLastClick < COOLDOWN_DURATION) {
          setIsVisible(false);
          setTimeRemaining(COOLDOWN_DURATION - timeSinceLastClick);
        } else {
          setIsVisible(true);
          setTimeRemaining(0);
          // Entferne veralteten Eintrag
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    checkVisibility();
  }, [isClient]);

  useEffect(() => {
    // Timer für Countdown und Sichtbarkeit
    if (!isVisible && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            setIsVisible(true);
            // Entferne localStorage-Eintrag nur auf der Client-Seite
            if (isClient) {
              localStorage.removeItem(STORAGE_KEY);
            }
            return 0;
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isVisible, timeRemaining, isClient]);

  const handleClick = () => {
    // Speichere Zeitpunkt des Klicks nur auf der Client-Seite
    if (isClient) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
    
    // Verstecke Button für 60 Minuten
    setIsVisible(false);
    setTimeRemaining(COOLDOWN_DURATION);
    
    // Führe Refresh-Funktion aus
    onRefresh();
  };

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible) {
    return (
      <div className={`text-sm text-slate-400 ${className}`}>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <span>Nächste Aktualisierung in: {formatTimeRemaining(timeRemaining)}</span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-2 px-4 py-2 
        bg-emerald-600 hover:bg-emerald-700 
        text-white font-semibold rounded-lg 
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950
        ${className}
      `}
      aria-label="Daten aktualisieren"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Aktualisiere...' : 'Daten aktualisieren'}
    </button>
  );
}
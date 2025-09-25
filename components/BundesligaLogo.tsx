'use client';

import { useState, useEffect } from 'react';
import { getBundesligaLogoUrl, getLogoFallbackText, hasLogo } from '../lib/adapters/BundesligaLogoService';

interface BundesligaLogoProps {
  teamName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12', 
  lg: 'w-16 h-16'
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-xs'
};

export default function BundesligaLogo({ teamName, size = 'md', className = '' }: BundesligaLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  
  const logoUrl = getBundesligaLogoUrl(teamName);
  const fallbackText = getLogoFallbackText(teamName);

  useEffect(() => {
    let isMounted = true;

    const loadLogo = async () => {
      setIsLoading(true);
      setImageError(false);

      // If we have a logo URL, try to load it
      if (logoUrl && hasLogo(teamName)) {
        // Test if the image loads successfully
        const img = new Image();
        img.onload = () => {
          if (isMounted) {
            setCurrentLogoUrl(logoUrl);
            setIsLoading(false);
            setImageError(false);
          }
        };
        img.onerror = () => {
          if (isMounted) {
            setImageError(true);
            setCurrentLogoUrl(null);
            setIsLoading(false);
          }
        };
        img.src = logoUrl;
      } else {
        // No logo available, use fallback immediately
        if (isMounted) {
          setCurrentLogoUrl(null);
          setImageError(true);
          setIsLoading(false);
        }
      }
    };

    loadLogo();

    return () => {
      isMounted = false;
    };
  }, [teamName, logoUrl]);

  const handleImageError = () => {
    setImageError(true);
    setCurrentLogoUrl(null);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={`${sizeClasses[size]} bg-slate-600 flex items-center justify-center animate-pulse ${className}`}>
        <div className="w-2 h-2 bg-slate-400"></div>
      </div>
    );
  }

  // Show fallback if no logo or error
  if (!currentLogoUrl || imageError || !hasLogo(teamName)) {
    return (
      <div className={`${sizeClasses[size]} bg-slate-700 flex items-center justify-center ${className}`}>
        <span className={`text-white ${textSizeClasses[size]} font-bold`}>
          {fallbackText}
        </span>
      </div>
    );
  }

  // Show the actual logo
  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center ${className}`}>
      <img
        src={currentLogoUrl}
        alt={`${teamName} Logo`}
        className="w-full h-full object-contain"
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  );
}
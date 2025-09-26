'use client';

import { useState, useEffect } from 'react';
import { getBundesligaLogoUrl, getLogoFallbackText, hasLogo } from '../lib/adapters/BundesligaLogoService';
import { 
  getBundesligaLogoUrlByTeamName, 
  getBundesligaLogoUrlByKickbaseId,
  hasLogoByTeamName,
  hasLogoByKickbaseId,
  getTeamByKickbaseId,
  getTeamByFullName
} from '../lib/teamMapping';

interface BundesligaLogoProps {
  teamName?: string;
  kickbaseId?: string;
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

export default function BundesligaLogo({ teamName, kickbaseId, size = 'md', className = '' }: BundesligaLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  
  // Validate that either teamName or kickbaseId is provided
  if (!teamName && !kickbaseId) {
    throw new Error('BundesligaLogo: Either teamName or kickbaseId must be provided');
  }
  
  // Get team info and logo URL using new mapping functions
  let logoUrl: string | undefined;
  let hasTeamLogo: boolean;
  let displayName: string;
  let fallbackText: string;
  
  if (kickbaseId) {
    const teamInfo = getTeamByKickbaseId(kickbaseId);
    logoUrl = getBundesligaLogoUrlByKickbaseId(kickbaseId);
    hasTeamLogo = hasLogoByKickbaseId(kickbaseId);
    displayName = teamInfo?.fullName || `Team ${kickbaseId}`;
    fallbackText = teamInfo?.shortName || kickbaseId.slice(-2).toUpperCase();
  } else if (teamName) {
    logoUrl = getBundesligaLogoUrlByTeamName(teamName);
    hasTeamLogo = hasLogoByTeamName(teamName);
    displayName = teamName;
    // Fallback to old function for backward compatibility
    fallbackText = getLogoFallbackText(teamName);
  } else {
    logoUrl = undefined;
    hasTeamLogo = false;
    displayName = 'Unknown Team';
    fallbackText = '??';
  }

  useEffect(() => {
    let isMounted = true;

    const loadLogo = async () => {
      setIsLoading(true);
      setImageError(false);

      // If we have a logo URL, try to load it
      if (logoUrl && hasTeamLogo) {
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
  }, [teamName, kickbaseId, logoUrl, hasTeamLogo]);

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
  if (!currentLogoUrl || imageError || !hasTeamLogo) {
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
        alt={`${displayName} Logo`}
        className="w-full h-full object-contain"
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  );
}
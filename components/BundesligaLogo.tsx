'use client';

import { useState } from 'react';
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
  const logoUrl = getBundesligaLogoUrl(teamName);
  const fallbackText = getLogoFallbackText(teamName);
  
  // Wenn kein Logo verfügbar ist oder das Bild nicht geladen werden kann, zeige Fallback
  if (!logoUrl || imageError || !hasLogo(teamName)) {
    return (
      <div className={`${sizeClasses[size]} bg-slate-700 rounded-full flex items-center justify-center ${className}`}>
        <span className={`text-white ${textSizeClasses[size]} font-bold`}>
          {fallbackText}
        </span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center ${className}`}>
      <img
        src={logoUrl}
        alt={`${teamName} Logo`}
        className="w-full h-full object-contain"
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    </div>
  );
}
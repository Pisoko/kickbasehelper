'use client';

import { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import { getKickbaseImageUrl, generateInitialsUrl, searchTheSportsDBImage, getBundesligaImageUrl, testImageUrl, isKnownPlaceholderImage } from '../lib/imageUtils';

interface PlayerImageProps {
  playerImageUrl?: string;
  playerName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12', 
  lg: 'h-16 w-16',
  xl: 'h-32 w-32'
};

const sizeDimensions = {
  sm: { width: 32, height: 32 },
  md: { width: 48, height: 48 },
  lg: { width: 64, height: 64 },
  xl: { width: 128, height: 128 }
};

const PlayerImage = memo(function PlayerImage({ 
  playerImageUrl, 
  playerName, 
  className = '', 
  size = 'md' 
}: PlayerImageProps) {
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      setIsLoading(true);
      setImageError(false);

      // Skip known placeholder images from Kickbase
      if (isKnownPlaceholderImage(playerImageUrl)) {
        // Skip Kickbase image and go directly to fallbacks
      } else {
        // Try Kickbase CDN first
        const kickbaseUrl = getKickbaseImageUrl(playerImageUrl);
        if (kickbaseUrl && isMounted) {
          const isKickbaseValid = await testImageUrl(kickbaseUrl);
          if (isKickbaseValid) {
            setCurrentImageUrl(kickbaseUrl);
            return;
          }
        }
      }

      // If no Kickbase image, try Bundesliga images
      try {
        const bundesligaUrl = await getBundesligaImageUrl(playerName);
        if (bundesligaUrl && isMounted) {
          setCurrentImageUrl(bundesligaUrl);
          return;
        }
      } catch (error) {
        console.warn('Bundesliga image search failed:', error);
      }

      // If no Bundesliga image, try TheSportsDB
      try {
        const theSportsDBUrl = await searchTheSportsDBImage(playerName);
        if (theSportsDBUrl && isMounted) {
          setCurrentImageUrl(theSportsDBUrl);
          return;
        }
      } catch (error) {
        console.warn('TheSportsDB image search failed:', error);
      }

      // Fallback to initials
      if (isMounted) {
        setCurrentImageUrl(generateInitialsUrl(playerName));
      }
    };

    loadImage().finally(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [playerImageUrl, playerName]);

  const handleImageError = async () => {
    if (imageError) return; // Prevent infinite loops
    
    setImageError(true);
    
    // If Kickbase image failed, try Bundesliga images
    if (currentImageUrl?.includes('cdn.kickbase.com')) {
      try {
        const bundesligaUrl = await getBundesligaImageUrl(playerName);
        if (bundesligaUrl) {
          setCurrentImageUrl(bundesligaUrl);
          setImageError(false);
          return;
        }
      } catch (error) {
        console.warn('Bundesliga fallback failed:', error);
      }
    }
    
    // If Bundesliga image failed, try TheSportsDB
    if (currentImageUrl?.includes('/images/players/') || currentImageUrl?.includes('cdn.kickbase.com')) {
      try {
        const theSportsDBUrl = await searchTheSportsDBImage(playerName);
        if (theSportsDBUrl) {
          setCurrentImageUrl(theSportsDBUrl);
          setImageError(false);
          return;
        }
      } catch (error) {
        console.warn('TheSportsDB fallback failed:', error);
      }
    }
    
    // Ultimate fallback to initials
    setCurrentImageUrl(generateInitialsUrl(playerName));
    setImageError(false);
  };

  const baseClasses = `${sizeClasses[size]} rounded-full object-cover border-2 border-slate-600`;

  if (isLoading) {
    return (
      <div className={`${baseClasses} bg-slate-600 animate-pulse ${className}`} />
    );
  }

  const imageUrl = currentImageUrl || generateInitialsUrl(playerName);
  const dimensions = sizeDimensions[size];

  return (
    <div className={`${baseClasses} ${className} relative overflow-hidden`}>
      <Image
        src={imageUrl}
        alt={playerName}
        width={dimensions.width}
        height={dimensions.height}
        className="object-cover"
        onError={handleImageError}
        unoptimized={imageUrl.startsWith('data:')} // Don't optimize SVG data URLs
        sizes={`${dimensions.width}px`}
      />
    </div>
  );
});

export default PlayerImage;
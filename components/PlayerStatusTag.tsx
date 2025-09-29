'use client';

import { memo } from 'react';

interface PlayerStatusTagProps {
  status?: string | number;
  isInjured?: boolean;
  className?: string;
}

/**
 * Spielerstatus-Codes:
 * 0 - Fit (Grün)
 * 1 - Verletzt (Rot)
 * 2 - Angeschlagen (Gelb)
 * 4 - Aufbautraining (Gelb)
 * 8 - Glatt Rot (Rot)
 * 16 - Gelb-Rote Karte (Rot)
 */

const getStatusInfo = (status?: string | number, isInjured?: boolean) => {
  // If we have a status code, use it
  if (status !== undefined && status !== null) {
    const statusCode = typeof status === 'string' ? parseInt(status) : status;
    return getStatusInfoByCode(statusCode);
  }
  
  // Fallback: use isInjured field if available
  if (isInjured === true) {
    return getStatusInfoByCode(1); // Treat as injured
  }
  
  // Default to fit
  return getStatusInfoByCode(0);
};

const getStatusInfoByCode = (statusCode: number) => {
  
  switch (statusCode) {
    case 0:
      return {
        label: 'Fit',
        bgColor: 'bg-green-500/20',
        textColor: 'text-green-400',
        borderColor: 'border-green-400/30'
      };
    case 1:
      return {
        label: 'Verletzt',
        bgColor: 'bg-red-500/20',
        textColor: 'text-red-400',
        borderColor: 'border-red-400/30'
      };
    case 2:
      return {
        label: 'Angeschlagen',
        bgColor: 'bg-yellow-500/20',
        textColor: 'text-yellow-400',
        borderColor: 'border-yellow-400/30'
      };
    case 4:
      return {
        label: 'Aufbautraining',
        bgColor: 'bg-yellow-500/20',
        textColor: 'text-yellow-400',
        borderColor: 'border-yellow-400/30'
      };
    case 8:
      return {
        label: 'Glatt Rot',
        bgColor: 'bg-red-500/20',
        textColor: 'text-red-400',
        borderColor: 'border-red-400/30'
      };
    case 16:
      return {
        label: 'Gelb-Rote Karte',
        bgColor: 'bg-red-500/20',
        textColor: 'text-red-400',
        borderColor: 'border-red-400/30'
      };
    default:
      return {
        label: 'Fit',
        bgColor: 'bg-green-500/20',
        textColor: 'text-green-400',
        borderColor: 'border-green-400/30'
      };
  }
};

// Helper function to check if player is fit
export const isPlayerFit = (status?: string | number, isInjured?: boolean): boolean => {
  if (status !== undefined && status !== null) {
    const statusCode = typeof status === 'string' ? parseInt(status) : status;
    return statusCode === 0;
  }
  
  if (isInjured === true) {
    return false;
  }
  
  return true; // Default to fit
};

// Helper function to get row text color based on status
export const getRowTextColor = (status?: string | number, isInjured?: boolean): string => {
  if (isPlayerFit(status, isInjured)) {
    return ''; // No special color for fit players
  }
  
  const statusInfo = getStatusInfo(status, isInjured);
  return statusInfo.textColor;
};

// Export the getStatusInfo function for external use
export { getStatusInfo };

const PlayerStatusTag = memo(function PlayerStatusTag({ status, isInjured, className = '' }: PlayerStatusTagProps) {
  const statusInfo = getStatusInfo(status, isInjured);
  
  return (
    <span 
      className={`
        inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border
        ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor}
        ${className}
      `}
    >
      {statusInfo.label}
    </span>
  );
});

export default PlayerStatusTag;
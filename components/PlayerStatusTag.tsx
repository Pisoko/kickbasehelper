'use client';

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

export default function PlayerStatusTag({ status, isInjured, className = '' }: PlayerStatusTagProps) {
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
}
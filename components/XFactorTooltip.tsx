'use client';

import React from 'react';
import { calculatePointsPerMinute, calculatePointsPerMillion, getTeamOdds } from '@/lib/positionUtils';
import * as Tooltip from '@radix-ui/react-tooltip';

interface XFactorTooltipProps {
  children: React.ReactNode;
  totalPoints: number;
  totalMinutes: number;
  marketValue: number;
  teamName: string;
  xFactorValue: number;
  isFromCache?: boolean;
}

export function XFactorTooltip({
  children,
  totalPoints,
  totalMinutes,
  marketValue,
  teamName,
  xFactorValue,
  isFromCache = false
}: XFactorTooltipProps) {
  const pointsPerMinute = calculatePointsPerMinute(totalPoints, totalMinutes);
  const pointsPerMillion = calculatePointsPerMillion(totalPoints, marketValue);
  const teamOdds = getTeamOdds(teamName);

  const tooltipContent = (
    <div className="space-y-2 text-sm">
      <div className="font-semibold text-center">X-Faktor Berechnung</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Punkte/Min:</span>
          <span className="font-mono">{pointsPerMinute.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span>Punkte/Mio €:</span>
          <span className="font-mono">{pointsPerMillion.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span>Team-Quote:</span>
          <span className="font-mono">{teamOdds.toFixed(2)}</span>
        </div>
      </div>
      <div className="border-t pt-2">
        <div className="text-center font-mono text-xs text-muted-foreground">
          {pointsPerMinute.toFixed(3)} × {pointsPerMillion.toFixed(1)} × {teamOdds.toFixed(2)}
        </div>
        <div className="text-center font-semibold">
          = {xFactorValue.toFixed(2)}
        </div>
      </div>
      {isFromCache && (
        <div className="text-xs text-green-400 text-center">
          ✓ Mit aktuellen Quoten
        </div>
      )}
    </div>
  );

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content 
            side="top" 
            className="z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-w-xs"
            sideOffset={4}
          >
            {tooltipContent}
            <Tooltip.Arrow className="fill-current text-popover" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
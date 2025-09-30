'use client';

import React from 'react';
import RefreshButton from './RefreshButton';

interface AppHeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
  showRefreshButton?: boolean;
}

export default function AppHeader({ 
  onRefresh, 
  isLoading = false, 
  showRefreshButton = true 
}: AppHeaderProps) {
  return (
    <header className="mb-6 border-b border-slate-800 pb-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kickbase Data Hub</h1>
        </div>
        {showRefreshButton && onRefresh && (
          <RefreshButton 
            onRefresh={onRefresh}
            isLoading={isLoading}
          />
        )}
      </div>
    </header>
  );
}
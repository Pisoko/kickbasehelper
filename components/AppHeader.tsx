'use client';

import React from 'react';

interface AppHeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
  showRefreshButton?: boolean;
}

export default function AppHeader({ 
  onRefresh, 
  isLoading = false, 
  showRefreshButton = false 
}: AppHeaderProps) {
  return (
    <header className="mb-6 border-b border-slate-800 pb-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kickbase Data Hub</h1>
        </div>
        {/* Button ausgeblendet auf Benutzerwunsch */}
        {false && showRefreshButton && onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Lade...' : 'Daten aktualisieren'}
          </button>
        )}
      </div>
    </header>
  );
}
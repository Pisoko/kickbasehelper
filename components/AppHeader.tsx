'use client';

import React from 'react';
import ClearCache from './ClearCache';
import BuildInfo from './BuildInfo';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Users, Calendar, Trophy, Zap } from 'lucide-react';

type TabType = 'players' | 'matchday' | 'teams' | 'arena';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AppHeaderProps {
  showClearCache?: boolean;
  showBuildInfo?: boolean;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

const tabs: TabConfig[] = [
  { id: 'players', label: 'Spieler', icon: Users },
  { id: 'arena', label: 'Arena', icon: Zap },
  { id: 'matchday', label: 'Spieltag', icon: Calendar },
  { id: 'teams', label: 'Tabelle', icon: Trophy }
];

export default function AppHeader({ 
  showClearCache = true,
  showBuildInfo = true,
  activeTab = 'players',
  onTabChange
}: AppHeaderProps) {
  return (
    <header className="mb-6 pb-4">
      <div className="flex flex-col gap-4">
        {/* Top row with title and controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Kickbase Data Hub</h1>
            {showBuildInfo && <BuildInfo variant="ghost" size="sm" />}
          </div>
          <div className="flex items-center gap-2">
            {showClearCache && <ClearCache />}
          </div>
        </div>
        
        {/* Tab navigation */}
        <Tabs value={activeTab} onValueChange={(value: string) => onTabChange?.(value as TabType)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex items-center gap-2"
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
    </header>
  );
}
'use client';

import PlayerImage from './PlayerImage';

const formatter = new Intl.NumberFormat('de-DE', { 
  style: 'currency', 
  currency: 'EUR', 
  maximumFractionDigits: 0 
});

// Function to translate positions to German
const translatePosition = (position) => {
  const positionMap = {
    'GK': 'TW',
    'DEF': 'ABW', 
    'MID': 'MF',
    'FWD': 'ST'
  };
  return positionMap[position] || position;
};

export default function PlayerDetailModal({ player, isOpen, onClose }) {
  if (!isOpen || !player) return null;

  // Calculate recent form (last 3 games average)
  const recentForm = player.punkte_hist?.slice(-3).reduce((sum, points) => sum + points, 0) / Math.min(3, player.punkte_hist?.length || 1) || 0;
  
  // Calculate total minutes played
  const totalMinutes = player.minutes_hist?.reduce((sum, minutes) => sum + minutes, 0) || 0;
  
  // Calculate games played
  const gamesPlayed = player.punkte_hist?.length || 0;

  // Calculate total goals and assists
  const totalGoals = player.goals_hist?.reduce((sum, goals) => sum + goals, 0) || player.goals || 0;
  const totalAssists = player.assists_hist?.reduce((sum, assists) => sum + assists, 0) || player.assists || 0;

  // Helper function to display full player name
  const getFullPlayerName = (player) => {
    if (player.firstName && player.firstName.trim()) {
      return `${player.firstName} ${player.name}`;
    }
    return player.name;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with close button */}
        <div className="relative p-6 border-b border-slate-700">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
          
          {/* Season Indicator */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full font-medium">
              Saison 2025/26
            </span>
          </div>
          
          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Player Info */}
            <div className="lg:col-span-1 text-center">
              {/* Player Image */}
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <PlayerImage 
                    playerImageUrl={player.playerImageUrl}
                    playerName={getFullPlayerName(player)}
                    size="xl"
                  />
                  
                  {/* Injury Status Indicator */}
                  {player.isInjured && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">🏥</span>
                    </div>
                  )}
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">{getFullPlayerName(player)}</h2>
              <p className="text-slate-300 text-lg mb-2">{player.verein}</p>
              <div className="inline-flex items-center justify-center px-3 py-1 bg-slate-700 text-slate-200 rounded-full text-sm font-medium mb-4">
                {translatePosition(player.position)}
              </div>
              
              {/* Status Indicators */}
              <div className="flex justify-center gap-2">
                {player.isInjured && (
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full">
                    Verletzt
                  </span>
                )}
                {player.status && player.status !== '0' && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">
                    Status: {player.status}
                  </span>
                )}
              </div>
            </div>
            
            {/* Right Columns - Stats */}
            <div className="lg:col-span-2">
              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-emerald-400">{player.punkte_avg.toFixed(1)}</div>
                  <div className="text-sm text-slate-400">Punkte</div>
                  <div className="text-xs text-slate-500 mt-1">Ø pro Spiel</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-400">{formatter.format(player.kosten)}</div>
                  <div className="text-sm text-slate-400">Marktwert</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-400">{totalGoals}</div>
                  <div className="text-sm text-slate-400">Tore</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-orange-400">{totalAssists}</div>
                  <div className="text-sm text-slate-400">Assists</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Empty for spacing */}
            <div className="lg:col-span-1"></div>
            
            {/* Right Columns - Additional Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Performance Metrics */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Leistung</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800 p-4 rounded-lg text-center">
                    <div className="text-xl font-bold text-yellow-400">{recentForm.toFixed(1)}</div>
                    <div className="text-sm text-slate-400">Form</div>
                    <div className="text-xs text-slate-500">Letzte 3 Spiele</div>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-lg text-center">
                    <div className="text-xl font-bold text-purple-400">{totalMinutes}</div>
                    <div className="text-sm text-slate-400">Minuten</div>
                    <div className="text-xs text-slate-500">Gesamt</div>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-lg text-center">
                    <div className="text-xl font-bold text-cyan-400">{gamesPlayed}</div>
                    <div className="text-sm text-slate-400">Spiele</div>
                    <div className="text-xs text-slate-500">Einsätze</div>
                  </div>
                </div>
              </div>
             </div>
           </div>

           {/* Performance Chart */}
          {player.punkte_hist && player.punkte_hist.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Leistungsverlauf</h3>
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-end space-x-3 h-20">
                  {player.punkte_hist?.slice(-3).map((points, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t flex-1 min-w-0 relative flex items-end justify-center pb-1"
                      style={{
                        height: `${Math.max((points / Math.max(...player.punkte_hist.slice(-3))) * 100, 25)}%`
                      }}
                      title={`Spiel ${index + 1}: ${points} Punkte`}
                    >
                      <span className="text-white text-xs font-bold text-center">
                        {points}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-400 mt-2 text-center">Letzte 3 Spiele</div>
              </div>
            </div>
          )}

          {/* Enhanced Statistics */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Statistiken</h3>
            <div className="bg-slate-800 p-4 rounded-lg space-y-3">
              {player.totalPoints && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Saisonpunkte gesamt</span>
                  <span className="text-white font-bold">{player.totalPoints}</span>
                </div>
              )}
              {player.minutesPlayed && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Gespielte Minuten</span>
                  <span className="text-white font-bold">{player.minutesPlayed}'</span>
                </div>
              )}
              {totalMinutes > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Ø Minuten/Spiel</span>
                  <span className="text-white font-bold">
                    {Math.round(totalMinutes / gamesPlayed)}'
                  </span>
                </div>
              )}
              {totalGoals > 0 && gamesPlayed > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tore pro Spiel</span>
                  <span className="text-white font-bold">
                    {(totalGoals / gamesPlayed).toFixed(2)}
                  </span>
                </div>
              )}
              {totalAssists > 0 && gamesPlayed > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Assists pro Spiel</span>
                  <span className="text-white font-bold">
                    {(totalAssists / gamesPlayed).toFixed(2)}
                  </span>
                </div>
              )}
              {(totalGoals + totalAssists) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Torbeteiligungen</span>
                  <span className="text-white font-bold">{totalGoals + totalAssists}</span>
                </div>
              )}
            </div>
          </div>

          {/* Value Analysis */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Wertanalyse</h3>
            <div className="bg-slate-800 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Punkte pro Million</span>
                <span className="text-emerald-400 font-bold">
                  {(player.punkte_avg / (player.kosten / 1000000)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Punkte gesamt</span>
                <span className="text-white font-bold">{player.punkte_sum}</span>
              </div>
              {totalMinutes > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Punkte pro Minute</span>
                  <span className="text-white font-bold">
                    {(player.punkte_sum / totalMinutes).toFixed(3)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Match Schedule */}
          <div className="space-y-3 mt-6">
            <h3 className="text-lg font-semibold text-white">Nächste Spiele</h3>
            <div className="space-y-2">
              {/* Mock upcoming matches - in a real app, this would come from API */}
              <div className="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">H</span>
                  </div>
                  <span className="text-white font-medium">vs Hoffenheim</span>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm">Spieltag 4</div>
                  <div className="text-slate-400 text-xs">1:4</div>
                </div>
              </div>
              
              <div className="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">B</span>
                  </div>
                  <span className="text-white font-medium">vs Bayern</span>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm">Spieltag 5</div>
                  <div className="text-slate-400 text-xs">Fr. 20:30</div>
                </div>
              </div>
              
              <div className="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">M</span>
                  </div>
                  <span className="text-white font-medium">vs Mainz</span>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm">Spieltag 6</div>
                  <div className="text-slate-400 text-xs">2025-10-04</div>
                </div>
              </div>
            </div>
            
            {/* Fitness Status */}
            <div className="bg-slate-800 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-white font-medium">Fit</span>
                </div>
                <div className="text-slate-400 text-sm">2025-08-19</div>
              </div>
              <div className="flex space-x-1 mt-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-sm"></div>
                <div className="w-4 h-4 bg-orange-500 rounded-sm"></div>
                <div className="text-slate-400 text-xs ml-2">×0 ×0</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
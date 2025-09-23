'use client';

import PlayerImage from './PlayerImage';

const formatter = new Intl.NumberFormat('de-DE', { 
  style: 'currency', 
  currency: 'EUR', 
  maximumFractionDigits: 0 
});

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

  // Get player image URL with CDN base
  const getPlayerImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `https://cdn.kickbase.com/${imageUrl}`;
  };

  // Get player initials for fallback
  const getPlayerInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Helper function to display full player name
  const getFullPlayerName = (player) => {
    if (player.firstName && player.firstName.trim()) {
      return `${player.firstName} ${player.name}`;
    }
    return player.name;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 text-center border-b border-slate-700">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            ✕
          </button>
          
          {/* Player Image */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <PlayerImage 
                playerImageUrl={player.playerImageUrl}
                playerName={getFullPlayerName(player)}
                size="lg"
                className="w-20 h-20"
              />
              
              {/* Injury Status Indicator */}
              {player.isInjured && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">🏥</span>
                </div>
              )}
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-white">{getFullPlayerName(player)}</h2>
          <p className="text-slate-300">{player.verein} • {player.position}</p>
          
          {/* Status Indicators */}
          <div className="flex justify-center gap-2 mt-2">
            {player.isInjured && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                Verletzt
              </span>
            )}
            {player.status && player.status !== '0' && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                Status: {player.status}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-emerald-400">{player.punkte_avg.toFixed(1)}</div>
              <div className="text-sm text-slate-400">Avg Points</div>
              {player.averagePoints && (
                <div className="text-xs text-slate-500 mt-1">
                  Season: {player.averagePoints.toFixed(1)}
                </div>
              )}
            </div>
            <div className="bg-slate-800 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">{formatter.format(player.kosten)}</div>
              <div className="text-sm text-slate-400">Cost</div>
              {player.marketValue && player.marketValue !== player.kosten && (
                <div className="text-xs text-slate-500 mt-1">
                  Real: {formatter.format(player.marketValue)}
                </div>
              )}
            </div>
          </div>

          {/* Goals and Assists */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">{totalGoals}</div>
              <div className="text-sm text-slate-400">Goals</div>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-400">{totalAssists}</div>
              <div className="text-sm text-slate-400">Assists</div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Performance</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-slate-800 p-3 rounded text-center">
                <div className="font-bold text-yellow-400">{recentForm.toFixed(1)}</div>
                <div className="text-slate-400">Recent Form</div>
              </div>
              <div className="bg-slate-800 p-3 rounded text-center">
                <div className="font-bold text-purple-400">{totalMinutes}</div>
                <div className="text-slate-400">Total Minutes</div>
              </div>
              <div className="bg-slate-800 p-3 rounded text-center">
                <div className="font-bold text-green-400">{gamesPlayed}</div>
                <div className="text-slate-400">Games Played</div>
              </div>
            </div>
          </div>

          {/* Performance Chart */}
          {player.punkte_hist && player.punkte_hist.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Leistungsverlauf</h3>
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-end space-x-2 h-24">
                  {player.punkte_hist?.slice(-3).map((points, index) => (
                    <div
                      key={index}
                      className="bg-blue-500 rounded-t flex-1 min-w-0 relative flex items-end justify-center pb-1"
                      style={{
                        height: `${Math.max((points / Math.max(...player.punkte_hist.slice(-3))) * 100, 20)}%`
                      }}
                      title={`Spiel ${index + 1}: ${points} Punkte`}
                    >
                      <span className="text-white text-xs font-bold text-center">
                        {points}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-400 mt-2">Letzte 3 Spiele</div>
              </div>
            </div>
          )}

          {/* Enhanced Statistics */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Detailed Statistics</h3>
            <div className="bg-slate-700 p-4 rounded-lg space-y-3">
              {player.totalPoints && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Saisonpunkte gesamt:</span>
                  <span className="text-white font-semibold">{player.totalPoints}</span>
                </div>
              )}
              {player.minutesPlayed && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Gespielte Minuten:</span>
                  <span className="text-white font-semibold">{player.minutesPlayed}'</span>
                </div>
              )}
              {totalMinutes > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Ø Minuten/Spiel:</span>
                  <span className="text-white font-semibold">
                    {Math.round(totalMinutes / gamesPlayed)}'
                  </span>
                </div>
              )}
              {totalGoals > 0 && gamesPlayed > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Tore pro Spiel:</span>
                  <span className="text-white font-semibold">
                    {(totalGoals / gamesPlayed).toFixed(2)}
                  </span>
                </div>
              )}
              {totalAssists > 0 && gamesPlayed > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Assists pro Spiel:</span>
                  <span className="text-white font-semibold">
                    {(totalAssists / gamesPlayed).toFixed(2)}
                  </span>
                </div>
              )}
              {(totalGoals + totalAssists) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Torbeteiligungen:</span>
                  <span className="text-white font-semibold">{totalGoals + totalAssists}</span>
                </div>
              )}
            </div>
          </div>

          {/* Value Analysis */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Wertanalyse</h3>
            <div className="bg-slate-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Punkte pro Million:</span>
                <span className="text-white font-semibold">
                  {(player.punkte_avg / (player.kosten / 1000000)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Punkte gesamt:</span>
                <span className="text-white font-semibold">{player.punkte_sum}</span>
              </div>
              {totalMinutes > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Punkte pro Minute:</span>
                  <span className="text-white font-semibold">
                    {(player.punkte_sum / totalMinutes).toFixed(3)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
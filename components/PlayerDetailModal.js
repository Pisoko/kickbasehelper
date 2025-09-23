'use client';

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
          <h2 className="text-xl font-bold text-white">{player.name}</h2>
          <p className="text-slate-300">{player.verein} • {player.position}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-emerald-400">{player.punkte_avg.toFixed(1)}</div>
              <div className="text-sm text-slate-400">Avg Points</div>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">{formatter.format(player.kosten)}</div>
              <div className="text-sm text-slate-400">Cost</div>
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

          {/* Points History Chart */}
          {player.punkte_hist && player.punkte_hist.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Points History (Last 10 Games)</h3>
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-end space-x-1 h-20">
                  {player.punkte_hist.slice(-10).map((points, index) => (
                    <div
                      key={index}
                      className="bg-emerald-500 rounded-t flex-1 min-w-0 relative group"
                      style={{ height: `${Math.max((points / Math.max(...player.punkte_hist)) * 100, 5)}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {points}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>Oldest</span>
                  <span>Recent</span>
                </div>
              </div>
            </div>
          )}

          {/* Value Analysis */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Value Analysis</h3>
            <div className="bg-slate-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Points per Million:</span>
                <span className="text-white font-semibold">
                  {(player.punkte_avg / (player.kosten / 1000000)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Points:</span>
                <span className="text-white font-semibold">{player.punkte_sum}</span>
              </div>
              {totalMinutes > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Points per Minute:</span>
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
'use client';

import PlayerImage from './PlayerImage';
import BundesligaLogo from './BundesligaLogo';
import PlayerStatusTag from './PlayerStatusTag';
import { PlayerMatchHistory } from './PlayerMatchHistory';
import type { Player } from '../lib/types';
import { getFullTeamName } from '../lib/teamMapping';

// German number formatters
const currencyFormatter = new Intl.NumberFormat('de-DE', { 
  style: 'currency', 
  currency: 'EUR', 
  maximumFractionDigits: 0 
});

const numberFormatter = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 0
});

const decimalFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

const preciseDecimalFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// Function to translate positions to German
const translatePosition = (position: string): string => {
  const positionMap: Record<string, string> = {
    'GK': 'TW',
    'DEF': 'ABW', 
    'MID': 'MF',
    'FWD': 'ANG'
  };
  return positionMap[position] || position;
};

interface PlayerDetailModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerDetailModal({ player, isOpen, onClose }: PlayerDetailModalProps) {
  if (!isOpen || !player) return null;

  // Use the correct fields from the API
  const totalMinutes = player.totalMinutesPlayed || player.minutesPlayed || 0;
  
  // Use appearances from API instead of hardcoded value
  const gamesPlayed = player.appearances || player.punkte_hist?.length || 0;
  
  // Calculate total games based on current spieltag (assuming spieltag 4 means 4 total games)
  const totalGames = 4; // This should ideally come from context or props
  
  // Calculate total goals and assists
  const totalGoals = player.goals_hist?.reduce((sum, goals) => sum + goals, 0) || player.goals || 0;
  const totalAssists = player.assists_hist?.reduce((sum, assists) => sum + assists, 0) || player.assists || 0;
  
  // Calculate points per minute with fallback estimation
  let pointsPerMinute = 0;
  let avgMinutesPerGame = 0;
  
  if (totalMinutes > 0) {
    // Use actual minutes data if available
    pointsPerMinute = (player.punkte_sum || 0) / totalMinutes;
    avgMinutesPerGame = gamesPlayed > 0 ? Math.round(totalMinutes / gamesPlayed) : 0;
  } else if (gamesPlayed > 0) {
     // Fallback: estimate based on games played
     // Assume average of 70 minutes per game for field players, 90 for goalkeepers
     avgMinutesPerGame = player.position === 'GK' ? 90 : 70;
     const estimatedTotalMinutes = gamesPlayed * avgMinutesPerGame;
     pointsPerMinute = (player.punkte_sum || 0) / estimatedTotalMinutes;
   }
  
  // Calculate points per million market value
  const pointsPerMillion = player.kosten > 0 ? (player.punkte_avg / (player.kosten / 1000000)) : 0;
  
  // Mock data for cards (would come from API in real app)
  const yellowCards = 0;
  const redCards = 0;
  


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 border-b border-slate-700">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
          
          {/* Season Indicator */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full">
              Saison 2025/26
            </span>
          </div>
          
          {/* Player Header */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mt-8">
            {/* Player Image and Club Logo */}
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <PlayerImage 
                  playerImageUrl={player.playerImageUrl}
                  playerName={`${player.firstName || ''} ${player.name}`.trim()}
                  size="xl"
                />
                
                {/* Injury Status Indicator */}
                {player.isInjured && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">🏥</span>
                  </div>
                )}
              </div>
              
              {/* Club Logo */}
              <BundesligaLogo 
                teamName={player.verein || 'Unknown'} 
                size="lg"
              />
            </div>
            
            {/* Player Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold text-white mb-3">
                {player.firstName || ''} {player.name}
              </h1>
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <div className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg text-base font-semibold">
                  {translatePosition(player.position)}
                </div>
                <div className="text-slate-300 text-sm font-normal">
                  Kickbase ID: <span className="font-medium text-blue-400">{player.id}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-slate-300 text-base font-medium">{getFullTeamName(player.verein)}</p>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm font-normal">Marktwert:</span>
                  <span className="text-xl font-bold text-green-400">{currencyFormatter.format(player.kosten)}</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-slate-400 text-sm font-normal">Status:</span>
                  <PlayerStatusTag status={player.status} isInjured={player.isInjured} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Content */}
        <div className="p-6">
          {/* Main Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Points Stats */}
            <div className="bg-slate-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Punkte</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm font-normal">Gesamtpunkte:</span>
                  <span className="text-white text-base font-medium">{numberFormatter.format(player.punkte_sum || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm font-normal">Durchschnitt:</span>
                  <span className="text-white text-base font-medium">{decimalFormatter.format(player.punkte_avg || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm font-normal">Pro Minute:</span>
                  <span className="text-white text-base font-medium">{preciseDecimalFormatter.format(pointsPerMinute)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm font-normal">Pro Million €:</span>
                  <span className="text-white text-base font-medium">{preciseDecimalFormatter.format(pointsPerMillion)}</span>
                </div>
              </div>
            </div>

            {/* Goals & Assists */}
            <div className="bg-slate-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Tore & Vorlagen</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm font-normal">Tore:</span>
                  <span className="text-white text-base font-medium">{numberFormatter.format(totalGoals)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm font-normal">Vorlagen:</span>
                  <span className="text-white text-base font-medium">{numberFormatter.format(totalAssists)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm font-normal">Torbeteiligungen:</span>
                  <span className="text-white text-base font-medium">{numberFormatter.format(totalGoals + totalAssists)}</span>
                </div>
              </div>
            </div>

            {/* Playing Time */}
            <div className="bg-slate-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Einsatzzeiten</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm font-normal">Einsätze:</span>
                  <span className="text-white text-base font-medium">{numberFormatter.format(gamesPlayed)} von {numberFormatter.format(totalGames)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm font-normal">Ø Spielminuten:</span>
                  <span className="text-white text-base font-medium">{numberFormatter.format(avgMinutesPerGame)}'</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm font-normal">Gesamt:</span>
                  <span className="text-white text-base font-medium">{numberFormatter.format(totalMinutes)}'</span>
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="bg-slate-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Karten</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm font-normal">Gelbe Karten:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-6 bg-yellow-500 rounded-sm"></div>
                    <span className="text-white text-base font-medium">{numberFormatter.format(player.yellowCards || 0)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm font-normal">Rote Karten:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-6 bg-red-500 rounded-sm"></div>
                    <span className="text-white text-base font-medium">{numberFormatter.format(player.redCards || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Match History */}
            <div className="col-span-full">
              <PlayerMatchHistory 
                playerId={player.id} 
                playerName={player.name}
                currentTeam={player.verein}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
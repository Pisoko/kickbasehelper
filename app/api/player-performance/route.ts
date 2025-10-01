import { NextRequest, NextResponse } from 'next/server';
import { KickbaseAdapter } from '../../../lib/adapters/KickbaseAdapter';
import { getTeamByKickbaseId } from '../../../lib/teamMapping';
import { kickbaseDataCache } from '../../../lib/services/KickbaseDataCacheService';
import fs from 'fs/promises';
import path from 'path';

const kickbaseAdapter = new KickbaseAdapter(
  process.env.KICKBASE_BASE || 'https://api.kickbase.com',
  process.env.KICKBASE_KEY || ''
);

async function getCurrentMatchday(): Promise<number> {
  try {
    const matchdayStatePath = path.join(process.cwd(), 'data', 'matchday-state.json');
    const data = await fs.readFile(matchdayStatePath, 'utf-8');
    const matchdayState = JSON.parse(data);
    return matchdayState.currentMatchday || 5; // Fallback auf Spieltag 5
  } catch (error) {
    console.error('Fehler beim Lesen des aktuellen Spieltags:', error);
    return 5; // Fallback auf Spieltag 5
  }
}

const getTeamName = (teamId: string | number): string => {
  const teamInfo = getTeamByKickbaseId(teamId);
  return teamInfo?.fullName || `Team ${teamId}`;
};

// Typdefinitionen
interface MatchPerformance {
  matchday: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  playerMinutes: number;
  playerPoints: number;
  matchDate: string;
  playerTeam: string;
}

interface PlayerPerformanceData {
  playerId: string;
  matches: MatchPerformance[];
  totalPoints: number;
  totalMinutes: number;
  averagePoints: number;
  actualAppearances: number;
  start11Count: number;
  currentMatchday: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Debug: Log environment variables
    console.log('Environment variables check:');
    console.log('KICKBASE_KEY:', process.env.KICKBASE_KEY ? 'SET' : 'NOT SET');
    console.log('KICKBASE_API_KEY:', process.env.KICKBASE_API_KEY ? 'SET' : 'NOT SET');
    console.log('KICKBASE_BASE:', process.env.KICKBASE_BASE ? 'SET' : 'NOT SET');

    console.log(`Fetching performance data for player ${playerId}`);
    
    // Aktuellen Spieltag abrufen
    const currentMatchday = await getCurrentMatchday();
    
    // Versuche zuerst verarbeitete Daten aus Cache zu holen
    let cachedResult = await kickbaseDataCache.getCachedPlayerPerformance(playerId);
    
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }
    
    // Wenn nicht im Cache, rohe Daten von API holen
    const performanceData = await kickbaseAdapter.getPlayerPerformance(playerId);
    
    // Wenn wir Daten haben, verarbeite sie
    if (performanceData) {
      console.log('Kickbase API data received:', Object.keys(performanceData));
      
      // Direkter Ansatz zur Verarbeitung der Kickbase-Daten
      if (performanceData.it && Array.isArray(performanceData.it)) {
        console.log('Verarbeite echte Kickbase-Daten...');
        
        const result: PlayerPerformanceData = {
          playerId,
          matches: [],
          totalPoints: 0,
          totalMinutes: 0,
          averagePoints: 0,
          actualAppearances: 0,
          start11Count: 0,
          currentMatchday
        };
        
        // Durchlaufe alle Saisons in der 'it' Array
        for (const season of performanceData.it) {
          // Jede Saison hat ein eigenes 'it' Array mit Spielen
          if (season.it && Array.isArray(season.it)) {
            console.log(`Gefundene Spiele: ${season.it.length}`);
            
            for (const match of season.it) {
              // Extrahiere Spieldaten
              const matchday = match.day || 0;
              const playerMinutes = match.ap || 0;
              const playerPoints = match.tp || 0;
              
              // Team-IDs und Namen
              const homeTeamId = match.t1 || '';
              const awayTeamId = match.t2 || '';
              const homeTeam = getTeamName(homeTeamId);
              const awayTeam = getTeamName(awayTeamId);
              
              // Spielobjekt erstellen
              const matchObj: MatchPerformance = {
                matchday,
                homeTeam,
                awayTeam,
                homeScore: 0, // Nicht in den Performance-Daten enthalten
                awayScore: 0, // Nicht in den Performance-Daten enthalten
                playerMinutes,
                playerPoints,
                matchDate: match.md || new Date().toISOString(),
                playerTeam: match.st === 1 ? homeTeam : awayTeam // st=1 bedeutet Heimteam
              };
              
              // Zum Ergebnis hinzufügen
              result.matches.push(matchObj);
              
              // Gesamtwerte aktualisieren
              result.totalPoints += playerPoints;
              result.totalMinutes += playerMinutes;
              
              if (playerMinutes > 0) {
                result.actualAppearances++;
              }
              
              if (playerMinutes > 48) {
                result.start11Count++;
              }
            }
          }
        }
        
        // Durchschnitt berechnen
        if (result.actualAppearances > 0) {
          result.averagePoints = Math.round(result.totalPoints / result.actualAppearances);
        }
        
        // Sortiere Spiele nach Spieltag
        result.matches.sort((a, b) => a.matchday - b.matchday);
        
        // Begrenze auf aktuellen Spieltag
        result.matches = result.matches.filter(match => match.matchday <= currentMatchday);
        
        console.log(`Verarbeitete Spiele: ${result.matches.length}`);
        
        // Prüfe, ob tatsächlich Spiele gefunden wurden
        if (result.matches.length > 0) {
          // Cache die verarbeiteten Daten
          await kickbaseDataCache.cachePlayerPerformance(playerId, result);
          return NextResponse.json(result);
        }
      }
    }
    
    // Keine Livedaten verfügbar - Fehlermeldung zurückgeben
    console.log('Keine Livedaten für Spieler verfügbar');
    return NextResponse.json(
      { 
        error: 'Keine Leistungsdaten verfügbar', 
        message: 'Für diesen Spieler sind aktuell keine Leistungsdaten in der Kickbase API verfügbar.',
        playerId,
        currentMatchday
      }, 
      { status: 404 }
    );
    
  } catch (error) {
    console.error('Error fetching player performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player performance' },
      { status: 500 }
    );
  }
}
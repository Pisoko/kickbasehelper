import GLPK from 'glpk.js';

import { FORMATIONS, ARENA_BUDGET } from './constants';
import type { Formation, OptimizationResult, PlayerProjection, Player } from './types';

/**
 * Prüft ob ein Spieler für die Arena verfügbar ist (nicht verletzt/gesperrt)
 */
function isPlayerEligibleForArena(player: Player): boolean {
  // Status-Code prüfen
  const statusCode = typeof player.status === 'string' ? parseInt(player.status) : (player.status || 0);
  
  // Verletzte/gesperrte Spieler ausschließen
  const isInjured = player.isInjured || [1, 8, 16].includes(statusCode);
  
  return !isInjured;
}

/**
 * Filtert Spieler nach Arena-Eligibilität (Fitness + Blacklist)
 */
function filterEligiblePlayers(players: Player[], blacklist: Set<string>): Player[] {
  return players.filter(player => {
    // Blacklist-Check
    if (blacklist.has(player.id)) return false;
    
    // Fitness-Check
    return isPlayerEligibleForArena(player);
  });
}

interface OptimizeOptions {
  formation: Formation;
  budget: number;
  blacklist: Set<string>;
}

export async function optimizeForFormation(
  projections: PlayerProjection[],
  formation: Formation,
  options: OptimizeOptions
): Promise<OptimizationResult | null> {
  const glpk = await GLPK();
  const players = projections.filter((p) => !options.blacklist.has(p.id));
  const formationConstraints = FORMATIONS[formation];
  
  // Berechne Normalisierungsfaktoren für Multi-Objective Optimierung
  const maxPoints = Math.max(...players.map(p => p.p_pred));
  const maxCost = Math.max(...players.map(p => p.kosten));
  
  // Gewichtung: 90% Punkte, 10% Budget-Ausnutzung
  const pointWeight = 0.9;
  const budgetWeight = 0.1;
  
  const rows: Parameters<typeof glpk.solve>[0]['subjectTo'] = [
    {
      name: 'exact11',
      vars: players.map((p, idx) => ({ name: `x_${idx}`, coef: 1 })),
      bnds: { type: glpk.GLP_FX, ub: 11, lb: 11 }
    },
    {
      name: 'budget',
      vars: players.map((p, idx) => ({ name: `x_${idx}`, coef: p.kosten })),
      bnds: { type: glpk.GLP_UP, ub: options.budget, lb: 0 }
    },
    {
      name: 'gk',
      vars: players
        .map((p, idx) => (p.position === 'GK' ? { name: `x_${idx}`, coef: 1 } : null))
        .filter(Boolean) as { name: string; coef: number }[],
      bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
    },
    {
      name: 'def',
      vars: players
        .map((p, idx) => (p.position === 'DEF' ? { name: `x_${idx}`, coef: 1 } : null))
        .filter(Boolean) as { name: string; coef: number }[],
      bnds: { type: glpk.GLP_FX, lb: formationConstraints.DEF, ub: formationConstraints.DEF }
    },
    {
      name: 'mid',
      vars: players
        .map((p, idx) => (p.position === 'MID' ? { name: `x_${idx}`, coef: 1 } : null))
        .filter(Boolean) as { name: string; coef: number }[],
      bnds: { type: glpk.GLP_FX, lb: formationConstraints.MID, ub: formationConstraints.MID }
    },
    {
      name: 'fwd',
      vars: players
        .map((p, idx) => (p.position === 'FWD' ? { name: `x_${idx}`, coef: 1 } : null))
        .filter(Boolean) as { name: string; coef: number }[],
      bnds: { type: glpk.GLP_FX, lb: formationConstraints.FWD, ub: formationConstraints.FWD }
    }
  ];

  const cols = players.map((p, idx) => ({
    name: `x_${idx}`,
    // Multi-Objective: Maximiere Punkte UND Budget-Ausnutzung
    obj: (pointWeight * p.p_pred / maxPoints) + (budgetWeight * p.kosten / maxCost)
  }));

  const result = glpk.solve({
    name: `opt_${formation}`,
    objective: {
      direction: glpk.GLP_MAX,
      name: 'objective',
      // Multi-Objective Zielfunktion: Punkte + Budget-Ausnutzung
      vars: players.map((p, idx) => ({ 
        name: `x_${idx}`, 
        coef: (pointWeight * p.p_pred / maxPoints) + (budgetWeight * p.kosten / maxCost)
      }))
    },
    subjectTo: rows,
    binaries: cols.map((col) => col.name)
  });

  // Überprüfe ob result und result.result existieren
  if (!result || !result.result || !result.result.status) {
    console.warn('GLPK result is invalid, using greedy fallback');
    return greedyFallback(players, formation, options.budget, options.blacklist);
  }

  if (result.result.status !== glpk.GLP_OPT && result.result.status !== glpk.GLP_FEAS) {
    console.warn(`GLPK optimization failed with status: ${result.result.status}, using greedy fallback`);
    return greedyFallback(players, formation, options.budget, options.blacklist);
  }

  const lineup: OptimizationResult['lineup'] = [];
  let costSum = 0;
  let objective = 0;
  
  // Überprüfe ob vars existiert
  if (!result.result.vars) {
    console.warn('GLPK result.vars is missing, using greedy fallback');
    return greedyFallback(players, formation, options.budget, options.blacklist);
  }
  
  players.forEach((player, idx) => {
    const value = result.result.vars[`x_${idx}`];
    if (value === 1) {
      lineup.push({
        playerId: player.id,
        name: player.name,
        position: player.position,
        verein: player.verein,
        kosten: player.kosten,
        p_pred: player.p_pred,
        value: player.value,
        playerImageUrl: player.playerImageUrl
      });
      costSum += player.kosten;
      objective += player.p_pred;
    }
  });

  if (lineup.length !== 11) {
    return greedyFallback(players, formation, options.budget, options.blacklist);
  }

  return {
    formation,
    lineup,
    objective,
    restbudget: options.budget - costSum
  };
}

function greedyFallback(players: PlayerProjection[], formation: Formation, budget: number, blacklist: Set<string>): OptimizationResult | null {
  const formationConstraints = FORMATIONS[formation];
  const grouped: Record<string, PlayerProjection[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: []
  };
  
  // Filter out blacklisted players
  const eligiblePlayers = players.filter(player => !blacklist.has(player.id));
  
  for (const player of eligiblePlayers) {
    grouped[player.position].push(player);
  }
  
  // Sortiere nach Value-Score (Punkte pro Euro) für bessere Budget-Ausnutzung
  Object.values(grouped).forEach((arr) => arr.sort((a, b) => b.value - a.value));
  
  const counts: Record<string, number> = {
    GK: 1,
    DEF: formationConstraints.DEF,
    MID: formationConstraints.MID,
    FWD: formationConstraints.FWD
  };
  
  // Budget-optimierte Greedy-Auswahl
  const lineup: OptimizationResult['lineup'] = [];
  let costSum = 0;
  let objective = 0;
  
  // Erste Runde: Wähle beste verfügbare Spieler pro Position
  const selectedByPosition: Record<string, PlayerProjection[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: []
  };
  
  for (const pos of Object.keys(grouped) as (keyof typeof grouped)[]) {
    const need = counts[pos];
    const available = grouped[pos].filter(p => costSum + p.kosten <= budget);
    
    // Wähle die besten verfügbaren Spieler für diese Position
    let selected = 0;
    for (const player of available) {
      if (selected < need && costSum + player.kosten <= budget) {
        selectedByPosition[pos].push(player);
        costSum += player.kosten;
        objective += player.p_pred;
        selected++;
      }
    }
    
    // Falls nicht genug Spieler gefunden, versuche günstigere Optionen
    if (selected < need) {
      const remaining = grouped[pos].filter(p => 
        !selectedByPosition[pos].includes(p) && costSum + p.kosten <= budget
      );
      remaining.sort((a, b) => a.kosten - b.kosten); // Sortiere nach Kosten aufsteigend
      
      for (const player of remaining) {
        if (selected < need && costSum + player.kosten <= budget) {
          selectedByPosition[pos].push(player);
          costSum += player.kosten;
          objective += player.p_pred;
          selected++;
        }
      }
    }
  }
  
  // Überprüfe ob alle Positionen besetzt sind
  const totalSelected = Object.values(selectedByPosition).reduce((sum, arr) => sum + arr.length, 0);
  if (totalSelected !== 11) {
    return null;
  }
  
  // Versuche Budget-Optimierung: Ersetze Spieler durch teurere/bessere wenn möglich
  let improved = true;
  while (improved && costSum < budget * 0.95) { // Nutze mindestens 95% des Budgets
    improved = false;
    
    for (const pos of Object.keys(selectedByPosition) as (keyof typeof selectedByPosition)[]) {
      for (let i = 0; i < selectedByPosition[pos].length; i++) {
        const currentPlayer = selectedByPosition[pos][i];
        const availableUpgrades = grouped[pos].filter(p => 
          !selectedByPosition[pos].includes(p) && 
          p.p_pred > currentPlayer.p_pred &&
          costSum - currentPlayer.kosten + p.kosten <= budget
        );
        
        if (availableUpgrades.length > 0) {
          // Wähle das beste Upgrade das ins Budget passt
          const bestUpgrade = availableUpgrades.reduce((best, current) => 
            current.p_pred > best.p_pred ? current : best
          );
          
          // Ersetze Spieler
          costSum = costSum - currentPlayer.kosten + bestUpgrade.kosten;
          objective = objective - currentPlayer.p_pred + bestUpgrade.p_pred;
          selectedByPosition[pos][i] = bestUpgrade;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }
  
  // Erstelle finale Aufstellung
  for (const pos of Object.keys(selectedByPosition) as (keyof typeof selectedByPosition)[]) {
    selectedByPosition[pos].forEach((player) => {
      lineup.push({
        playerId: player.id,
        name: player.name,
        position: player.position,
        verein: player.verein,
        kosten: player.kosten,
        p_pred: player.p_pred,
        value: player.value,
        playerImageUrl: player.playerImageUrl
      });
    });
  }
  
  if (lineup.length !== 11 || costSum > budget) {
    return null;
  }
  
  return {
    formation,
    lineup,
    objective,
    restbudget: budget - costSum
  };
}

export async function optimizeAuto(
  players: Player[],
  projections: PlayerProjection[],
  budget: number,
  blacklist: string[],
  manualFormation?: Formation
): Promise<OptimizationResult | null> {
  const blacklistSet = new Set(blacklist);
  const projectionMap = new Map(projections.map((p) => [p.id, p]));
  const relevant = players
    .map((player) => projectionMap.get(player.id))
    .filter((p): p is PlayerProjection => Boolean(p));

  const formations = manualFormation ? [manualFormation] : (Object.keys(FORMATIONS) as Formation[]);
  let best: OptimizationResult | null = null;
  const formationResults: Array<{ formation: Formation; objective: number; restbudget: number }> = [];
  
  console.log(`🔍 Vergleiche ${formations.length} Formationen für optimale Aufstellung...`);
  
  for (const formation of formations) {
    const res = await optimizeForFormation(relevant, formation, {
      formation,
      budget,
      blacklist: blacklistSet
    });
    
    if (res) {
      formationResults.push({
        formation: res.formation,
        objective: res.objective,
        restbudget: res.restbudget
      });
      
      console.log(`📊 Formation ${formation}: ${res.objective.toFixed(2)} Punkte (Restbudget: ${(res.restbudget / 1000000).toFixed(1)}M €)`);
      
      if (!best || res.objective > best.objective) {
        best = res;
      }
    } else {
      console.log(`❌ Formation ${formation}: Keine gültige Lösung gefunden`);
    }
  }
  
  // Sort results by objective (highest first)
  formationResults.sort((a, b) => b.objective - a.objective);
  
  if (best) {
    console.log(`🏆 Beste Formation: ${best.formation} mit ${best.objective.toFixed(2)} erwarteten Punkten`);
    console.log(`📈 Top 3 Formationen:`);
    formationResults.slice(0, 3).forEach((result, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      console.log(`   ${medal} ${result.formation}: ${result.objective.toFixed(2)} Punkte`);
    });
  }
  
  return best;
}

/**
 * Arena-spezifische Optimierung mit festem Budget von 150M €
 * Filtert automatisch verletzte Spieler und Blacklist aus
 */
export async function optimizeArena(
  players: Player[],
  projections: PlayerProjection[],
  blacklist: string[],
  manualFormation?: Formation
): Promise<OptimizationResult | null> {
  const blacklistSet = new Set(blacklist);
  
  // Filtere nur verfügbare Spieler (nicht verletzt/gesperrt, nicht auf Blacklist)
  const eligiblePlayers = filterEligiblePlayers(players, blacklistSet);
  
  console.log(`🏟️ Arena-Optimierung: Vergleiche alle Formationen für beste Aufstellung...`);
  
  // Verwende die gefilterten Spieler für die Optimierung - immer alle Formationen vergleichen
  return optimizeAuto(eligiblePlayers, projections, ARENA_BUDGET, [], undefined);
}

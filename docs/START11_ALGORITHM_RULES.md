# Start11-Optimierungsalgorithmus für Kickbase Arena Modus

## Übersicht
Dieser Algorithmus generiert die optimale Start11 für den Kickbase Arena Modus unter Berücksichtigung verschiedener Constraints und Optimierungsziele.

## Grundlegende Regeln

### 1. Budget-Constraint
- **Maximales Budget**: 150.000.000 € (150 Millionen Euro)
- **Harte Grenze**: Die Gesamtkosten aller 11 Spieler dürfen das Budget nicht überschreiten
- **Optimierung**: Maximiere die erwarteten Punkte unter Einhaltung des Budgets

### 2. Mannschaftsaufstellung
- **Anzahl Spieler**: Exakt 11 Spieler müssen ausgewählt werden
- **Positionsverteilung**: Abhängig von der gewählten Formation
  - 1 Torwart (GK) - immer erforderlich
  - Variable Anzahl Verteidiger (DEF)
  - Variable Anzahl Mittelfeldspieler (MID) 
  - Variable Anzahl Stürmer (FWD)

### 3. Verfügbare Formationen
```
Formation    | DEF | MID | FWD | Beschreibung
-------------|-----|-----|-----|-------------
4-4-2        |  4  |  4  |  2  | Ausgewogen, defensiv stabil
4-2-4        |  4  |  2  |  4  | Offensiv, risikoreich
3-4-3        |  3  |  4  |  3  | Ausgewogen, flexibel
4-3-3        |  4  |  3  |  3  | Klassisch, vielseitig
5-3-2        |  5  |  3  |  2  | Sehr defensiv
3-5-2        |  3  |  5  |  2  | Mittelfeld-dominiert
5-4-1        |  5  |  4  |  1  | Ultra-defensiv
4-5-1        |  4  |  5  |  1  | Defensiv, Mittelfeld-stark
3-6-1        |  3  |  6  |  1  | Mittelfeld-überladung
5-2-3        |  5  |  2  |  3  | Defensiv mit Konter
```

### 4. Spieler-Eligibilität

#### 4.1 Fitness-Filter (Ausschlusskriterien)
Folgende Spieler werden **automatisch ausgeschlossen**:

**Verletzte Spieler (Status-Codes):**
- Status 1: Verletzt 🤕
- Status 8: Glatt Rot 🟥  
- Status 16: Gelb-Rote Karte 🟨🟥

**Bedingt verfügbare Spieler:**
- Status 2: Angeschlagen ⚠️ (verfügbar, aber mit reduzierter Wahrscheinlichkeit)
- Status 4: Aufbautraining 🏃 (verfügbar, aber mit reduzierter Wahrscheinlichkeit)

**Fitte Spieler:**
- Status 0: Fit ✅ (vollständig verfügbar)

#### 4.2 Blacklist-Filter
- Alle Spieler auf der Benutzer-Blacklist werden ausgeschlossen
- Blacklist wird über `playerExclusion.ts` verwaltet
- Persistente Speicherung in localStorage

#### 4.3 Verfügbarkeits-Check
```typescript
function isPlayerEligible(player: Player): boolean {
  // Blacklist-Check
  if (isPlayerExcluded(player.id)) return false;
  
  // Fitness-Check
  const statusCode = typeof player.status === 'string' ? parseInt(player.status) : (player.status || 0);
  const isInjured = player.isInjured || [1, 8, 16].includes(statusCode);
  
  return !isInjured; // Nur nicht-verletzte Spieler sind verfügbar
}
```

## Optimierungsalgorithmus

### 1. Primärer Algorithmus: Linear Programming (GLPK)
- **Zielfunktion**: Maximiere Σ(Spieler.p_pred) - Summe der erwarteten Punkte
- **Solver**: GLPK.js (GNU Linear Programming Kit)
- **Variablen**: Binäre Entscheidungsvariablen (0/1) für jeden Spieler

#### Constraints:
```
1. Exakt 11 Spieler: Σ(x_i) = 11
2. Budget-Limit: Σ(x_i * kosten_i) ≤ 150.000.000
3. Torwart: Σ(x_i | position_i = GK) = 1
4. Verteidiger: Σ(x_i | position_i = DEF) = formation.DEF
5. Mittelfeld: Σ(x_i | position_i = MID) = formation.MID  
6. Stürmer: Σ(x_i | position_i = FWD) = formation.FWD
```

### 2. Fallback-Algorithmus: Greedy Heuristik
Falls Linear Programming fehlschlägt:
- Sortiere Spieler nach Value-Score (p_pred/kosten) absteigend
- Wähle beste verfügbare Spieler pro Position
- Respektiere Budget und Formationsanforderungen

### 3. Multi-Formation Optimierung
```typescript
async function optimizeAuto(): Promise<OptimizationResult | null> {
  let bestResult = null;
  
  for (const formation of FORMATIONS) {
    const result = await optimizeForFormation(players, formation, options);
    if (result && (!bestResult || result.objective > bestResult.objective)) {
      bestResult = result;
    }
  }
  
  return bestResult;
}
```

## Punkteberechnung (p_pred)

### Projektions-Parameter
```typescript
interface ProjectionParams {
  baseMode: 'avg' | 'sum' | 'last3';  // Basis-Berechnungsmodus
  w_base: number;      // Gewichtung Basis-Punkte (1.0)
  w_form: number;      // Gewichtung Form-Bonus (0.35)
  w_odds: number;      // Gewichtung Wett-Odds (0.35)
  w_home: number;      // Gewichtung Heimvorteil (0.1)
  w_minutes: number;   // Gewichtung Spielzeit (0.2)
  w_risk: number;      // Gewichtung Risiko-Faktor (0.15)
}
```

### Berechnung
```
p_pred = (w_base * base_points) + 
         (w_form * form_boost) + 
         (w_odds * odds_modifier) + 
         (w_home * home_bonus) + 
         (w_minutes * minutes_weight) - 
         (w_risk * risk_penalty)
```

## Implementierungsdetails

### Bestehende Infrastruktur
- ✅ **Optimierungslogik**: `lib/optimization.ts` (GLPK + Greedy Fallback)
- ✅ **Formationen**: `lib/constants.ts` (10 verschiedene Formationen)
- ✅ **Spielerstatus**: `components/PlayerStatusTag.tsx` (Status-Codes 0-16)
- ✅ **Blacklist**: `lib/playerExclusion.ts` (localStorage-basiert)
- ✅ **Projektionen**: `lib/projection.ts` (Erwartete Punkte)

### Erforderliche Anpassungen

#### 1. Budget-Update (150M €)
```typescript
// Aktuell: Flexibles Budget
// Neu: Festes Arena-Budget
const ARENA_BUDGET = 150_000_000; // 150 Millionen Euro
```

#### 2. Fitness-Filter Integration
```typescript
function filterEligiblePlayers(players: Player[]): Player[] {
  return players.filter(player => {
    // Blacklist-Filter (bereits implementiert)
    if (isPlayerExcluded(player.id)) return false;
    
    // Fitness-Filter (neu)
    const statusCode = typeof player.status === 'string' ? parseInt(player.status) : (player.status || 0);
    const isInjured = player.isInjured || [1, 8, 16].includes(statusCode);
    
    return !isInjured;
  });
}
```

#### 3. UI-Integration
- Button "Optimale Start11 generieren" im Dashboard
- Anzeige der optimalen Formation mit Spielerdetails
- Visualisierung der Aufstellung (Fußballfeld-Layout)
- Budget-Anzeige und Restbudget

## Konfigurierbare Parameter

### Anpassbare Regeln
```typescript
interface ArenaOptimizationConfig {
  budget: number;                    // Standard: 150.000.000
  allowAngeschlagen: boolean;        // Standard: true (Status 2 erlaubt)
  allowAufbautraining: boolean;      // Standard: true (Status 4 erlaubt)
  preferredFormations: Formation[];  // Standard: alle Formationen
  riskTolerance: number;            // Standard: 0.15 (konservativ)
  projectionParams: ProjectionParams;
}
```

### Erweiterte Optimierungsoptionen
- **Formation-Lock**: Bestimmte Formation erzwingen
- **Spieler-Lock**: Bestimmte Spieler erzwingen/ausschließen
- **Team-Diversität**: Maximale Spieler pro Verein
- **Risiko-Profil**: Konservativ vs. Risikoreich

## Validierung & Testing

### Test-Szenarien
1. **Budget-Compliance**: Alle Lösungen ≤ 150M €
2. **Formation-Compliance**: Korrekte Positionsverteilung
3. **Fitness-Compliance**: Keine verletzten Spieler
4. **Blacklist-Compliance**: Keine ausgeschlossenen Spieler
5. **Optimality**: Beste verfügbare Punktzahl

### Performance-Metriken
- **Lösungszeit**: < 5 Sekunden für Standard-Optimierung
- **Speicherverbrauch**: < 100MB für alle Berechnungen
- **Erfolgsrate**: > 95% erfolgreiche Optimierungen

## Zukünftige Erweiterungen

### Geplante Features
- **Live-Optimierung**: Berücksichtigung aktueller Spielstände
- **Multi-Objective**: Punkte vs. Risiko vs. Budget-Effizienz
- **Machine Learning**: Verbesserte Punkteprognosen
- **Team-Chemistry**: Vereins-/Nationalmannschafts-Boni
- **Verletzungsrisiko**: Probabilistische Verfügbarkeit

### API-Integration
- **Live-Daten**: Aktuelle Verletzungen und Sperren
- **Wetter-Daten**: Einfluss auf Spielerleistung
- **Gegner-Analyse**: Schwierigkeitsgrad der Gegner
# Kickbase Player Information Mapping

Diese Tabelle zeigt die Bedeutung aller Felder in der Kickbase API für Spielerdaten.

## Grundlegende Spielerinformationen

| Feld | Typ | Beschreibung | Beispiel (Jonathan Tah) |
|------|-----|--------------|-------------------------|
| `i` | string | Spieler-ID (eindeutige Identifikation) | "173" |
| `fn` | string | Vorname | "Jonathan" |
| `ln` | string | Nachname | "Tah" |
| `shn` | number | Trikotnummer | 4 |
| `oui` | string | Externe Spieler-ID (vermutlich von Datenquelle) | "2151182" |

## Team-Informationen

| Feld | Typ | Beschreibung | Beispiel (Jonathan Tah) |
|------|-----|--------------|-------------------------|
| `tid` | string | Team-ID | "2" |
| `tn` | string | Teamname | "Bayern" |
| `tim` | string | Team-Logo Pfad | "content/file/ff70df040a9f4179a7b45219225a2273.svg" |

## Position & Status

| Feld | Typ | Beschreibung | Beispiel (Jonathan Tah) |
|------|-----|--------------|-------------------------|
| `pos` | number | Position (1=TW, 2=ABW, 3=MF, 4=ANG) | 2 (Abwehr) |
| `iposl` | boolean | Position gesperrt? | false |
| `st` | number | Status-Code (0=Fit, andere=Verletzt/Gesperrt) | 0 |
| `stl` | array | Status-Liste (Details zu Verletzungen/Sperren) | [] |
| `stxt` | string | Status-Text | "Fit" |

## Punkte & Performance

| Feld | Typ | Beschreibung | Beispiel (Jonathan Tah) |
|------|-----|--------------|-------------------------|
| `tp` | number | Gesamtpunkte (Total Points) | 4202 |
| `ap` | number | Durchschnittspunkte (Average Points) | 127 |
| `ph` | array | Punkte-Historie der letzten Spiele | [{"hp": true, "p": 110}, ...] |
| `ph[].hp` | boolean | Hat gespielt (Has Played) | true |
| `ph[].p` | number | Punkte in diesem Spiel | 110 |

## Spielzeit & Statistiken

| Feld | Typ | Beschreibung | Beispiel (Jonathan Tah) |
|------|-----|--------------|-------------------------|
| `sec` | number | Gespielte Sekunden (total) | 195125 |
| `g` | number | Tore | 3 |
| `a` | number | Assists | 0 |
| `r` | number | Rote Karten | 0 |
| `y` | number | Gelbe Karten | 3 |

## Marktwert

| Feld | Typ | Beschreibung | Beispiel (Jonathan Tah) |
|------|-----|--------------|-------------------------|
| `mv` | number | Aktueller Marktwert (in Cent) | 43918271 (439.18€) |
| `tfhmvt` | number | Marktwert-Änderung seit letztem Update | -46359 (-0.46€) |
| `mvt` | number | Marktwert-Trend (1=steigend, 2=fallend, 0=stabil) | 2 (fallend) |

## Spieltag-Informationen

| Feld | Typ | Beschreibung | Beispiel (Jonathan Tah) |
|------|-----|--------------|-------------------------|
| `day` | number | Aktueller Spieltag | 34 |
| `mdsum` | array | Match-Day Summary (kommende/vergangene Spiele) | [...] |

### Match-Day Summary Details (`mdsum[]`)

| Feld | Typ | Beschreibung | Beispiel |
|------|-----|--------------|----------|
| `t1` | string | Team 1 ID | "43" |
| `t2` | string | Team 2 ID | "2" |
| `t1g` | number | Tore Team 1 | 3 |
| `t2g` | number | Tore Team 2 | 3 |
| `day` | number | Spieltag | 32 |
| `md` | string | Match-Datum (ISO) | "2025-05-03T13:30:00Z" |
| `cur` | boolean | Aktuelles Spiel? | false |
| `mdst` | number | Match-Status (1=geplant, 2=beendet) | 2 |
| `t1im` | string | Team 1 Logo | "content/file/..." |
| `t2im` | string | Team 2 Logo | "content/file/..." |

## Zusätzliche Metriken

| Feld | Typ | Beschreibung | Beispiel (Jonathan Tah) |
|------|-----|--------------|-------------------------|
| `stud` | number | Studien-Wert (unbekannte Metrik) | 215 |
| `smc` | number | Saison Match Count (Spiele diese Saison) | 33 |
| `ismc` | number | International Season Match Count | 33 |
| `smdc` | number | Season Match Day Count | 1 |
| `sl` | boolean | Squad List / Kader-Status (nicht Startelf!) | true |

## Medien & Bilder

| Feld | Typ | Beschreibung | Beispiel (Jonathan Tah) |
|------|-----|--------------|-------------------------|
| `pim` | string | Spieler-Bild Pfad | "content/file/48622993193e45f09d696908d75ed523.png" |
| `ua` | string | Unbekanntes Asset | "content/file/d3bc1ffd77f84f0f8a9e1b166671c8ff.png" |
| `plpt` | string | Player Platform Type | "Ligainsider" |
| `plpurl` | string | Player Platform URL | "content/file/..." |
| `plpim` | string | Player Platform Image | "content/file/..." |

## Zeitstempel

| Feld | Typ | Beschreibung | Beispiel (Jonathan Tah) |
|------|-----|--------------|-------------------------|
| `dt` | string | Daten-Timestamp (ISO) | "2025-01-17T14:30:06Z" |
| `ts` | string | Letztes Update (ISO) | "2025-08-21T11:40:02Z" |

## Sonstige

| Feld | Typ | Beschreibung | Beispiel (Jonathan Tah) |
|------|-----|--------------|-------------------------|
| `opl` | array | Andere Positionen (Other Positions List) | [] |

## Wichtige Umrechnungen

- **Marktwert**: Wert in Cent → durch 100 teilen für Euro
- **Spielzeit**: Sekunden → durch 60 teilen für Minuten
- **Position**: 1=TW, 2=ABW, 3=MF, 4=ANG
- **Status**: 0=Fit, andere Werte=Probleme
- **Trend**: 1=steigend, 2=fallend, 0=stabil

## Startelf-Prognose

**Wichtig**: Das `sl` Feld ist NICHT für Startelf-Prognosen geeignet! Es zeigt nur den Kader-Status an.

Für echte Startelf-Prognosen sollten folgende Felder verwendet werden:

### Relevante Felder für Startelf-Wahrscheinlichkeit

| Feld | Gewichtung | Beschreibung |
|------|------------|--------------|
| `sec` | 40% | Durchschnittliche Spielzeit pro Spiel (Sekunden ÷ `smc`) |
| `smc` vs `smdc` | 30% | Regelmäßigkeit der Einsätze (Spiele ÷ verfügbare Spieltage) |
| `ph` (recent) | 20% | Einsätze in den letzten 3-5 Spielen |
| `st` | 10% | Fitness-Status (0 = fit, andere = verletzt/gesperrt) |

### Algorithmus für Startelf-Wahrscheinlichkeit

```typescript
function berechneStartelfWahrscheinlichkeit(player: any): number {
  // Basis: Spieler muss fit sein
  if (player.st !== 0) return 0;
  
  // Durchschnittliche Spielzeit pro Spiel (in Minuten)
  const avgMinutesPerGame = player.smc > 0 ? (player.sec / 60) / player.smc : 0;
  const spielzeitScore = Math.min(avgMinutesPerGame / 90, 1); // Max 90 Min = 100%
  
  // Regelmäßigkeit der Einsätze
  const einsatzRate = player.smc / Math.max(player.smdc, 1);
  const regelmäßigkeitScore = Math.min(einsatzRate, 1);
  
  // Letzte Spiele analysieren (falls ph verfügbar)
  let recentFormScore = 0.5; // Default
  if (player.ph && player.ph.length > 0) {
    const lastGames = player.ph.slice(-5); // Letzte 5 Spiele
    const playedGames = lastGames.filter(game => game.hp).length;
    recentFormScore = playedGames / lastGames.length;
  }
  
  // Gewichtete Berechnung
  const wahrscheinlichkeit = 
    (spielzeitScore * 0.4) +
    (regelmäßigkeitScore * 0.3) +
    (recentFormScore * 0.2) +
    (1.0 * 0.1); // Fitness-Bonus (bereits geprüft)
  
  return Math.round(wahrscheinlichkeit * 100); // Prozent
}
```

### Beispiel: Kevin Kampl Analyse

```typescript
// Kevin Kampl Daten (hypothetisch)
const kampl = {
  sl: true,        // ❌ Irrelevant für Startelf!
  sec: 1800,       // 30 Min Durchschnitt
  smc: 20,         // 20 Spiele gespielt
  smdc: 25,        // 25 Spieltage verfügbar
  st: 0,           // Fit
  ph: [            // Letzte 5 Spiele
    {hp: false}, {hp: true}, {hp: false}, {hp: true}, {hp: false}
  ]
};

// Berechnung:
// - Spielzeit: (1800/60)/20 = 1.5 Min/Spiel → sehr niedrig
// - Regelmäßigkeit: 20/25 = 80%
// - Recent Form: 2/5 = 40% der letzten Spiele
// → Startelf-Wahrscheinlichkeit: ~15% (trotz sl: true!)
```

## Beispiel-Mapping für unsere App

```typescript
const transformKickbasePlayer = (kickbaseData: any): Player => {
  return {
    id: kickbaseData.i,
    name: `${kickbaseData.fn} ${kickbaseData.ln}`,
    position: mapPosition(kickbaseData.pos), // 2 → 'DEF'
    verein: kickbaseData.tn,
    kosten: kickbaseData.mv / 100, // Cent zu Euro
    punkte_sum: kickbaseData.tp,
    punkte_avg: kickbaseData.ap,
    punkte_hist: kickbaseData.ph.map(p => p.p),
    goals: kickbaseData.g,
    assists: kickbaseData.a,
    yellowCards: kickbaseData.y,
    redCards: kickbaseData.r,
    minutesPlayed: Math.round(kickbaseData.sec / 60),
    isInjured: kickbaseData.st !== 0,
    status: kickbaseData.stxt,
    // Startelf-Prognose basierend auf echten Daten
    startelfWahrscheinlichkeit: berechneStartelfWahrscheinlichkeit(kickbaseData),
    // Zusätzliche Metriken für Analyse
    squadStatus: kickbaseData.sl, // Kader-Status (nicht Startelf!)
    saisonSpiele: kickbaseData.smc,
    verfügbareSpiele: kickbaseData.smdc,
    durchschnittlicheSpielzeit: kickbaseData.smc > 0 ? Math.round((kickbaseData.sec / 60) / kickbaseData.smc) : 0
  };
};

// Hilfsfunktion für Startelf-Wahrscheinlichkeit
function berechneStartelfWahrscheinlichkeit(player: any): number {
  if (player.st !== 0) return 0; // Verletzt/Gesperrt
  
  const avgMinutesPerGame = player.smc > 0 ? (player.sec / 60) / player.smc : 0;
  const spielzeitScore = Math.min(avgMinutesPerGame / 90, 1);
  const einsatzRate = player.smc / Math.max(player.smdc, 1);
  const regelmäßigkeitScore = Math.min(einsatzRate, 1);
  
  let recentFormScore = 0.5;
  if (player.ph && player.ph.length > 0) {
    const lastGames = player.ph.slice(-5);
    const playedGames = lastGames.filter(game => game.hp).length;
    recentFormScore = playedGames / lastGames.length;
  }
  
  const wahrscheinlichkeit = 
    (spielzeitScore * 0.4) +
    (regelmäßigkeitScore * 0.3) +
    (recentFormScore * 0.2) +
    (1.0 * 0.1);
  
  return Math.round(wahrscheinlichkeit * 100);
}
```
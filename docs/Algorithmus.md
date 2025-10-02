# Algorithmus zur Bestimmung der optimalen Startelf

Dieses Dokument beschreibt den in der Webapplikation verwendeten Algorithmus
zur Auswahl der besten Elf Bundesliga-Spieler unter Berücksichtigung von Budget,
X-Wert und Formation. Implementiert wurde die **Variante B (DP mit Budget-Diskretisierung)**.

---

## Problemstellung

- **Input:**
  - `Players`: Liste von Spielern `{id, name, pos ∈ {TW, ABW, MF, ANG}, price, x}`
  - `Formations`: Menge möglicher Formationen, z. B.
    - `4-4-2`: {TW:1, ABW:4, MF:4, ANG:2}
    - `3-4-3`: {TW:1, ABW:3, MF:4, ANG:3}
    - ...
  - `Budget`: Gesamtbudget (z. B. 150.000.000)

- **Constraints:**
  - Exakt 11 Spieler
  - Budget darf nicht überschritten werden
  - Formation gibt Anzahl je Position (TW, ABW, MF, ANG) vor

- **Ziel:**
  - Maximierung der Summe aller X-Werte der gewählten 11 Spieler

---

## Lösung: DP mit Budget-Diskretisierung (Variante B)

Da ein MILP-Solver nicht immer verfügbar ist, wird eine dynamische Programmierung mit Budgetdiskretisierung eingesetzt.

### Grundidee

1. Diskretisiere das Budget in Schritte (`STEP`), z. B. 100.000 €.
2. Für jede Positionsgruppe (TW, ABW, MF, ANG) berechne eine **Pareto-Front**:
   - Zu jedem Kostenbucket: bestmöglicher X-Wert mit **genau** der geforderten Anzahl Spieler (k).
3. Kombiniere die Fronten der Positionen entsprechend der Formation.
4. Wähle die Lösung mit maximalem X-Wert innerhalb des Budgets.

---

## Schritt 1: Budget-Parameter

```text
STEP = 100000           // Granularität (feiner = genauer, aber langsamer)
C    = floor(BUDGET / STEP)   // Anzahl Kosten-Buckets
```

---

## Schritt 2: DP pro Positionsgruppe (Frontier bauen)

```pseudocode
function buildFrontier(players, k, STEP, C):
    // DP[c] = (score, set) = bestes X bei Kostenbucket c mit ≤ k Spielern
    DP ← array length C+1 filled with (-∞, ∅)
    DP[0] ← (0, ∅)

    for p in players:
        cp ← floor(p.price / STEP)
        vp ← p.x
        DPnew ← copy(DP)
        for c from (C - cp) down to 0:
            (score, chosen) ← DP[c]
            if chosen is ∅ and c ≠ 0: continue  // ungültig
            if chosen ≠ ∅ and |chosen| ≥ k: continue
            nc ← c + cp
            nscore ← score + vp
            if nc ≤ C and nscore > DPnew[nc].score and (|chosen| + 1) ≤ k:
                DPnew[nc] ← (nscore, chosen ∪ {p.id})
        DP ← DPnew

    // Filter: genau k Spieler
    FRONT ← array length C+1 filled with (-∞, ∅)
    for c in 0..C:
        if DP[c].set ≠ ∅ and |DP[c].set| == k:
            FRONT[c] ← DP[c]

    // Monotone Pareto-Front: pro Kostenbucket den besten Score halten
    bestSoFar ← -∞
    for c in 0..C:
        if FRONT[c].score < bestSoFar:
            FRONT[c] ← (bestSoFar, ∅)   // dominiert
        else:
            bestSoFar ← FRONT[c].score

    return FRONT
```

**Hinweis:** Für TW ist `k = 1`, für ABW/MF/ANG jeweils gemäß Formation.

---

## Schritt 3: Fronten kombinieren (Faltung)

```pseudocode
function combineFrontiers(fronts, C):
    // fronts: Liste von Fronten in Reihenfolge [TW, ABW, MF, ANG]
    // cur: Liste von Tripeln (score, sets[], costBucket)
    cur ← [(0, [∅], 0)]

    for F in fronts:
        nxt ← map costBucket → (score, sets[])
        for (scoreA, setsA, costA) in cur:
            for c in 0..C:
                (scoreB, setB) ← F[c]
                if scoreB == -∞ or setB == ∅:
                    continue
                totalC ← costA + c
                if totalC > C:
                    continue
                cand ← (scoreA + scoreB, setsA + [setB])
                if cand.score > nxt[totalC].score:
                    nxt[totalC] ← cand
        cur ← [(score, sets, cc) for (cc, (score, sets)) in nxt]

    // bestes innerhalb Budget
    best ← argmax over cur by score
    return best  // (score, setsTuple, costBucket)
```

---

## Schritt 4: Hauptfunktion

```pseudocode
function solveDP(players, formations, BUDGET, STEP):
    C ← floor(BUDGET / STEP)
    groups ← {
        "TW":  filter players where pos == "TW",
        "ABW": filter players where pos == "ABW",
        "MF":  filter players where pos == "MF",
        "ANG": filter players where pos == "ANG"
    }

    bestSolution ← null

    for (fname, req) in formations:
        FRONT_TW  ← buildFrontier(groups["TW"],  req.TW,  STEP, C)   // req.TW = 1
        FRONT_ABW ← buildFrontier(groups["ABW"], req.ABW, STEP, C)
        FRONT_MF  ← buildFrontier(groups["MF"],  req.MF,  STEP, C)
        FRONT_ANG ← buildFrontier(groups["ANG"], req.ANG, STEP, C)

        (score, setsTuple, cc) ← combineFrontiers([FRONT_TW, FRONT_ABW, FRONT_MF, FRONT_ANG], C)
        if score == -∞:
            continue

        chosenIds ← union(setsTuple[0], setsTuple[1], setsTuple[2], setsTuple[3])
        totalPrice ← sum(players[i].price for i in chosenIds)
        if totalPrice ≤ BUDGET and (bestSolution == null or score > bestSolution.totalX):
            bestSolution ← { formation: fname, totalX: score, totalPrice: totalPrice, players: chosenIds }

    return bestSolution
```

---

## Eigenschaften & Tuning

- **Komplexität:** ca. O(n_pos · C) pro Positionsgruppe; praktikabel für ~200 Spieler bei STEP ∈ [100k, 500k].
- **Exaktheit:** Näherung, aber in der Praxis sehr nah an optimal. Kleinere `STEP` erhöhen Genauigkeit.
- **Determinismus:** Ties können über sekundäre Kriterien gebrochen werden (z. B. geringerer Preis, Spieler-ID).
- **Erweiterungen:**
  - *max N Spieler pro Verein*: beim `buildFrontier` Set-Status um Vereinszähler erweitern oder Pre-Filter/Cap.
  - *Sperrliste/Whitelist*: Spieler vorab entfernen/erzwingen.
  - *Mindest-X je Position*: Buckets < Schwelle auf (-∞, ∅) setzen.
  - *Bench (12.–15. Spieler)*: weiteren DP-Layer nur für Reserve berechnen.

---

## Ein-/Ausgabeformate (JSON-Beispiel)

**Input**
```json
{
  "budget": 150000000,
  "formations": {
    "4-4-2": {"TW":1, "ABW":4, "MF":4, "ANG":2},
    "3-4-3": {"TW":1, "ABW":3, "MF":4, "ANG":3}
  },
  "players": [
    {"id":"p001","name":"Kane","pos":"ANG","price":62700000,"x":642.1}
  ]
}
```

**Output**
```json
{
  "formation": "3-4-3",
  "totalX": 3052.2,
  "totalPrice": 149400000,
  "players": ["p001", "p042", "..."]
}
```

---

## Praxis-Hinweise

- Wähle `STEP` so, dass `C = Budget/STEP` im niedrigen Tausenderbereich bleibt.
- Validierung: Prüfe nach dem Kombinieren nochmals **exakt** die Summe der Preise gegen `Budget` (nicht nur Bucket).
- Logging/Debug: Speichere pro Formation die Top-N Lösungen, um Sensitivitäten (Preis/X) zu analysieren.

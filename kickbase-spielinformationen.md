# Kickbase Spielinformationen - Vollständige Feldübersicht

Diese Dokumentation bietet eine umfassende Übersicht über alle verfügbaren Spiel-Informationen (Matches) aus der Kickbase API. Die Daten stammen aus verschiedenen API-Endpunkten und enthalten sowohl grundlegende Spiel-Daten als auch detaillierte Event-Informationen und Live-Daten.

## Übersicht der API-Endpunkte

### 1. Spieltage (Matchdays)
**Endpunkt:** `GET /v4/competitions/{competitionId}/matchdays`
- Enthält alle Spiele organisiert nach Spieltagen mit Ergebnissen und Terminen

### 2. Spieler-Center (mit Match-Informationen)
**Endpunkt:** `GET /v4/competitions/{competitionId}/playercenter/{playerId}`
- Detaillierte Spiel-Informationen aus Spieler-Sicht mit Events

### 3. Liga-Tabelle (mit Match-Referenzen)
**Endpunkt:** `GET /v4/competitions/{competitionId}/table`
- Team-Statistiken mit Referenzen zu aktuellen Spielen

### 4. Live-Event-Types
**Endpunkt:** `GET /v4/live/eventtypes`
- Definitionen aller verfügbaren Spiel-Events und deren Beschreibungen

## Kategorisierte Feldübersicht

### 1. Grundlegende Spiel-Informationen

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `mi` | string | Match-ID (eindeutige Kennung) | "8310" |
| `day` | integer | Spieltag-Nummer | 1 |
| `dt` | string | Spiel-Datum und -Zeit (ISO 8601) | "2025-08-22T18:30:00Z" |
| `mtd` | string | Spiel-Dauer in Minuten | "90" |
| `st` | integer | Spiel-Status | 2 |
| `il` | boolean | Ist Live (aktuell laufend) | false |

### 2. Team-Informationen

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `t1` | string | Team 1 ID (Heimteam) | "2" |
| `t2` | string | Team 2 ID (Auswärtsteam) | "43" |
| `t1sy` | string | Team 1 Kürzel/Symbol | "FCB" |
| `t2sy` | string | Team 2 Kürzel/Symbol | "RBL" |
| `t1im` | string | Team 1 Logo-Pfad | "content/file/ff70df040a9f4179a7b45219225a2273.svg" |
| `t2im` | string | Team 2 Logo-Pfad | "content/file/29ceb88867954b548ca9e27d39d050c2.svg" |

### 3. Spiel-Ergebnisse

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `t1g` | integer | Tore Team 1 (Heimteam) | 6 |
| `t2g` | integer | Tore Team 2 (Auswärtsteam) | 0 |

### 4. Spieler-spezifische Match-Daten

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `i` | string | Spieler-ID | "10112" |
| `tid` | string | Team-ID des Spielers | "9" |
| `n` | string | Spieler-Name | "Jaquez" |
| `mt` | integer | Spielzeit des Spielers in Minuten | 95 |
| `mst` | integer | Match-Status für den Spieler | 2 |
| `md` | string | Match-Datum (ISO 8601) | "2025-09-19T18:30:00Z" |
| `k` | array[integer] | Karten des Spielers | [] |
| `pim` | string | Spieler-Bild-Pfad | "content/file/2dea6714f704489fa0fb302accce4e8a.png" |

### 5. Spiel-Events (`events` Array)

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `ei` | string | Event-ID | "15749204" |
| `eti` | integer | Event-Type-ID (negativ für Abzüge) | -12 |
| `p` | integer | Punkte für das Event | 0 |
| `ke` | integer | Key-Event-ID | 13 |
| `mt` | integer | Minute des Events im Spiel | 95 |

### 6. Live-Event-Types (Verfügbare Events)

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `lcud` | string | Letztes Update der Event-Types (ISO 8601) | "2025-08-01T19:14:53Z" |
| `it.i` | integer | Event-Type-ID | 45 |
| `it.ti` | string | Event-Type-Titel/Beschreibung | "Cross" |

### 7. Event-Beschreibungen (`dds` Object)

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `1` | string | Assist-Beschreibung | "Assist by {assistBy}" |
| `2` | string | Forced-Event-Beschreibung | "Forced by {forcedBy}" |
| `3` | string | Tor-Beschreibung | "Goal by {goalBy}" |
| `4` | string | Standard-Beschreibung | "-" |
| `5` | string | Sperre-Beschreibung | "Suspended for next match day" |
| `6` | string | Sperre-Beschreibung | "Suspended for next match day" |
| `7` | string | Verpasst-Beschreibung | "Missed by {missedBy}" |
| `20` | string | Verpasst-Beschreibung | "Missed by {missedBy}" |
| `100` | string | Standard-Beschreibung | "-" |

### 8. Liga-Tabellen-Referenzen

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `mi` | string | Referenz zur aktuellen Match-ID | "8354" |
| `cp` | integer | Aktuelle Liga-Punkte | 12 |
| `mc` | integer | Anzahl gespielter Spiele | 4 |
| `gd` | integer | Tordifferenz | 15 |
| `sp` | integer | Kickbase-Fantasy-Punkte | 9110 |

## Status-Codes und Bedeutungen

### Spiel-Status (`st`, `mst`)
- `1`: Geplant/Angesetzt
- `2`: Beendet
- `3`: Live/Laufend
- `4`: Pausiert
- `5`: Abgesagt/Verschoben

### Key-Event-IDs (`ke`)
Basierend auf den Live-Event-Types:
- `1-10`: Grundlegende Aktionen (Pässe, Flanken, etc.)
- `11-13`: Spezielle Events (Ein-/Auswechslungen, etc.)
- `45-100`: Erweiterte Aktionen (Cross, Forward zone pass, etc.)

### Event-Type-IDs (`eti`)
- **Positive Werte**: Punkte-bringende Events
- **Negative Werte**: Punkte-Abzüge oder neutrale Events
- Entsprechen den IDs aus den Live-Event-Types

### Karten (`k` Array)
- `4`: Gelbe Karte
- `8`: Rote Karte  
- `9`: Gelb-Rote Karte

## Wichtige Event-Types (Auswahl)

### Offensive Events
- `45`: Cross (Flanke)
- `46`: Forward zone pass (Vorwärtspass)
- `49`: Accurate long Ball (Präziser langer Ball)
- `50`: Deadly Pass (Tödlicher Pass)
- `87`: Penalty scored (Elfmeter verwandelt)
- `96`: Big Chance Created (Große Chance kreiert)

### Defensive Events
- `47`: Accurate Keeper-Sweeper (GK) (Präziser Torwart-Ausflug)
- `48`: Accurate Throw (GK) (Präziser Abwurf)
- `52`: Aerial lost (Kopfballduell verloren)
- `79`: Aerial won (Kopfballduell gewonnen)

### Negative Events
- `88-90`: Penalty missed (Elfmeter verschossen)
- `91-93`: Post/Pfosten (verschiedene Varianten)
- `94`: Back Pass Foul (GK) (Rückpass-Foul)

### Spezielle Events
- `80-81`: Rebound Assist (Abpraller-Vorlage)
- `82`: Own Goal forced (Eigentor erzwungen)
- `83`: Deflected Assist (Abgefälschte Vorlage)
- `84`: Woodwork Assist (Pfosten-Vorlage)
- `86`: Bonus: long range (Bonus für Fernschuss)

## Zeitformate und Datenstrukturen

### Zeitstempel
- Alle Zeitangaben verwenden das **ISO 8601 Format** (UTC)
- `dt`: Spiel-Anstoßzeit
- `md`: Match-Datum (kann abweichen bei Verschiebungen)
- `lcud`: Letztes Update der Event-Definitionen

### Spielzeit
- `mtd`: Reguläre Spielzeit als String ("90")
- `mt`: Tatsächliche Spielzeit inklusive Nachspielzeit (95)

### Arrays und Objekte
- `events`: Array mit chronologischen Spiel-Events
- `k`: Array mit Karten-IDs
- `it`: Array mit Items (Spiele, Events, etc.)

## API-Konsistenz und Besonderheiten

### Match-ID Konsistenz
- Match-IDs sind eindeutig über alle Endpunkte hinweg
- Referenzen zwischen Spieler-Daten und Match-Daten über `mi`

### Team-Referenzen
- Team-IDs sind konsistent zwischen Spielen und Team-Profilen
- Team-Logos als SVG-Dateien verfügbar

### Event-System
- Umfassendes Event-System mit über 100 verschiedenen Event-Types
- Negative Event-Type-IDs für Punkt-Abzüge
- Dynamische Event-Beschreibungen mit Platzhaltern

### Live-Daten
- `il`-Flag zeigt Live-Status an
- Live-Events werden in Echtzeit aktualisiert
- Event-Types werden regelmäßig erweitert

## Zusammenfassung

Die Kickbase API bietet umfassende Spiel-Informationen über **4 Haupt-Endpunkte**:
- **Matchdays**: Vollständige Spieltag-Übersicht mit allen Begegnungen
- **Playercenter**: Detaillierte Spiel-Daten aus Spieler-Perspektive
- **Table**: Liga-Statistiken mit Match-Referenzen
- **Live-EventTypes**: Event-Definitionen und -Beschreibungen

Insgesamt wurden **über 40 verschiedene Spiel-Felder** identifiziert, die in **8 Hauptkategorien** unterteilt sind:
1. Grundlegende Spiel-Informationen
2. Team-Informationen  
3. Spiel-Ergebnisse
4. Spieler-spezifische Match-Daten
5. Spiel-Events
6. Live-Event-Types
7. Event-Beschreibungen
8. Liga-Tabellen-Referenzen

Die API bietet sowohl statische Spiel-Daten als auch Live-Events und ermöglicht eine umfassende Analyse aller Bundesliga-Spiele der aktuellen Saison mit **über 100 verschiedenen Event-Types** für detaillierte Spiel-Statistiken.
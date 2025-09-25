# Kickbase Teaminformationen - Vollständige Feldübersicht

Diese Dokumentation bietet eine umfassende Übersicht über alle verfügbaren Team-Informationen aus der Kickbase API. Die Daten stammen aus verschiedenen API-Endpunkten und enthalten sowohl grundlegende Team-Daten als auch detaillierte Statistiken und Spielerinformationen.

## Übersicht der API-Endpunkte

### 1. Team-Center (Competitions)
**Endpunkt:** `GET /v4/competitions/{competitionId}/teams/{teamId}/teamcenter`
- Enthält aktuelle Team-Informationen mit Spielerliste und letztem Spiel

### 2. Team-Profil (Competitions & Leagues)
**Endpunkt:** `GET /v4/competitions/{competitionId}/teams/{teamId}/teamprofile`
**Endpunkt:** `GET /v4/leagues/{leagueId}/teams/{teamId}/teamprofile`
- Detaillierte Team-Informationen mit vollständiger Spielerliste und Marktwerten

### 3. Liga-Tabelle
**Endpunkt:** `GET /v4/competitions/{competitionId}/table`
- Team-Statistiken in der Liga-Tabelle

### 4. Mein Team (TeamCenter)
**Endpunkt:** `GET /v4/leagues/{leagueId}/teamcenter/myeleven`
- Informationen über das eigene Team in einer Liga

## Kategorisierte Feldübersicht

### 1. Grundlegende Team-Informationen

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `tid` | string | Team-ID (eindeutige Kennung) | "10" |
| `tn` | string | Team-Name (Kurzform) | "Bremen" |
| `tim` | string | Team-Logo/Bild-Pfad | "content/file/a7e609e72fb04c6d8c96e8ed82f0315d.svg" |

### 2. Team-Statistiken (Liga-Tabelle)

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `cp` | integer | Aktuelle Punkte in der Liga | 12 |
| `cpl` | integer | Aktuelle Tabellenposition | 1 |
| `pcpl` | integer | Vorherige Tabellenposition | 1 |
| `mc` | integer | Anzahl gespielter Spiele | 4 |
| `gd` | integer | Tordifferenz | 15 |
| `sp` | integer | Gesamtpunkte (Kickbase-Punkte) | 9110 |
| `il` | boolean | Ist Live (aktuell im Spiel) | false |
| `mi` | string | Match-ID des letzten/aktuellen Spiels | "8354" |

### 3. Team-Profil Statistiken

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `pl` | integer | Anzahl Spieler im Team | 14 |
| `tv` | integer | Gesamtmarktwert des Teams (in Cent) | 182687379 |
| `tw` | integer | Team-Siege | 1 |
| `td` | integer | Team-Unentschieden | 1 |
| `tl` | integer | Team-Niederlagen | 2 |
| `npt` | integer | Anzahl Spieler insgesamt | 27 |
| `avpcl` | boolean | Verfügbar für Preisverleihung | true |

### 4. Letztes Spiel (Match-Informationen)

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `ma.mi` | string | Match-ID | "8341" |
| `ma.t1` | string | Team 1 ID (Heimteam) | "10" |
| `ma.t2` | string | Team 2 ID (Auswärtsteam) | "5" |
| `ma.t1g` | integer | Tore Team 1 | 0 |
| `ma.t2g` | integer | Tore Team 2 | 3 |
| `ma.mtd` | string | Spielzeit in Minuten | "90" |
| `ma.st` | integer | Spiel-Status | 2 |
| `ma.il` | boolean | Ist Live | false |
| `ma.dt` | string | Spiel-Datum und -Zeit (ISO 8601) | "2025-09-20T13:30:00Z" |
| `ma.t1im` | string | Team 1 Logo-Pfad | "content/file/a7e609e72fb04c6d8c96e8ed82f0315d.svg" |
| `ma.t2im` | string | Team 2 Logo-Pfad | "content/file/6c1a9f14b668493283f966834891aa70.svg" |

### 5. Spielerliste im Team (`it` Array)

#### Team-Center Spieler-Felder:
| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `i` | string | Spieler-ID | "624" |
| `n` | string | Spieler-Name | "Bittencourt" |
| `k` | array[integer] | Karten (gelb/rot) | [8] |
| `mdst` | integer | Matchday-Status | 3 |
| `p` | integer | Punkte | 0 |
| `pim` | string | Spieler-Bild-Pfad | "content/file/1a88a39549924d048294f618079e8437.png" |

#### Team-Profil Spieler-Felder:
| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `i` | string | Spieler-ID | "43" |
| `n` | string | Spieler-Name | "Weiser" |
| `lst` | integer | Liga-Status | 1 |
| `st` | integer | Spieler-Status | 1 |
| `pos` | integer | Position (1=TW, 2=ABW, 3=MF, 4=ST) | 2 |
| `mv` | integer | Marktwert (in Cent) | 1236378 |
| `mvt` | integer | Marktwert-Trend (1=steigend, 2=fallend) | 2 |
| `ap` | integer | Durchschnittspunkte | 9 |
| `iotm` | boolean | Ist "In of the Match" | false |
| `ofc` | integer | Anzahl Fouls | 0 |
| `tid` | string | Team-ID | "10" |
| `sdmvt` | integer | Saisonale Marktwert-Veränderung | -800019 |
| `mvgl` | integer | Marktwert-Gewinn/Verlust | 0 |
| `pim` | string | Spieler-Bild-Pfad | "content/file/1a88a39549924d048294f618079e8437.png" |

### 6. Team-Bilder und URLs

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `tim` | string | Team-Logo (SVG) | "content/file/a7e609e72fb04c6d8c96e8ed82f0315d.svg" |
| `pclpurl` | string | Preisverleihungs-Logo-URL | "content/file/cbef71ca14734a34a86afa99e9fcc47f.png" |
| `plpurl` | string | Spieler-Logo-URL | "content/file/ef187fece16544febb50bd330706fd7d.png" |
| `plpim` | string | Spieler-Logo-Bild | "content/file/fed50cda064c4dd48ebc4f06eb9f2df2.png" |

### 7. Zeitstempel

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `ts` | string | Zeitstempel der letzten Aktualisierung (ISO 8601) | "2025-09-23T11:18:15Z" |

### 8. Mein Team Spezifische Felder

| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `lp` | array | Liste der Spieler im eigenen Team | siehe Spieler-Felder |
| `p` | integer | Gesamtpunkte des Teams | 261 |
| `pa` | boolean | Punkte verfügbar | true |
| `lpc` | integer | Liga-Punkte-Counter | 0 |
| `clpc` | integer | Challenge-Liga-Punkte-Counter | 0 |

#### Mein Team Spieler-Felder (`lp` Array):
| Feld | Datentyp | Beschreibung | Beispiel |
|------|----------|--------------|----------|
| `i` | string | Spieler-ID | "75" |
| `n` | string | Spieler-Name | "Drewes" |
| `tid` | string | Team-ID | "3" |
| `pos` | integer | Position | 1 |
| `p` | integer | Punkte | 91 |
| `mi` | string | Match-ID | "8343" |
| `st` | integer | Status | 4 |
| `mt` | integer | Spielzeit in Minuten | 95 |
| `md` | string | Match-Datum (ISO 8601) | "2025-09-21T17:30:00Z" |
| `mst` | integer | Match-Status | 2 |
| `k` | array[integer] | Karten | [] |
| `mtd` | string | Match-Dauer | "90" |
| `pim` | string | Spieler-Bild-Pfad | "content/file/ed209b2ca67c4784a658521f80baa795.png" |

## Status-Codes und Bedeutungen

### Spiel-Status (`st`, `mst`)
- `1`: Geplant
- `2`: Beendet
- `3`: Live
- `4`: Pausiert
- `5`: Abgesagt

### Spieler-Status (`st`, `mdst`)
- `0`: Nicht im Kader
- `1`: Im Kader
- `2`: Startelf
- `3`: Eingewechselt
- `4`: Ausgewechselt
- `5`: Auf der Bank

### Marktwert-Trend (`mvt`)
- `1`: Steigend
- `2`: Fallend
- `3`: Stabil (angenommen)

### Positionen (`pos`)
- `1`: Torwart (TW)
- `2`: Abwehr (ABW)
- `3`: Mittelfeld (MF)
- `4`: Sturm (ST)

### Karten (`k` Array)
- `4`: Gelbe Karte
- `8`: Rote Karte
- `9`: Gelb-Rote Karte

## Wichtige Erkenntnisse

### Marktwerte
- Alle Marktwerte werden in **Cent** gespeichert (z.B. 1236378 = 12.363,78 €)
- `sdmvt` zeigt die saisonale Veränderung des Marktwerts

### Team-Logos
- Team-Logos werden als **SVG-Dateien** bereitgestellt
- Pfade sind relativ zur Kickbase CDN-Basis-URL

### Zeitformate
- Alle Zeitstempel verwenden das **ISO 8601 Format** (UTC)
- Spielzeiten werden als String in Minuten angegeben

### Team-Statistiken
- `sp` (Gesamtpunkte) bezieht sich auf Kickbase-Fantasy-Punkte, nicht Liga-Punkte
- `cp` sind die tatsächlichen Liga-Punkte (3 für Sieg, 1 für Unentschieden)

### API-Konsistenz
- Team-Profile sind in beiden APIs (Competitions & Leagues) identisch strukturiert
- Team-Center bietet eine kompaktere Ansicht mit aktuellen Spiel-Informationen

## Zusammenfassung

Die Kickbase API bietet umfassende Team-Informationen über **4 Haupt-Endpunkte**:
- **Team-Center**: Aktuelle Team-Übersicht mit letztem Spiel
- **Team-Profil**: Detaillierte Team- und Spielerinformationen
- **Liga-Tabelle**: Team-Statistiken und Tabellenposition
- **Mein Team**: Persönliche Team-Verwaltung

Insgesamt wurden **über 50 verschiedene Team-Felder** identifiziert, die in **8 Hauptkategorien** unterteilt sind:
1. Grundlegende Team-Informationen
2. Team-Statistiken
3. Team-Profil Statistiken
4. Match-Informationen
5. Spielerlisten
6. Team-Bilder und URLs
7. Zeitstempel
8. Persönliche Team-Daten

Die API bietet sowohl aktuelle als auch historische Daten und ermöglicht eine umfassende Analyse der Bundesliga-Teams und ihrer Spieler.
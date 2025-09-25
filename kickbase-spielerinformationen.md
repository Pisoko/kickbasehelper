# Kickbase Spielerinformationen - Vollständige Feldübersicht

## Übersicht

Diese Dokumentation beschreibt alle verfügbaren Spielerinformationen, die über die Kickbase API abgerufen werden können. Die Daten stammen aus verschiedenen API-Endpunkten und bieten umfassende Informationen über Spieler, ihre Performance, Marktwerte und Statistiken.

## Hauptkategorien der Spielerinformationen

### 1. Grundlegende Spielerinformationen
### 2. Performance und Statistiken
### 3. Marktwert und Finanzen
### 4. Team und Liga Informationen
### 5. Bilder und Medien
### 6. Zeitstempel und Metadaten

---

## Detaillierte Feldübersicht

### 1. Grundlegende Spielerinformationen

| Feldname | Datentyp | Beispiel | Bedeutung |
|----------|----------|----------|-----------|
| `i` | string | "10112" | **Spieler-ID** - Eindeutige Identifikation des Spielers |
| `fn` | string | "Luca" | **Vorname** - Vorname des Spielers |
| `ln` | string | "Jaquez" | **Nachname** - Nachname des Spielers |
| `n` | string | "Jaquez" | **Name** - Kurzform des Spielernamens (meist Nachname) |
| `shn` | integer | 14 | **Trikotnummer** - Rückennummer des Spielers |
| `pos` | integer | 2 | **Position** - Spielerposition (1=Torwart, 2=Verteidiger, 3=Mittelfeld, 4=Angriff) |
| `iposl` | boolean | false | **Position gesperrt** - Ob die Position des Spielers gesperrt ist |

### 2. Team und Liga Informationen

| Feldname | Datentyp | Beispiel | Bedeutung |
|----------|----------|----------|-----------|
| `tid` | string | "9" | **Team-ID** - Eindeutige Identifikation des Teams |
| `tn` | string | "Stuttgart" | **Teamname** - Name des aktuellen Teams |
| `oui` | string | "0" | **Owner User ID** - ID des Besitzers in der Liga |
| `day` | integer | 4 | **Spieltag** - Aktueller Spieltag |

### 3. Performance und Statistiken

| Feldname | Datentyp | Beispiel | Bedeutung |
|----------|----------|----------|-----------|
| `tp` | integer | 72 | **Gesamtpunkte** - Gesamtpunktzahl des Spielers |
| `ap` | integer | 72 | **Durchschnittspunkte** - Durchschnittliche Punkte pro Spiel |
| `p` | integer | -13 | **Punkte** - Punkte im aktuellen/letzten Spiel |
| `g` | integer | 0 | **Tore** - Anzahl der erzielten Tore |
| `a` | integer | 0 | **Assists** - Anzahl der Torvorlagen |
| `sec` | integer | 5886 | **Spielminuten** - Gespielte Minuten in Sekunden |
| `mp` | string | "0'" | **Spielminuten** - Gespielte Minuten als String |
| `mt` | integer | 99 | **Maximale Spielzeit** - Maximale mögliche Spielzeit |
| `mtd` | string | "90" | **Maximale Spielzeit (Display)** - Maximale Spielzeit als Anzeigestring |
| `mi` | integer | 8340 | **Spielminuten (Integer)** - Gespielte Minuten als Integer |
| `r` | integer | 0 | **Rote Karten** - Anzahl der roten Karten |
| `y` | integer | 0 | **Gelbe Karten** - Anzahl der gelben Karten |
| `st` | integer | 0 | **Status** - Spielerstatus (0=verfügbar, 4=verletzt, 5=gesperrt, etc.) |
| `stl` | array | [] | **Status Liste** - Liste der Statusänderungen |
| `il` | boolean | false | **Verletzt** - Ob der Spieler verletzt ist |

### 4. Marktwert und Finanzen

| Feldname | Datentyp | Beispiel | Bedeutung |
|----------|----------|----------|-----------|
| `mv` | integer | 4607037 | **Marktwert** - Aktueller Marktwert des Spielers |
| `cv` | integer | 4800000 | **Vertragswert** - Vertragswert des Spielers |
| `tfhmvt` | integer | -110435 | **24h Marktwertänderung** - Marktwertänderung in den letzten 24 Stunden |
| `mvt` | integer | 2 | **Marktwert Trend** - Trend der Marktwertentwicklung |
| `prc` | integer | 4607037 | **Preis** - Aktueller Preis für Transfers |

### 5. Spiel- und Matchday-Informationen

| Feldname | Datentyp | Beispiel | Bedeutung |
|----------|----------|----------|-----------|
| `mdsum` | array | [...] | **Matchday Zusammenfassung** - Übersicht der kommenden Spiele |
| `t1` | string/integer | "9" | **Team 1 ID** - ID des ersten Teams im Spiel |
| `t2` | string/integer | "39" | **Team 2 ID** - ID des zweiten Teams im Spiel |
| `t1g` | integer | 2 | **Team 1 Tore** - Tore von Team 1 |
| `t2g` | integer | 0 | **Team 2 Tore** - Tore von Team 2 |
| `md` | string | "2025-09-19T18:30:00Z" | **Matchday Datum** - Datum und Zeit des Spiels |
| `cur` | boolean | true | **Aktuell** - Ob es sich um das aktuelle Spiel handelt |
| `mdst` | integer | 2 | **Matchday Status** - Status des Spieltags |
| `mst` | integer | 2 | **Match Status** - Status des Spiels |
| `pt` | string | "9" | **Spieler Team** - Team-ID des Spielers im Spiel |

### 6. Performance History

| Feldname | Datentyp | Beispiel | Bedeutung |
|----------|----------|----------|-----------|
| `ph` | array | [...] | **Performance History** - Verlauf der Spielerleistung |
| `hp` | boolean | false | **Hat gespielt** - Ob der Spieler in diesem Spiel gespielt hat |
| `asp` | integer | 2761 | **Durchschnittliche Saisonpunkte** - Durchschnittspunkte der Saison |

### 7. Spezielle Markierungen und Status

| Feldname | Datentyp | Beispiel | Bedeutung |
|----------|----------|----------|-----------|
| `stud` | integer | 0 | **Studiert** - Unbekannter Status |
| `smc` | integer | 1 | **Saison Match Count** - Anzahl Spiele in der Saison |
| `ismc` | integer | 1 | **Ist Saison Match Count** - Aktueller Saison Match Count |
| `smdc` | integer | 4 | **Saison Matchday Count** - Anzahl Spieltage in der Saison |
| `sl` | boolean | true | **Saison Liga** - Ob Spieler in der aktuellen Saison spielt |
| `iotm` | boolean | false | **In of the Month** - Ob Spieler "Spieler des Monats" ist |
| `ipl` | boolean | false | **In Player List** - Ob Spieler in der Spielerliste ist |

### 8. Events und Karten

| Feldname | Datentyp | Beispiel | Bedeutung |
|----------|----------|----------|-----------|
| `k` | array | [8] | **Karten** - Liste der Karten (Gelb/Rot) |
| `events` | array | [...] | **Spielereignisse** - Liste aller Ereignisse im Spiel |
| `ei` | string | "15749204" | **Event ID** - Eindeutige ID des Ereignisses |
| `eti` | integer | -12 | **Event Type ID** - Typ des Ereignisses |
| `ke` | integer | 13 | **Karten Event** - Karten-bezogenes Ereignis |

### 9. Bilder und Medien

| Feldname | Datentyp | Beispiel | Bedeutung |
|----------|----------|----------|-----------|
| `pim` | string | "content/file/..." | **Spielerbild** - URL zum Spielerbild |
| `tim` | string | "content/file/..." | **Teambild** - URL zum Teambild |
| `t1im` | string | "content/file/..." | **Team 1 Bild** - URL zum Bild von Team 1 |
| `t2im` | string | "content/file/..." | **Team 2 Bild** - URL zum Bild von Team 2 |
| `ua` | string | "content/file/..." | **User Avatar** - URL zum Benutzeravatar |
| `plpim` | string | "content/file/..." | **Player Profile Image** - URL zum Spielerprofilbild |
| `plpurl` | string | "content/file/..." | **Player Profile URL** - URL zum Spielerprofil |

### 10. Zeitstempel und Metadaten

| Feldname | Datentyp | Beispiel | Bedeutung |
|----------|----------|----------|-----------|
| `dt` | string | "2025-09-24T11:43:05Z" | **Datum/Zeit** - Zeitstempel der letzten Aktualisierung |
| `ts` | string | "2025-09-24T09:46:57Z" | **Timestamp** - Zeitstempel der Erstellung/Änderung |
| `plpt` | string | "Ligainsider" | **Player Profile Type** - Typ des Spielerprofils |

### 11. Listen und Arrays

| Feldname | Datentyp | Beispiel | Bedeutung |
|----------|----------|----------|-----------|
| `opl` | array | [] | **Other Player List** - Liste anderer Spieler |
| `ofs` | array | [] | **Offers** - Liste der Angebote für den Spieler |
| `it` | array | [...] | **Items** - Liste von Elementen (kontextabhängig) |

### 12. Marktwert-Historie

| Feldname | Datentyp | Beispiel | Bedeutung |
|----------|----------|----------|-----------|
| `trp` | number | 0.0 | **Trend Prozent** - Prozentualer Trend der Marktwertentwicklung |
| `prlo` | number | 0.0 | **Preis Low** - Niedrigster Preis im Zeitraum |
| `lmv` | number | 0.0 | **Lowest Market Value** - Niedrigster Marktwert |
| `hmv` | number | 0.0 | **Highest Market Value** - Höchster Marktwert |
| `idp` | boolean | false | **Is Data Present** - Ob Daten vorhanden sind |

---

## API-Endpunkte für Spielerinformationen

### Hauptendpunkte:

1. **Spielerdetails**: `/v4/leagues/{leagueId}/players/{playerId}`
   - Vollständige Spielerinformationen
   - Marktwert, Performance, Team-Zugehörigkeit

2. **Spieler-Performance**: `/v4/leagues/{leagueId}/players/{playerId}/performance`
   - Detaillierte Performance-Historie
   - Spiel-für-Spiel Statistiken

3. **Spieler-Marktwert**: `/v4/leagues/{leagueId}/players/{playerId}/marketvalue/{timeframe}`
   - Marktwertentwicklung über Zeit
   - Trend-Analysen

4. **Spielerliste**: `/v4/competitions/{competitionId}/players`
   - Übersicht aller Spieler
   - Grundlegende Statistiken

5. **Spieler-Center**: `/v4/competitions/{competitionId}/playercenter/{playerId}`
   - Live-Spielinformationen
   - Aktuelle Spiel-Events

---

## Positionscodes

| Code | Position |
|------|----------|
| 1 | Torwart |
| 2 | Verteidiger |
| 3 | Mittelfeld |
| 4 | Angriff |

## Statuscodes

| Code | Status |
|------|--------|
| 0 | Verfügbar |
| 4 | Verletzt |
| 5 | Gesperrt |

## Hinweise zur Nutzung

- Alle Zeitstempel sind im ISO 8601 Format (UTC)
- Marktwerte sind in Cent angegeben (4607037 = 46.070,37 €)
- Spielminuten können sowohl als String ("90'") als auch als Integer (5400 Sekunden) vorliegen
- Bilder sind relative Pfade zur Kickbase CDN
- Arrays können leer sein, wenn keine Daten vorhanden sind

## Saison 2025/2026

Diese Dokumentation basiert auf Daten aus der aktuellen Saison 2025/2026 der deutschen Fußball-Bundesliga.
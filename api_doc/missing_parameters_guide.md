# Kickbase API - Missing Parameters Guide

Diese Liste enthält alle fehlenden Parameter, die Sie in der `seed_values.json` Datei pflegen können, um weitere API-Endpunkte abzurufen.

## 📊 Übersicht der fehlenden Parameter

| Parameter | Anzahl Endpunkte | Beschreibung |
|-----------|------------------|--------------|
| `playerId` | 8 | Eindeutige ID eines Spielers |
| `challengeId` | 12 | Eindeutige ID einer Challenge |
| `userId` | 6 | Eindeutige ID eines Benutzers/Managers |
| `activityId` | 2 | Eindeutige ID einer Aktivität im Feed |
| `matchId` | 2 | Eindeutige ID eines Spiels/Matches |
| `timeframe` | 2 | Zeitraum für Marktwertverlauf |
| `type` | 2 | Typ für Battles oder Achievements |

## 🔍 Detaillierte Parameter-Beschreibungen

### 1. playerId
**Beschreibung:** Eindeutige Spieler-ID aus der Kickbase-Datenbank

**Beispielwerte aus aktuellen Daten:**
- `7226` (Kane)
- `1955` (Burke) 
- `8307` (Sano)
- `3019` (Atubolu)
- `118` (Grifo)
- `10963` (Vušković)
- `9683` (Ilic)
- `11955` (El Khannouss)

**Betroffene Endpunkte:**
- `/v4/competitions/{competitionId}/playercenter/{playerId}`
- `/v4/competitions/{competitionId}/players/{playerId}/marketvalue/{timeframe}`
- `/v4/competitions/{competitionId}/players/{playerId}/performance`
- `/v4/leagues/{leagueId}/players/{playerId}`
- `/v4/leagues/{leagueId}/players/{playerId}/marketvalue/{timeframe}`
- `/v4/leagues/{leagueId}/players/{playerId}/performance`
- `/v4/leagues/{leagueId}/players/{playerId}/transferHistory`
- `/v4/leagues/{leagueId}/players/{playerId}/transfers`

### 2. challengeId
**Beschreibung:** Eindeutige Challenge-ID für Turniere und Wettbewerbe

**Beispielwerte aus aktuellen Daten:**
- `142` (aus Challenge Archive)

**Betroffene Endpunkte:**
- `/v4/challenges/{challengeId}/favorites`
- `/v4/challenges/{challengeId}/favorites/search`
- `/v4/challenges/{challengeId}/lineup/livepitch`
- `/v4/challenges/{challengeId}/lineup/overview`
- `/v4/challenges/{challengeId}/lineup/selection`
- `/v4/challenges/{challengeId}/lineup/teams`
- `/v4/challenges/{challengeId}/performance`
- `/v4/challenges/{challengeId}/profile`
- `/v4/challenges/{challengeId}/ranking`
- `/v4/challenges/{challengeId}/table`
- `/v4/challenges/{challengeId}/table/{userId}`
- `/v4/challenges/{challengeId}/top10`

### 3. userId
**Beschreibung:** Eindeutige Benutzer-ID für Manager und Spieler

**Beispielwerte aus aktuellen Daten:**
- `2151182` (aus User Settings)

**Betroffene Endpunkte:**
- `/v4/challenges/{challengeId}/table/{userId}`
- `/v4/leagues/{leagueId}/managers/{userId}/dashboard`
- `/v4/leagues/{leagueId}/managers/{userId}/performance`
- `/v4/leagues/{leagueId}/managers/{userId}/squad`
- `/v4/leagues/{leagueId}/managers/{userId}/transfer`
- `/v4/leagues/{leagueId}/users/{userId}/teamcenter`

### 4. activityId
**Beschreibung:** Eindeutige ID für Aktivitäten im Liga-Feed

**Betroffene Endpunkte:**
- `/v4/leagues/{leagueId}/activitiesFeed/{activityId}`
- `/v4/leagues/{leagueId}/activitiesFeed/{activityId}/comments`

### 5. matchId
**Beschreibung:** Eindeutige Match-/Spiel-ID

**Betroffene Endpunkte:**
- `/v4/matches/{matchId}/betlink`
- `/v4/matches/{matchId}/details`

### 6. timeframe
**Beschreibung:** Zeitraum für Marktwertverlauf-Abfragen

**Mögliche Werte:**
- `season` (aktuelle Saison)
- `month` (letzter Monat)
- `week` (letzte Woche)
- `all` (gesamter Verlauf)

**Betroffene Endpunkte:**
- `/v4/competitions/{competitionId}/players/{playerId}/marketvalue/{timeframe}`
- `/v4/leagues/{leagueId}/players/{playerId}/marketvalue/{timeframe}`

### 7. type
**Beschreibung:** Typ-Parameter für verschiedene Kategorien

**Mögliche Werte für Battles:**
- `weekly` (wöchentliche Battles)
- `monthly` (monatliche Battles)
- `season` (Saison-Battles)

**Mögliche Werte für Achievements:**
- `transfer` (Transfer-Erfolge)
- `performance` (Leistungs-Erfolge)
- `social` (Soziale Erfolge)

**Betroffene Endpunkte:**
- `/v4/leagues/{leagueId}/battles/{type}/users`
- `/v4/leagues/{leagueId}/user/achievements/{type}`

## 🛠️ Konfiguration in seed_values.json

Um diese Parameter zu nutzen, erweitern Sie Ihre `seed_values.json` Datei:

```json
{
  "userId": ["2151182"],
  "competitionId": ["1"],
  "playerId": ["7226", "1955", "8307", "3019", "118", "10963", "9683", "11955"],
  "challengeId": ["142"],
  "activityId": ["1", "2", "3"],
  "matchId": ["1", "2", "3"],
  "timeframe": ["season", "month", "week", "all"],
  "type": ["weekly", "monthly", "season", "transfer", "performance", "social"]
}
```

## 📈 Empfohlene Vorgehensweise

1. **Starten Sie mit wenigen Werten:** Beginnen Sie mit 1-2 Beispielwerten pro Parameter
2. **Testen Sie schrittweise:** Führen Sie den Harvester aus und prüfen Sie die Ergebnisse
3. **Erweitern Sie graduell:** Fügen Sie weitere Werte hinzu, basierend auf den erhaltenen Daten
4. **Überwachen Sie Rate Limits:** Achten Sie auf API-Limits bei zu vielen gleichzeitigen Anfragen

## ⚠️ Wichtige Hinweise

- Nicht alle Parameter-Kombinationen sind gültig
- Einige Endpunkte erfordern spezielle Berechtigungen
- Rate Limits der API beachten
- Ungültige IDs führen zu 404-Fehlern (werden jetzt korrekt behandelt)

## 🔄 Nach der Konfiguration

Nach dem Hinzufügen der Parameter zur `seed_values.json`:

1. Führen Sie den Harvester erneut aus: `python3 harvest.py`
2. Prüfen Sie die neuen JSON-Dateien im `output/` Verzeichnis
3. Analysieren Sie die `catalog.csv` für neue Datenfelder
4. Erweitern Sie die Parameter basierend auf den neuen Erkenntnissen
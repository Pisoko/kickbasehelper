# 🔧 Kickbase API - Vollständiger Missing Parameters Guide

## 📊 Übersicht

Nach der Analyse von **31 ausstehenden Endpoints** wurden **7 verschiedene Parameter-Typen** identifiert, die für den Zugriff auf weitere API-Endpunkte benötigt werden.

### 🎯 Parameter-Zusammenfassung

| Parameter | Anzahl Endpoints | Status | Beispielwerte verfügbar |
|-----------|------------------|--------|------------------------|
| `playerId` | 8 | ✅ Werte gefunden | Ja |
| `challengeId` | 12 | ✅ Werte gefunden | Ja |
| `userId` | 6 | ✅ Werte gefunden | Ja |
| `matchId` | 2 | ✅ Werte gefunden | Ja |
| `type` | 2 | ✅ Werte gefunden | Ja |
| `timeframe` | 2 | ⚠️ Teilweise gefunden | Ja |
| `activityId` | 2 | ✅ Werte gefunden | Ja |

---

## 🔍 Detaillierte Parameter-Analyse

### 1. **playerId** (8 Endpoints)
**Beschreibung:** Eindeutige Spieler-Identifikation
**Gefundene Werte:** `3365`, `185`, `9598`, `2366`, `2491`, `7226`, `1955`

**Betroffene Endpoints:**
- `GET /v4/competitions/{competitionId}/players/{playerId}/performance`
- `GET /v4/leagues/{leagueId}/players/{playerId}`
- `GET /v4/leagues/{leagueId}/players/{playerId}/performance`
- `GET /v4/leagues/{leagueId}/players/{playerId}/transfers`
- Weitere...

### 2. **challengeId** (12 Endpoints)
**Beschreibung:** Challenge/Turnier-Identifikation
**Gefundene Werte:** `502`, `500`, `504`, `484`, `503`, `142`

**Betroffene Endpoints:**
- `GET /v4/challenges/{challengeId}/profile`
- `GET /v4/challenges/{challengeId}/favorites`
- `GET /v4/challenges/{challengeId}/lineup/overview`
- `GET /v4/challenges/{challengeId}/performance`
- Weitere...

### 3. **userId** (6 Endpoints)
**Beschreibung:** Benutzer-Identifikation
**Gefundene Werte:** `2151182`, `1417087`, `678891`, `1375901`, `25797`

**Betroffene Endpoints:**
- `GET /v4/leagues/{leagueId}/managers/{userId}/performance`
- `GET /v4/leagues/{leagueId}/managers/{userId}/dashboard`
- `GET /v4/leagues/{leagueId}/users/{userId}/teamcenter`
- Weitere...

### 4. **matchId** (2 Endpoints)
**Beschreibung:** Spiel-Identifikation
**Gefundene Werte:** `8473`, `8509`, `8573`, `8585`, `8323`

**Betroffene Endpoints:**
- `GET /v4/matches/{matchId}/details`
- `GET /v4/matches/{matchId}/betlink`

### 5. **activityId** (2 Endpoints)
**Beschreibung:** Aktivitäts-Feed Identifikation
**Gefundene Werte:** `11375691394`, `11373202378`, `11368112003`, `11368111903`

**Betroffene Endpoints:**
- `GET /v4/leagues/{leagueId}/activitiesFeed/{activityId}`

### 6. **timeframe** (2 Endpoints)
**Beschreibung:** Zeitraum-Parameter
**Mögliche Werte:** `7`, `30`, `season`, `current`, `last`

**Betroffene Endpoints:**
- `GET /v4/leagues/{leagueId}/players/{playerId}/marketvalue/{timeframe}`

### 7. **type** (2 Endpoints)
**Beschreibung:** Typ-Parameter für verschiedene Kategorien
**Gefundene Werte:** `rt`, `transfer`, `lineup`, `performance`

**Betroffene Endpoints:**
- `GET /v4/leagues/{leagueId}/user/achievements/{type}`
- `GET /v4/leagues/{leagueId}/battles/{type}/users`

---

## ⚙️ Konfiguration der seed_values.json

### Aktuelle Konfiguration erweitern

Fügen Sie diese Parameter zu Ihrer `config/seed_values.json` hinzu:

```json
{
  "leagueId": "7389547",
  "teamId": "2",
  "userId": "2151182",
  "competitionId": "1",
  "sid": "20",
  "tid": "2",
  
  // === NEUE PARAMETER ===
  "playerId": "7226",
  "challengeId": "142",
  "matchId": "8473",
  "activityId": "11375691394",
  "timeframe": "30",
  "type": "rt"
}
```

### 🔄 Alternative Werte für Tests

Für umfassende Tests können Sie verschiedene Werte rotieren:

```json
{
  // Mehrere Spieler-IDs für verschiedene Tests
  "playerId": ["7226", "3365", "185", "9598", "2366"],
  
  // Verschiedene Challenge-IDs
  "challengeId": ["142", "502", "500", "504", "484"],
  
  // Verschiedene Benutzer-IDs
  "userId": ["2151182", "1417087", "678891", "1375901"],
  
  // Verschiedene Match-IDs
  "matchId": ["8473", "8509", "8573", "8585"],
  
  // Verschiedene Activity-IDs
  "activityId": ["11375691394", "11373202378", "11368112003"],
  
  // Verschiedene Zeiträume
  "timeframe": ["7", "30", "season"],
  
  // Verschiedene Typen
  "type": ["rt", "transfer", "lineup", "performance"]
}
```

---

## 🚀 Nächste Schritte

### 1. Parameter aktualisieren
```bash
# Bearbeiten Sie die seed_values.json
nano config/seed_values.json
```

### 2. Harvester erneut ausführen
```bash
python3 harvest.py
```

### 3. Ergebnisse überprüfen
```bash
# Anzahl neuer JSON-Dateien
find output -name "*.json" ! -name "*.pending.json" ! -name "*.schema.json" | wc -l

# Verbleibende pending Dateien
find output -name "*.pending.json" | wc -l
```

---

## 📈 Erwartete Verbesserungen

Mit diesen Parametern sollten Sie Zugriff auf **zusätzliche 31 Endpoints** erhalten, was die Gesamtzahl der dokumentierten API-Felder erheblich erhöhen wird.

### Potenzielle neue Daten:
- **Detaillierte Spieler-Performance** mit historischen Daten
- **Challenge-spezifische Informationen** wie Rankings und Aufstellungen
- **Benutzer-Dashboard** mit persönlichen Statistiken
- **Match-Details** mit Live-Daten und Wettinformationen
- **Aktivitäts-Feed** mit spezifischen Event-Details
- **Marktwertverlauf** über verschiedene Zeiträume
- **Achievement-System** mit verschiedenen Kategorien

---

## 🔧 Troubleshooting

### Häufige Probleme:

1. **404 Fehler bei bestimmten IDs**
   - Verwenden Sie alternative IDs aus der Liste
   - Überprüfen Sie, ob die IDs noch gültig sind

2. **Timeframe-Parameter funktioniert nicht**
   - Versuchen Sie: `"7"`, `"30"`, `"season"`, `"current"`

3. **Type-Parameter gibt Fehler**
   - Testen Sie: `"rt"`, `"transfer"`, `"lineup"`

### Debug-Tipps:
```bash
# Überprüfen Sie spezifische Fehler
grep -r "error" output/

# Analysieren Sie erfolgreiche Responses für neue Parameter-Werte
python3 analyze_missing_params.py
```

---

## 📊 Erfolgs-Metriken

**Vor Parameter-Erweiterung:**
- 58 erfolgreiche Endpoints
- 430 dokumentierte API-Felder
- 31 ausstehende Endpoints

**Nach vollständiger Parameter-Erweiterung (erwartet):**
- ~89 erfolgreiche Endpoints (+31)
- ~650+ dokumentierte API-Felder (+220+)
- Deutlich reduzierte ausstehende Endpoints

---

*Letzte Aktualisierung: $(date)*
*Basierend auf Analyse von 58 erfolgreichen API-Responses und 31 ausstehenden Endpoints*
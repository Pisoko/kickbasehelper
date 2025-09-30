# CV (Contract Value) API Dokumentation

## Übersicht

Die CV-API ermöglicht es, den **Vertragswert (Contract Value)** von Spielern aus der Kickbase API abzurufen. Das "cv" Feld repräsentiert den aktuellen Vertragswert eines Spielers, der sich vom Marktwert ("mv") unterscheidet.

## API-Endpunkt

**Base URL**: `/api/player-cv`

## Verfügbare Methoden

### 1. GET - Einzelner Spieler

**Endpunkt**: `GET /api/player-cv?playerId={PLAYER_ID}&leagueId={LEAGUE_ID}`

**Parameter**:
- `playerId` (erforderlich): Die Kickbase Spieler-ID
- `leagueId` (optional): Die Liga-ID (Standard: "7389547")

**Beispiel-Request**:
```bash
curl "http://localhost:3001/api/player-cv?playerId=7226"
```

**Beispiel-Response**:
```json
{
  "success": true,
  "playerId": "7226",
  "playerName": "Harry Kane",
  "teamName": "Bayern",
  "cvValue": 62700000,
  "marketValue": 62707483,
  "timestamp": "2025-09-30T07:42:34.745Z",
  "leagueId": "7389547"
}
```

### 2. POST - Mehrere Spieler

**Endpunkt**: `POST /api/player-cv`

**Request Body**:
```json
{
  "playerIds": ["7226", "6081"],
  "leagueId": "7389547"
}
```

**Beispiel-Request**:
```bash
curl -X POST http://localhost:3001/api/player-cv \
  -H "Content-Type: application/json" \
  -d '{"playerIds": ["7226", "6081"]}'
```

**Beispiel-Response**:
```json
{
  "success": true,
  "results": [
    {
      "playerId": "7226",
      "playerName": "Harry Kane",
      "teamName": "Bayern",
      "cvValue": 62700000,
      "marketValue": 62707483,
      "success": true
    },
    {
      "playerId": "6081",
      "playerName": "Can Uzun",
      "teamName": "Frankfurt",
      "cvValue": 20700000,
      "marketValue": 20741939,
      "success": true
    }
  ],
  "totalPlayers": 2,
  "successfulPlayers": 2,
  "timestamp": "2025-09-30T07:42:40.630Z",
  "leagueId": "7389547"
}
```

## Programmierbare Schnittstelle

### EnhancedKickbaseClient.getPlayerCV()

Die `EnhancedKickbaseClient` Klasse bietet eine direkte Methode zum Abrufen von CV-Werten:

```typescript
import { enhancedKickbaseClient } from '@/lib/adapters/EnhancedKickbaseClient';

// Einzelner Spieler
const cvData = await enhancedKickbaseClient.getPlayerCV('7226');
if (cvData) {
  console.log(`${cvData.playerName}: €${cvData.cvValue.toLocaleString()}`);
}
```

**Rückgabe-Typ**:
```typescript
{
  playerId: string;
  playerName: string;
  teamName: string;
  cvValue: number;
  marketValue: number;
} | null
```

## Unterschied zwischen CV und Marktwert

| Feld | Beschreibung | Verwendung |
|------|--------------|------------|
| `cv` | **Contract Value** - Vertragswert | Aktueller Vertragswert des Spielers |
| `mv` | **Market Value** - Marktwert | Aktueller Marktwert für Transfers |

## Fehlerbehandlung

### Mögliche Fehler-Responses

**400 Bad Request** - Fehlende Parameter:
```json
{
  "error": "playerId parameter is required"
}
```

**404 Not Found** - CV-Wert nicht verfügbar:
```json
{
  "error": "CV value not available for this player",
  "playerId": "12345",
  "playerName": "Test Player",
  "availableFields": ["mv", "tp", "ap", ...]
}
```

**500 Internal Server Error** - API-Konfigurationsfehler:
```json
{
  "error": "API configuration error"
}
```

## Beispiel-Verwendung in der Anwendung

### React Component Beispiel

```typescript
import { useState, useEffect } from 'react';

function PlayerCVDisplay({ playerId }: { playerId: string }) {
  const [cvData, setCvData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCV() {
      try {
        const response = await fetch(`/api/player-cv?playerId=${playerId}`);
        const data = await response.json();
        if (data.success) {
          setCvData(data);
        }
      } catch (error) {
        console.error('Error fetching CV:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCV();
  }, [playerId]);

  if (loading) return <div>Loading...</div>;
  if (!cvData) return <div>CV data not available</div>;

  return (
    <div>
      <h3>{cvData.playerName}</h3>
      <p>Team: {cvData.teamName}</p>
      <p>Contract Value: €{cvData.cvValue.toLocaleString()}</p>
      <p>Market Value: €{cvData.marketValue.toLocaleString()}</p>
      <p>Difference: €{(cvData.cvValue - cvData.marketValue).toLocaleString()}</p>
    </div>
  );
}
```

## Logging

Die API verwendet Pino-Logging für detaillierte Protokollierung:

- **Info**: Erfolgreiche CV-Abfragen
- **Warn**: CV-Wert nicht gefunden
- **Error**: API-Fehler und Konfigurationsprobleme

## Authentifizierung

Die API verwendet den `KICKBASE_KEY` aus den Umgebungsvariablen für die Authentifizierung mit der Kickbase API.

## Rate Limiting

Beachten Sie die Rate Limits der Kickbase API bei häufigen Anfragen. Für Batch-Operationen verwenden Sie die POST-Methode.

## Getestete Spieler

Die API wurde erfolgreich mit folgenden Spielern getestet:

- **Harry Kane** (ID: 7226) - CV: €62,700,000
- **Can Uzun** (ID: 6081) - CV: €20,700,000

## Technische Details

- **Kickbase API Endpunkt**: `https://api.kickbase.com/v4/leagues/{leagueId}/players/{playerId}`
- **Standard Liga-ID**: 7389547 (Deutsche Bundesliga)
- **Datenfeld**: `cv` (Contract Value)
- **Fallback-Feld**: `mv` (Market Value) für Vergleiche
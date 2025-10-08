# Token Refresh Mechanismen - Wartungsanleitung

## Übersicht

Das KickbaseHelper-System verwendet automatische Token-Erneuerung, um sicherzustellen, dass API-Aufrufe zur Kickbase API immer mit gültigen Authentifizierungstoken durchgeführt werden.

## Architektur

### KickbaseAuthService
- **Datei**: `lib/adapters/KickbaseAuthService.ts`
- **Zweck**: Zentrale Verwaltung der Kickbase-Authentifizierung
- **Funktionen**:
  - Automatische Token-Erneuerung bei Ablauf
  - Persistierung neuer Token in `.env` Datei
  - Thread-sichere Token-Refresh-Operationen

### Verwendung in API-Endpoints

Alle API-Endpoints verwenden jetzt `KickbaseAuthService` statt direkter `process.env.KICKBASE_KEY` Zugriffe:

```typescript
import { kickbaseAuth } from '@/lib/adapters/KickbaseAuthService';

// In API-Endpoints:
const token = await kickbaseAuth.getValidToken();
```

### Aktualisierte Endpoints

Die folgenden Endpoints wurden auf `KickbaseAuthService` umgestellt:
- `/api/competition-table`
- `/api/player-cv`
- `/api/player-performance`
- `/api/competition-matchdays` (via EnhancedKickbaseClient)
- `DefeatOddsService`

## Token-Refresh-Prozess

### 1. Token-Validierung
```typescript
async getValidToken(): Promise<string | null> {
  // Prüft ob aktueller Token noch gültig ist
  if (this.isTokenValid()) {
    return this.token;
  }
  
  // Startet automatische Erneuerung bei Ablauf
  await this.refreshToken();
  return this.token;
}
```

### 2. Automatische Erneuerung
```typescript
async refreshToken(): Promise<boolean> {
  // Verhindert mehrfache gleichzeitige Refresh-Operationen
  if (this.refreshPromise) {
    return await this.refreshPromise;
  }
  
  // Authentifizierung mit Email/Passwort
  const success = await this.authenticate(email, password);
  return success;
}
```

### 3. Token-Persistierung
```typescript
private storeToken(authData: AuthToken): void {
  // Aktualisiert .env Datei mit neuem Token
  this.updateEnvFile(authData.tkn);
  
  // Aktualisiert process.env für sofortige Verwendung
  process.env.KICKBASE_KEY = newToken;
}
```

## Konfiguration

### Umgebungsvariablen
```env
# Kickbase API Basis-URL
KICKBASE_BASE=https://api.kickbase.com

# Aktueller Token (wird automatisch aktualisiert)
KICKBASE_KEY=eyJhbGciOiJIUzI1NiIs...

# Login-Daten für automatische Token-Erneuerung
KICKBASE_EMAIL=your-email@example.com
KICKBASE_PASSWORD=your-password
```

## Test-Endpoints

### Token-Status prüfen
```bash
curl http://localhost:3002/api/test-auth
```

### Token manuell erneuern
```bash
curl -X POST http://localhost:3002/api/test-token-refresh
```

## Fehlerbehandlung

### Häufige Probleme

1. **403 Forbidden Fehler**
   - Ursache: Token abgelaufen oder ungültig
   - Lösung: Automatische Erneuerung sollte greifen
   - Manuell: POST zu `/api/test-token-refresh`

2. **Login-Daten fehlen**
   - Ursache: `KICKBASE_EMAIL` oder `KICKBASE_PASSWORD` nicht gesetzt
   - Lösung: Umgebungsvariablen in `.env` ergänzen

3. **.env Datei nicht aktualisiert**
   - Ursache: Dateisystem-Berechtigungen oder Pfad-Probleme
   - Lösung: Logs in `KickbaseAuthService` prüfen

### Logging

Das System verwendet strukturiertes Logging mit `pino`:

```typescript
// Erfolgreiche Authentifizierung
logger.info({ expiresAt: this.tokenExpiry.toISOString() }, 'Authentication successful');

// Token-Aktualisierung
logger.info('Successfully updated .env file with new token');

// Fehler
logger.error({ error }, 'Failed to update .env file');
```

## Wartung

### Regelmäßige Überprüfungen

1. **Token-Gültigkeit**: Tokens sind normalerweise 7 Tage gültig
2. **Login-Daten**: Passwort-Änderungen erfordern Update der `.env`
3. **Logs**: Überwachung auf Authentifizierungsfehler

### Monitoring

Empfohlene Metriken:
- Anzahl Token-Erneuerungen pro Tag
- Fehlgeschlagene Authentifizierungsversuche
- API-Antwortzeiten nach Token-Refresh

## Sicherheit

### Best Practices

1. **Umgebungsvariablen**: Niemals Login-Daten in Code einbetten
2. **Token-Speicherung**: Tokens nur in `.env` und Speicher, nicht in Logs
3. **Berechtigungen**: `.env` Datei sollte nur für Anwendung lesbar sein

### Produktionsumgebung

Für Produktionsumgebungen sollten folgende Anpassungen vorgenommen werden:
- Sichere Token-Speicherung (z.B. Vault, Secrets Manager)
- Verschlüsselte Übertragung der Login-Daten
- Monitoring und Alerting bei Authentifizierungsfehlern

## Troubleshooting

### Debug-Modus aktivieren

Für detaillierte Logs in `EnhancedKickbaseClient`:
```typescript
// Debug-Ausgaben sind bereits aktiviert
console.log('🔑 Using token (first 20 chars):', token.substring(0, 20) + '...');
console.log('📡 Response status:', response.status, response.statusText);
```

### Manuelle Token-Erneuerung

Bei Problemen kann ein Token manuell erneuert werden:
```bash
# 1. Neuen Token generieren
curl -X POST http://localhost:3002/api/test-token-refresh

# 2. API-Funktionalität testen
curl http://localhost:3002/api/competition-matchdays
```

## Changelog

- **2025-10-08**: Implementierung der automatischen Token-Erneuerung
- **2025-10-08**: Migration aller API-Endpoints zu KickbaseAuthService
- **2025-10-08**: .env Datei Auto-Update Funktionalität hinzugefügt
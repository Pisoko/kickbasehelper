# Live Kickbase API Integration

## Übersicht

Diese Dokumentation beschreibt die neuen Live-API-Integrationen für das Kickbase Helper Projekt. Die Integration ermöglicht es, echte Daten direkt von der Kickbase API abzurufen anstatt auf statische JSON-Dateien angewiesen zu sein.

## Neue Komponenten

### 1. KickbaseAuthService (`lib/adapters/KickbaseAuthService.ts`)

Ein Service für die Authentifizierung mit der Kickbase API:

- **Authentifizierung**: Login mit E-Mail und Passwort
- **Token-Management**: Automatische Token-Erneuerung
- **Token-Validierung**: Überprüfung der Token-Gültigkeit
- **Persistierung**: Speicherung von Tokens für Sitzungen

#### Wichtige Methoden:
- `authenticate(email, password)`: Anmeldung mit Benutzerdaten
- `getValidToken()`: Abruf eines gültigen Tokens
- `refreshToken()`: Manuelle Token-Erneuerung
- `isTokenValid()`: Überprüfung der Token-Gültigkeit
- `clearAuth()`: Abmeldung und Token-Löschung

### 2. EnhancedKickbaseClient (`lib/adapters/EnhancedKickbaseClient.ts`)

Ein erweiterter Client für die Kickbase API:

- **Live-Daten**: Abruf von aktuellen Spieler- und Spieldaten
- **Authentifizierte Anfragen**: Verwendung von JWT-Tokens
- **Daten-Transformation**: Konvertierung der API-Antworten
- **Fehlerbehandlung**: Robuste Fehlerbehandlung

#### Verfügbare Endpunkte:
- `getConfiguration()`: Konfigurationsdaten
- `getLeagues()`: Liga-Informationen
- `getPlayers()`: Spielerdaten
- `getPlayerDetails(playerId)`: Detaillierte Spielerinformationen
- `getPlayerPerformance(playerId)`: Spielerleistung
- `getPlayerMarketValue(playerId)`: Marktwert
- `getLiveMatches()`: Live-Spiele
- `getCompetitionMatches()`: Wettbewerbsspiele

### 3. Erweiterte KickbaseAdapter (`lib/adapters/KickbaseAdapter.ts`)

Der bestehende Adapter wurde erweitert:

- **Hybrid-Ansatz**: Verwendung von Live-API mit Fallback auf statische Daten
- **Live-Daten-Enhancement**: Anreicherung von Spielerdaten mit aktuellen Informationen
- **Batch-Verarbeitung**: Effiziente Verarbeitung großer Datenmengen

## API-Routen

### Authentifizierung

#### `/api/auth/status` (GET)
Überprüfung des aktuellen Authentifizierungsstatus.

#### `/api/auth/login` (POST)
Anmeldung mit E-Mail und Passwort.
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

#### `/api/auth/logout` (POST)
Abmeldung und Token-Löschung.

#### `/api/auth/refresh` (POST)
Manuelle Token-Erneuerung.

### Live-Daten

#### `/api/season/live` (GET/POST)
Abruf von Live-Saisondaten (Spieler, Spiele, Konfiguration).

#### `/api/market-values` (GET/POST)
Abruf von aktuellen Marktwerten für Spieler.

#### `/api/live-matches` (GET)
Abruf von Live-Spieldaten.

## React-Komponenten

### 1. KickbaseAuth (`components/KickbaseAuth.tsx`)

Authentifizierungs-Interface:
- Login-Formular
- Status-Anzeige
- Token-Management
- Benutzerinformationen

### 2. LiveDataTest (`components/LiveDataTest.tsx`)

Test-Interface für Live-Daten:
- Daten-Abruf und -Anzeige
- Refresh-Funktionalität
- Fehlerbehandlung
- Statistiken

### 3. MarketValueTracker (`components/MarketValueTracker.tsx`)

Marktwert-Tracking:
- Echtzeit-Marktwerte
- Trend-Indikatoren
- Automatische Updates
- Spieler-Details

### 4. LiveMatchData (`components/LiveMatchData.tsx`)

Live-Spieldaten:
- Aktuelle Spiele
- Spielstände
- Ereignisse
- Status-Updates

## Test-Seite

Die Test-Seite unter `/test-live-api` bietet eine umfassende Übersicht über alle neuen Features:

1. **Authentifizierung**: Login und Status-Management
2. **Live-Daten**: Abruf und Anzeige von Saisondaten
3. **Marktwerte**: Tracking von Spieler-Marktwerten
4. **Live-Spiele**: Anzeige aktueller Spieldaten

## Konfiguration

### Umgebungsvariablen

Keine zusätzlichen Umgebungsvariablen erforderlich. Die Kickbase API-URL ist fest kodiert:
```
https://api.kickbase.com
```

### Token-Persistierung

Tokens werden im Service-Speicher gehalten und müssen bei Neustart der Anwendung erneut abgerufen werden.

## Sicherheit

- **JWT-Tokens**: Sichere Authentifizierung
- **Token-Validierung**: Automatische Überprüfung der Gültigkeit
- **Fehlerbehandlung**: Sichere Behandlung von Authentifizierungsfehlern
- **Keine Passwort-Speicherung**: Passwörter werden nicht gespeichert

## Fehlerbehandlung

Das System implementiert mehrschichtige Fehlerbehandlung:

1. **API-Ebene**: Behandlung von HTTP-Fehlern
2. **Service-Ebene**: Authentifizierungs- und Token-Fehler
3. **Komponenten-Ebene**: UI-Fehleranzeige
4. **Fallback-System**: Rückfall auf statische Daten bei API-Fehlern

## Performance

- **Caching**: Token werden zwischengespeichert
- **Batch-Verarbeitung**: Effiziente Verarbeitung großer Datenmengen
- **Lazy Loading**: Daten werden nur bei Bedarf geladen
- **Automatische Erneuerung**: Tokens werden automatisch erneuert

## Zukünftige Erweiterungen

Mögliche Verbesserungen:
- Persistente Token-Speicherung (localStorage/sessionStorage)
- WebSocket-Integration für Echtzeit-Updates
- Erweiterte Caching-Strategien
- Offline-Modus mit lokaler Datenspeicherung
- Push-Benachrichtigungen für wichtige Events

## Verwendung

1. **Authentifizierung**: Melden Sie sich mit Ihren Kickbase-Daten an
2. **Live-Daten**: Nutzen Sie die Test-Seite zum Abrufen aktueller Daten
3. **Integration**: Verwenden Sie die Services in Ihren eigenen Komponenten
4. **Monitoring**: Überwachen Sie den Authentifizierungsstatus

## Support

Bei Problemen:
1. Überprüfen Sie den Authentifizierungsstatus
2. Erneuern Sie das Token manuell
3. Prüfen Sie die Browser-Konsole auf Fehler
4. Verwenden Sie das Fallback-System bei API-Problemen
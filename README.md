# KickbaseHelper

KickbaseHelper ist eine lokale Next.js-Anwendung, die die optimale Startelf für Kickbase ermittelt. Die App nutzt wöchentliche Daten-Updates, berechnet Projektionen mit einstellbaren Gewichten und löst ein MILP zur Team-Optimierung.

## Voraussetzungen

- Node.js 20+
- npm

## Installation

```bash
npm install
```

## Daten aktualisieren

```bash
npm run fetch:weekly -- --spieltag 1 --force
```

Die Daten werden unter `data/<jahr>/spieltag_<n>.json` gespeichert. Bei vorhandenen Daten, die jünger als sieben Tage sind, wird der Cache wiederverwendet. Über die UI lässt sich über den Button „Daten aktualisieren“ ein Refresh anstoßen.

## Entwicklung starten

```bash
npm run dev
```

Anschließend ist die App unter http://localhost:3000 erreichbar.

## Tests & Linting

```bash
npm run test       # Vitest Unit-Tests
npm run lint       # ESLint
npm run e2e        # Playwright Happy-Path (Dev-Server muss auf Port 3000 laufen)
```

## Skripte

- `scripts/fetchData.ts` – Lädt Kickbase-Daten (oder Mock-Daten) und speichert sie im Dateisystem.

## Konfiguration

Hinterlege API-Keys in `.env.local`:

```
KICKBASE_BASE=https://api.kickbase.de
KICKBASE_KEY=...
ODDS_PROVIDER=none
ODDS_API_KEY=
```

Ohne valide Keys nutzt der Fetch-Skript Mock-Daten, sodass die Anwendung offline getestet werden kann.

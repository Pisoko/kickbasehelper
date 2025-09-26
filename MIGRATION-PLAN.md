# Migration Plan: Mobile-First + Radix/Ark + Tailwind

## Übersicht
Dieses Dokument beschreibt den Plan zur Umstellung der bestehenden Web-App auf Mobile-First Design mit Radix/Ark UI und Tailwind CSS unter Einhaltung der definierten Performance-Budgets.

## Performance-Budgets
- LCP < 2.5s
- TTI < 3.5s
- CLS < 0.1
- JS < 170 KB/Route
- CSS < 50 KB/Route

## Migrations-Phasen

### Phase 1: Grundlegende Infrastruktur
- ✅ Installation von Radix UI Komponenten
- ✅ Einrichtung von Utility-Funktionen (cn)
- Erstellung der UI-Primitives in `components/ui/`
  - Button
  - Dialog
  - Tabs
  - Select
  - Checkbox
  - Toast

### Phase 2: Komponenten-Migration
- Umstellung der Hauptkomponenten auf Radix/Tailwind
  - PlayerMatchHistory
  - PlayerDetailModal
  - KickbaseAuth
  - LiveMatchData
  - MarketValueTracker

### Phase 3: Mobile-First Anpassungen
- Überarbeitung des Layouts für mobile Geräte
- Implementierung von responsiven Breakpoints
- Optimierung der Navigation für Touch-Geräte

### Phase 4: Performance-Optimierung
- Implementierung von Code-Splitting und dynamischen Imports
- Optimierung der Bildverarbeitung mit next/image
- Reduzierung der Bundle-Größe

### Phase 5: Qualitätssicherung
- A11y-Verbesserungen
- Unit- und Flow-Tests
- Performance-Messungen

## PR-Reihenfolge
1. UI-Primitives und Grundstruktur
2. Hauptkomponenten (inkrementell)
3. Mobile-First Layout
4. Performance-Optimierungen
5. Tests und A11y-Verbesserungen
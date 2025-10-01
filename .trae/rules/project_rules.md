# traeide.rules.yaml
meta:
  name: "Web UI Rules – Mobile First + Headless"
  version: 1.0
  owner: "Frontend"
  intent: "Erzwinge moderne, performante, mobile-first UI mit konsistentem Tooling."

season_config:
  current_season: "2025/2026"
  season_start: "2025-08-01"
  season_end: "2026-05-31"
  total_matchdays: 34
  matches_per_matchday: 9
  current_matchday: 5
  completed_matchdays: 5
  display_rules:
    - "MatchdayOverview zeigt immer den kommenden Spieltag (aktueller + 1)"
    - "Alle 9 Spiele eines Spieltags müssen angezeigt werden"
    - "API-Endpoints unterstützen vollständige Spieltag-Daten"

toggles:
  allow_shadcn: false            # true = shadcn/ui erlaubt; false = nur Headless
  ui_profile: "headless"         # "headless" | "styled"
  # headless = Radix/Ark + Tailwind (empfohlen); styled = Mantine/NextUI (nur wenn nötig)

stack:
  runtime: "Next.js (App Router) + React 18 + TypeScript"
  styling:
    headless:
      primitives: ["@radix-ui/react-*"]    # oder "ark-ui" wenn bevorzugt
      css: "TailwindCSS"
      utilities: ["class-variance-authority", "tailwind-merge"]
    styled:
      libraries: ["@mantine/core", "@mantine/hooks"] # oder "nextui-org/react"
  forms: ["react-hook-form", "zod"]
  testing: ["vitest", "@testing-library/react", "playwright"]
  a11y: ["radix-primitives-a11y", "aria-attributes"]
  perf_tools: ["lighthouse-ci", "@next/bundle-analyzer"]

architecture:
  patterns:
    - "RSC-first: Server Components standard, 'use client' nur bei Interaktion."
    - "Ordnerstruktur: src/app/* (Routen), src/components/ui/* (Primitive), src/components/features/* (Feature-UI)."
    - "Jede wiederverwendbare UI nutzt cva (Variants) + cn() zum Mergen."
  naming:
    - "Dateien kebab-case, React-Komponenten PascalCase, Hooks useCamelCase."

ui_policy:
  headless:
    allowed: ["@radix-ui/react-*"]
    banned: ["antd", "@mui/*", "daisyui"]   # Overhead/Inkonsistenz
  styled:
    allowed: ["@mantine/*", "nextui-org/react"]
  shadcn:
    allowed: ${toggles.allow_shadcn}
    note: "Wenn true, nur shadcn/ui + Radix; keine Mischbibliotheken."

mobile_first:
  rules:
    - "Base-Styles sind Mobile. Breakpoints nur via md:/lg: ergänzen."
    - "Touch-Ziele ≥ 44x44px; Default Button-Size = lg auf Mobile."
    - "Layouts einspaltig auf Mobile; ab md: Grid 2–3 Spalten."
    - "Dark Mode first-class mit next-themes."

styling_rules:
  - "Nur Tailwind-Utilities (keine Inline-Styles außer CSS-Variablen)."
  - "Design-Tokens via Tailwind (bg-background, text-foreground, ring, radius)."
  - "Komponenten mit cva: variants={variant,size} + sinnvolle Defaults."
  - "Keine globale CSS-Flut; @layer utilities, components sparsam."

accessibility:
  - "Radix/Ark korrekt einsetzen (Labels, Roles, aria-*)."
  - "Fokus sichtbar; keine focus-outline-Removals."
  - "Dialog/Sheet: Escape, Focus-Trap, aria-labelledby/-describedby."
  - "prefers-reduced-motion respektieren."

performance_budgets:
  web_vitals:
    lcp_ms: 2500
    cls: 0.1
    tti_ms: 3500
  payload:
    js_per_route_kb_gzip: 170
    css_per_route_kb_gzip: 50
    image_max_kb: 200
  build_guards:
    - "PR blocken, wenn Budgets gerissen werden (Lighthouse CI)."
    - "Bundle-Analyse verpflichtend für neue große Abhängigkeiten."

next_react_guidelines:
  - "Bilder über next/image (formats: avif, webp; sizes korrekt; priority sehr sparsam)."
  - "Fonts via next/font, nur benötigte Weights/Subsets, display: swap."
  - "Dynamic Import für Schwergewichte (Charts/Maps/Editor) mit Skeleton-Fallback."
  - "Daten-Fetching: Cache & revalidate nutzen; Overfetching vermeiden."
  - "State so lokal wie möglich; globale Stores nur wenn nötig."

data_policy:
  no_mock_data:
    - "STRIKT VERBOTEN: Keine Mock-Daten, Fake-Daten oder Test-Daten in der Produktion"
    - "Alle Daten MÜSSEN von der Live Kickbase API kommen"
    - "MockDataGenerator.ts und ähnliche Klassen sind NUR für Tests erlaubt"
    - "API-Endpoints dürfen NIEMALS auf Mock-Daten zurückgreifen"
    - "Fallback-Verhalten: Fehler anzeigen statt Mock-Daten verwenden"
  live_api_only:
    - "Ausschließlich Kickbase API als Datenquelle"
    - "Alle Spieler-, Match- und Team-Daten von Live-API"
    - "Cache nur für Performance, nie als Mock-Ersatz"
    - "Bei API-Fehlern: Nutzer informieren, keine falschen Daten zeigen"
  enforcement:
    - "Code-Reviews müssen Mock-Daten Verwendung ablehnen"
    - "CI/CD Pipeline soll Mock-Daten Imports in Production-Code blockieren"
    - "Entwickler müssen Live-API Integration vor Feature-Completion sicherstellen"

security:
  - "Keine Secrets im Client; nur NEXT_PUBLIC_* im Browser."
  - "Alle API-Antworten validieren (zod) bevor rendern."
  - "HTTPS-only Annahme; CSRF/XSS-Härtung Standard."

tests_minimum:
  - "Mindestens 1 Unit-Test pro komplexer Komponente (Props/Varianten)."
  - "Mindestens 1 Playwright-Flow pro kritischer Route (Happy Path)."

generation_rules:
  code:
    - "Nur TypeScript, strikte Typen, keine any."
    - "Jede exportierte Funktion/Komponente mit knappen JSDoc/Dartdoc-Äquivalent."
    - "Erzeuge bei Formularen immer zod-Schema + RHF-Resolver + UI-Fehlerstates."
    - "Am Ende des Outputs 2–3 Sätze: Zweck + Varianten/States."
  components:
    template_cva: |
      import { cva, type VariantProps } from "class-variance-authority";
      import { cn } from "@/lib/utils";
      export const btnVariants = cva(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none",
        {
          variants: {
            variant: { primary: "bg-primary text-primary-foreground hover:bg-primary/90", ghost: "bg-transparent hover:bg-accent" },
            size: { sm: "h-9 px-3 text-sm", md: "h-10 px-4", lg: "h-11 px-6 text-base" }
          },
          defaultVariants: { variant: "primary", size: "lg" }
        }
      );
  pages_generator_prompt: |
    Erzeuge eine Seite Mobile-First mit:
    - Header (Logo, Mobile-Navigation als Sheet), Hero (H1, Copy, 2 CTA Buttons), Feature-Grid (3 Cards), FAQ (Accordion), Footer.
    - Nutze Radix-Primitives (Dialog/Sheet/Accordion) + Tailwind. Keine fremden UI-Libs.
    - A11y korrekt, Dark/Light-Theme, Skeletons für Lazy-Inhalte.
    - Liefere kurz am Ende: Erklärung (2–3 Sätze) + Varianten.

ci_checks:
  - "Run ESLint + Prettier + typecheck in pre-commit (husky + lint-staged)."
  - "Lighthouse CI (Mobile) muss ≥ 90 Score liefern."
  - "Bundle Analyzer bei ANALYZE=true; kommentiere größte Chunks im PR."

pr_checklist:
  - "[ ] Mobile-first umgesetzt (Breakpoints minimal, Touch-Ziele korrekt)."
  - "[ ] Nur erlaubte UI-Bibliotheken (Radix/Ark oder Mantine/NextUI, je nach toggle)."
  - "[ ] cva-Varianten + cn() vorhanden; keine Inline-Styles."
  - "[ ] next/image + next/font korrekt konfiguriert."
  - "[ ] Tests vorhanden (RTL/Vitest, kritischer Flow in Playwright)."
  - "[ ] Web Vitals/Budgets eingehalten (CI grün)."
  - "[ ] A11y geprüft (Labels, Focus, Keyboard)."
  - "[ ] KEINE Mock-Daten in Production-Code (nur Live Kickbase API)."

snippets:
  next_config: |
    // next.config.js
    const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
    module.exports = withBundleAnalyzer({
      experimental: { optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'] },
      images: { formats: ['image/avif', 'image/webp'] },
    });
  dynamic_import: |
    import dynamic from "next/dynamic";
    import { Skeleton } from "@/components/ui/skeleton";
    const Chart = dynamic(() => import("@/components/chart"), { ssr: false, loading: () => <Skeleton className="h-48" /> });

build_system:
  versioning:
    strategy: "Git-Commit-basiert"
    format: "1.0.{buildNumber}"
    increment: "Automatisch pro Commit"
  
  build_tracking:
    service: "lib/services/BuildService.ts"
    storage: "data/build-info.json + data/changelog.json"
    api_endpoint: "/api/build-info"
    
  changelog:
    source: "Git-Commit-Messages"
    limit: "100 Einträge (automatisch begrenzt)"
    format: "JSON mit buildNumber, commitHash, message, timestamp, author"
    
  ui_integration:
    component: "components/BuildInfo.tsx"
    location: "AppHeader (neben Titel)"
    display: "Build #{number} (klickbar für Details)"
    
  rules:
    - "Build-Nummer = Git-Commit-Count (git rev-list --count HEAD)"
    - "Changelog wird automatisch aus Git-History generiert"
    - "Build-Info wird bei jedem API-Aufruf aktualisiert (Development)"
    - "UI zeigt aktuelle Build-Nummer und Changelog-Dialog"
    - "Alle Build-Daten werden in data/ Verzeichnis gespeichert"
    
  api_actions:
    - "GET /api/build-info?action=info - Aktuelle Build-Info"
    - "GET /api/build-info?action=changelog&limit=N - Changelog abrufen"
    - "GET /api/build-info?action=check - Prüfung auf neuen Build"
    - "POST /api/build-info - Build-Info aktualisieren (nur Development)"
    
  development_workflow:
    - "Build-Nummer erhöht sich automatisch mit jedem Commit"
    - "Changelog wird aus Git-Commit-Messages generiert"
    - "UI-Komponente zeigt Build-Status in Echtzeit"
    - "Entwickler können Build-Info manuell aktualisieren"

notes:
  - "Wenn ui_profile='styled', nutze Mantine/NextUI konsistent, keine Mischformen."
  - "Wenn allow_shadcn=true, shadcn/ui + Radix ok; Performance-Budgets gelten identisch."
  - "Build-System ist vollständig Git-integriert und erfordert keine manuellen Eingriffe."

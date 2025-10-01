import { CacheWarmupIndicator } from '@/components/ui/CacheWarmupIndicator';

export default function CacheManagementPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Cache Management</h1>
          <p className="text-muted-foreground">
            Verwalte den Cache für optimale Performance der Kickbase Helper App
          </p>
        </div>
        
        <CacheWarmupIndicator />
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Cache-Vorteile</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Deutlich schnellere Ladezeiten</li>
              <li>• Reduzierte API-Aufrufe</li>
              <li>• Bessere Benutzererfahrung</li>
              <li>• Offline-Verfügbarkeit von Daten</li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Gecachte Daten</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Alle Spielerdaten (24h TTL)</li>
              <li>• Spielerdetails & Performance (24h TTL)</li>
              <li>• Team-Logos (7 Tage TTL)</li>
              <li>• Aktuelle Spieltag-Daten (24h TTL)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
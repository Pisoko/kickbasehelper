'use client';

import TeamOddsManager from '../../components/TeamOddsManager';

export default function TeamOddsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Team-Quoten Verwaltung</h1>
          <p className="text-muted-foreground">
            Verwalte die Quoten-Faktoren für die X-Wert-Berechnung aller Bundesliga-Teams. 
            Diese Werte beeinflussen direkt die Bewertung der Spieler in der Anwendung.
          </p>
        </div>
        
        <TeamOddsManager 
          onOddsChange={(updatedOdds) => {
            console.log('Team-Quoten aktualisiert:', updatedOdds);
            // Hier könnten weitere Aktionen ausgeführt werden
          }}
        />
      </div>
    </div>
  );
}
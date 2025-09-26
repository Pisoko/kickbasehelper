// Debug-Script für Arena-Optimierung Fehler
// Dieses Script kann in der Browser-Konsole ausgeführt werden

console.log('=== Arena Debug Script ===');

// 1. Überprüfe ob arenaOptState existiert
console.log('1. Checking arenaOptState existence...');
try {
  // Versuche arenaOptState zu finden (React DevTools oder globale Variable)
  if (typeof window !== 'undefined') {
    console.log('Window object exists');
    
    // Suche nach React-Komponenten im DOM
    const reactElements = document.querySelectorAll('[data-reactroot], [data-react-checksum]');
    console.log('React elements found:', reactElements.length);
    
    // Suche nach Arena-Button
    const arenaButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('Arena Optimierung')
    );
    console.log('Arena button found:', !!arenaButton);
    
    if (arenaButton) {
      console.log('Arena button text:', arenaButton.textContent);
      console.log('Arena button disabled:', arenaButton.disabled);
      
      // Versuche den onClick-Handler zu finden
      console.log('Arena button onclick:', arenaButton.onclick);
      
      // Simuliere einen Klick und fange Fehler ab
      console.log('2. Simulating click...');
      try {
        arenaButton.click();
      } catch (error) {
        console.error('Error when clicking Arena button:', error);
        console.error('Error stack:', error.stack);
      }
    }
  }
} catch (error) {
  console.error('Error in debug script:', error);
}

// 2. Überprüfe alle Funktionen die 'status' verwenden
console.log('3. Checking for status usage...');
const allScripts = Array.from(document.querySelectorAll('script')).map(script => script.textContent);
const statusUsage = allScripts.filter(script => script && script.includes('.status'));
console.log('Scripts using .status:', statusUsage.length);

// 3. Überprüfe React-Komponenten-State
console.log('4. Checking React component state...');
if (typeof React !== 'undefined') {
  console.log('React is available');
} else {
  console.log('React not found in global scope');
}

console.log('=== Debug Script Complete ===');
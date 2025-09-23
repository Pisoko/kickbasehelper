// Test script to debug HTML parsing
const fs = require('fs');

// Sample HTML from the actual Bundesliga page
const sampleHtml = `
<player-card-simple>
  <div class="playercard">
    <a href="https://www.bundesliga.com/de/bundesliga/spieler/finn-dahmen">
      <div class="playercard-wrapper">
        <img src="https://assets.bundesliga.com/player/dfl-obj-0028co-dfl-clu-000010-dfl-sea-0001k9-circle.png?fit=64,64" alt="Finn Dahmen" class="playerImage">
        <span class="playerNumber">1</span>
        <span class="names">
          <span class="playerName firstName">Finn</span>
          <span class="playerName lastName">Dahmen</span>
        </span>
      </div>
    </a>
  </div>
</player-card-simple>
`;

console.log('Testing HTML parsing...');

// Test the regex patterns
const playerCardPattern = /<player-card-simple[^>]*>[\s\S]*?<\/player-card-simple>/g;
const playerCards = sampleHtml.match(playerCardPattern) || [];

console.log(`Found ${playerCards.length} player cards`);

playerCards.forEach((cardHtml, index) => {
  console.log(`\nCard ${index + 1}:`);
  console.log('HTML:', cardHtml.substring(0, 200) + '...');
  
  // Extract player name from firstName and lastName spans
  const firstNameMatch = cardHtml.match(/<span[^>]*class="[^"]*firstName[^"]*"[^>]*>([^<]+)<\/span>/);
  const lastNameMatch = cardHtml.match(/<span[^>]*class="[^"]*lastName[^"]*"[^>]*>([^<]+)<\/span>/);
  
  // Extract image URL
  const imageMatch = cardHtml.match(/src="([^"]*assets\.bundesliga\.com\/player[^"]*?)"/);
  
  // Extract player number
  const numberMatch = cardHtml.match(/<span[^>]*class="[^"]*playerNumber[^"]*"[^>]*>([^<]+)<\/span>/);
  
  console.log('First name match:', firstNameMatch);
  console.log('Last name match:', lastNameMatch);
  console.log('Image match:', imageMatch);
  console.log('Number match:', numberMatch);
  
  if (firstNameMatch && lastNameMatch && imageMatch) {
    const firstName = firstNameMatch[1].trim();
    const lastName = lastNameMatch[1].trim();
    const playerName = `${firstName} ${lastName}`;
    const imageUrl = imageMatch[1];
    const playerNumber = numberMatch ? numberMatch[1].trim() : '';
    
    console.log(`✓ Successfully parsed: ${playerName} (#${playerNumber}) - ${imageUrl}`);
  } else {
    console.log('✗ Failed to parse player data');
  }
});
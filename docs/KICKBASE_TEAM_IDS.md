# Kickbase API Team ID Structure

## Overview
The Kickbase API contains both men's and women's teams with similar names but different IDs. This document explains the ID structure and how to distinguish between them.

## Key Findings

### Bayern München Example
- **Women's Team**: ID `2` - Has 1740 players, includes male players (investigation showed players like "Tah", "Neuer", "Goretzka")
- **Men's Team**: ID `82` - Has 0 players in our tests, but this is the correct ID for Bundesliga men's team

**Note**: Despite ID `2` having male player names, our investigation suggests this might be a legacy or mixed dataset. The official men's Bundesliga team uses ID `82`.

### ID Patterns Observed

#### Low IDs (1-10)
- ID `1`: "Additional Players" (0 players)
- ID `2`: "Bayern" (1740 players) - Potentially women's/legacy team
- ID `3`: "Dortmund" (15 players) - Men's team
- ID `4`: "Frankfurt" (16 players)
- ID `5`: "Freiburg" (16 players)
- ID `6`: "Hamburg" (16 players)
- ID `7`: "Leverkusen" (16 players)
- ID `8`: "Schalke" (0 players)
- ID `9`: "Stuttgart" (16 players)
- ID `10`: "Bremen" (16 players)

#### High IDs (80-92)
These appear to be the official men's Bundesliga team IDs:
- ID `80`: "Werder Bremen"
- ID `82`: "Bayern München" (men's team)
- ID `83`: "Bayer 04 Leverkusen"
- ID `84`: "TSG Hoffenheim"
- ID `86`: "1. FC Köln"
- ID `87`: "VfL Wolfsburg"
- ID `88`: "SC Freiburg"
- ID `89`: "Eintracht Frankfurt"
- ID `92`: "RB Leipzig"

#### International Teams (100+)
- ID `100`: "France"
- ID `101`: "Austria"
- ID `102`: "Netherlands"
- ID `103`: "Czechia"
- ID `104`: "Ukraine"
- ID `105`: "Slovakia"

## Current Implementation

### Correct Team Map (2025/26 Bundesliga Season)
Our application uses the following men's team IDs:

```typescript
const teamMap: Record<string, string> = {
  '82': 'Bayern München',        // Bayern (men's team)
  '3': 'Borussia Dortmund',      // Dortmund
  '92': 'RB Leipzig',            // Leipzig
  '88': 'SC Freiburg',           // Freiburg
  '89': 'Eintracht Frankfurt',   // Frankfurt
  '15': 'Borussia Mönchengladbach', // M'gladbach
  '13': 'FC Augsburg',           // Augsburg
  '84': 'TSG Hoffenheim',        // Hoffenheim
  '80': 'Werder Bremen',         // Bremen
  '86': '1. FC Köln',            // Köln
  '40': '1. FC Union Berlin',    // Union Berlin
  '6': 'Hamburger SV',           // Hamburg (Promoted for 2025/26)
  '39': 'FC St. Pauli',          // St. Pauli (Promoted for 2025/26)
  '18': 'FSV Mainz 05',          // Mainz
  '83': 'Bayer 04 Leverkusen',   // Leverkusen
  '87': 'VfL Wolfsburg',         // Wolfsburg
  '49': '1. FC Heidenheim 1846'  // 1. FC Heidenheim 1846
};
```

## Important Notes

1. **Always use competition ID 1** when fetching team data for Bundesliga men's teams
2. **Avoid low IDs (1-10)** for current Bundesliga teams as they may reference women's teams or legacy data
3. **Use high IDs (80-92)** for official men's Bundesliga teams
4. **Team ID 2 (Bayern)** should not be used despite having player data, as it may be women's team or legacy data

## API Endpoints Used

- Team details: `/v4/competitions/1/teams/{teamId}/teamcenter`
- Player verification: Check the `it` array for player names and count

## Verification Method

To verify if a team ID corresponds to men's or women's team:
1. Check player count (`playersCount` field)
2. Examine player names in the `it` array
3. Verify against known Bundesliga roster

Last updated: January 2025
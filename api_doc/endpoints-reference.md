# Kickbase API v4 - Detailed Endpoints Reference

## 📋 Complete Endpoint List

### Base & Configuration Endpoints

#### GET /v4/config
**Description**: Returns global API configuration including competition settings, budgets, and timing information.

**Authentication**: Not required

**Parameters**: None

**Response Schema**:
```json
{
  "lis": "string (ISO 8601)",     // League start time
  "lie": "string (ISO 8601)",     // League end time
  "cps": [                        // Competition configurations array
    {
      "cpi": "string",            // Competition ID
      "lis": "string (ISO 8601)", // Competition start
      "lie": "string (ISO 8601)", // Competition end
      "rcn": "string",            // Region code name
      "rpcn": "string",           // Region parent code name
      "rmcn": "string",           // Region main code name
      "b": "number",              // Base budget
      "ntb": "number",            // New team budget
      "tv": "number",             // Transfer value
      "cpt": "string",            // Competition type
      "il": "string",             // Image logo path
      "mds": "number",            // Match days count
      "lts": ["string"],          // Lineup tactics array
      "lpc": "number",            // Lineup player count
      "fts": ["number"],          // Formation types array
      "pspt": "number",           // Points per point type
      "bsc": "number"             // Base score
    }
  ]
}
```

**Example Response**:
```json
{
  "lis": "2025-09-26T18:30:00Z",
  "lie": "2025-09-29T16:00:00Z",
  "cps": [
    {
      "cpi": "1",
      "lis": "2025-08-15T18:30:00Z",
      "lie": "2025-05-24T15:30:00Z",
      "rcn": "Deutschland",
      "rpcn": "Europa",
      "rmcn": "Europa",
      "b": 50000000.0,
      "ntb": 200000000.0,
      "tv": 100000000.0,
      "cpt": "league",
      "il": "content/file/competition/1/logo.png",
      "mds": 34,
      "lts": ["4-4-2", "4-2-4", "4-3-3", "3-5-2", "5-3-2"],
      "lpc": 11,
      "fts": [1, 2, 3, 4],
      "pspt": 1,
      "bsc": 0
    }
  ]
}
```

#### GET /v4/base/overview
**Description**: Returns base overview information.

**Authentication**: Not required

**Parameters**: None

**Response**: Returns 403 Forbidden (requires authentication despite being listed as public)

---

### Challenge Endpoints

#### GET /v4/challenges/overview
**Description**: Returns all available challenges/tournaments.

**Authentication**: Required

**Parameters**: None

**Response Schema**:
```json
{
  "chs": [                        // Challenges array
    {
      "ch": "string",             // Challenge ID
      "n": "string",              // Challenge name
      "b": "number",              // Budget
      "uc": "number",             // User count
      "lis": "string (ISO 8601)", // Start time
      "lie": "string (ISO 8601)", // End time
      "st": "number",             // Status
      "cpi": "string",            // Competition ID
      "il": "string"              // Image logo path
    }
  ]
}
```

#### GET /v4/challenges/archive
**Description**: Returns archived/past challenges.

**Authentication**: Required

**Parameters**: None

#### GET /v4/challenges/recommended
**Description**: Returns recommended challenges for the user.

**Authentication**: Required

**Parameters**: None

#### GET /v4/challenges/selection
**Description**: Returns challenge selection interface data.

**Authentication**: Required

**Parameters**: None

#### GET /v4/challenges/{challengeId}/profile
**Description**: Returns detailed information about a specific challenge.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID

#### GET /v4/challenges/{challengeId}/ranking
**Description**: Returns ranking/leaderboard for a challenge.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID

#### GET /v4/challenges/{challengeId}/table
**Description**: Returns manager rankings table for a challenge.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID

#### GET /v4/challenges/{challengeId}/top10
**Description**: Returns top 10 managers in a challenge.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID

#### GET /v4/challenges/{challengeId}/performance
**Description**: Returns performance statistics for a challenge.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID

#### GET /v4/challenges/{challengeId}/favorites
**Description**: Returns favorite managers in a challenge.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID

#### GET /v4/challenges/{challengeId}/favorites/search
**Description**: Search for managers to add as favorites.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID
- `query` (query): Search query string

#### GET /v4/challenges/{challengeId}/lineup/overview
**Description**: Returns lineup overview for a challenge.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID

#### GET /v4/challenges/{challengeId}/lineup/selection
**Description**: Returns player selection interface for lineup.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID

#### GET /v4/challenges/{challengeId}/lineup/teams
**Description**: Returns available teams for lineup selection.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID

#### GET /v4/challenges/{challengeId}/lineup/livepitch
**Description**: Returns live lineup/pitch view.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID

#### POST /v4/challenges/{challengeId}/lineup/fill
**Description**: Auto-fills the lineup with optimal players.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID

#### POST /v4/challenges/{challengeId}/lineup/clear
**Description**: Clears the current lineup.

**Authentication**: Required

**Parameters**:
- `challengeId` (path): Challenge ID

#### POST /v4/challenges/favorites
**Description**: Adds a manager to favorites.

**Authentication**: Required

**Request Body**:
```json
{
  "userId": "string",
  "challengeId": "string"
}
```

#### DELETE /v4/challenges/favorites/{userId}
**Description**: Removes a manager from favorites.

**Authentication**: Required

**Parameters**:
- `userId` (path): User ID to remove from favorites

---

### Chat & Communication Endpoints

#### GET /v4/chat/refreshtoken
**Description**: Refreshes the authentication token.

**Authentication**: Required

**Parameters**: None

**Response Schema**:
```json
{
  "tkn": "string",              // JWT token
  "tknex": "string (ISO 8601)"  // Token expiration time
}
```

#### GET /v4/chat/leagueselection
**Description**: Returns available leagues for chat functionality.

**Authentication**: Required

**Parameters**: None

---

### Competition Endpoints

#### GET /v4/competitions/{competitionId}/table
**Description**: Returns the competition table/standings.

**Authentication**: Required

**Parameters**:
- `competitionId` (path): Competition ID (e.g., "1" for Bundesliga)

#### GET /v4/competitions/{competitionId}/ranking
**Description**: Returns competition ranking information.

**Authentication**: Required

**Parameters**:
- `competitionId` (path): Competition ID

#### GET /v4/competitions/{competitionId}/matchdays
**Description**: Returns match day information for the competition.

**Authentication**: Required

**Parameters**:
- `competitionId` (path): Competition ID

#### GET /v4/competitions/{competitionId}/players
**Description**: Returns all players in the competition.

**Authentication**: Required

**Parameters**:
- `competitionId` (path): Competition ID

#### GET /v4/competitions/{competitionId}/players/search
**Description**: Search for players in the competition.

**Authentication**: Required

**Parameters**:
- `competitionId` (path): Competition ID
- `query` (query): Search query string
- `start` (query): Start index for pagination
- `max` (query): Maximum results to return

**Response Schema**:
```json
{
  "players": [
    {
      "i": "string",            // Player ID
      "n": "string",            // Player name
      "tid": "string",          // Team ID
      "pos": "number",          // Position
      "mv": "number",           // Market value
      "st": "number",           // Status
      "ap": "number",           // Average points
      "t1": "number",           // Team 1 goals
      "t2": "number"            // Team 2 goals
    }
  ]
}
```

#### GET /v4/competitions/{competitionId}/players/{playerId}/performance
**Description**: Returns performance statistics for a specific player.

**Authentication**: Required

**Parameters**:
- `competitionId` (path): Competition ID
- `playerId` (path): Player ID

#### GET /v4/competitions/{competitionId}/players/{playerId}/marketvalue/{timeframe}
**Description**: Returns market value history for a player.

**Authentication**: Required

**Parameters**:
- `competitionId` (path): Competition ID
- `playerId` (path): Player ID
- `timeframe` (path): Timeframe for market value (e.g., "season", "month")

#### GET /v4/competitions/{competitionId}/playercenter/{playerId}
**Description**: Returns detailed player information from player center.

**Authentication**: Required

**Parameters**:
- `competitionId` (path): Competition ID
- `playerId` (path): Player ID

#### GET /v4/competitions/{competitionId}/teams/{teamId}/teamcenter
**Description**: Returns team center information.

**Authentication**: Required

**Parameters**:
- `competitionId` (path): Competition ID
- `teamId` (path): Team ID

#### GET /v4/competitions/{competitionId}/teams/{teamId}/teamprofile
**Description**: Returns team profile information.

**Authentication**: Required

**Parameters**:
- `competitionId` (path): Competition ID
- `teamId` (path): Team ID

---

### League Endpoints

#### GET /v4/leagues/selection
**Description**: Returns available leagues for the user.

**Authentication**: Required

**Parameters**: None

**Response Schema**:
```json
{
  "leagues": [
    {
      "i": "string",            // League ID
      "lnm": "string",          // League name
      "cpi": "string",          // Competition ID
      "cpn": "string",          // Competition name
      "dt": "string (ISO 8601)", // Date created
      "mgc": "number",          // Manager count
      "b": "number",            // Budget
      "ism": "boolean",         // Is manager
      "adm": "boolean"          // Is admin
    }
  ]
}
```

#### GET /v4/leagues/{leagueId}/overview
**Description**: Returns overview information for a specific league.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID

**Response Schema**:
```json
{
  "i": "string",              // League ID
  "lnm": "string",            // League name
  "cpi": "string",            // Competition ID
  "cpn": "string",            // Competition name
  "dt": "string (ISO 8601)",  // Date created
  "isr": "boolean",           // Is running
  "mgc": "number",            // Manager count
  "mid": "string",            // Manager ID
  "m": {                      // Manager object
    "ui": "string",           // User ID
    "unm": "string",          // Username
    "n": "string",            // Display name
    "isvf": "boolean",        // Is verified
    "st": "number"            // Status
  },
  "gpm": "number",            // Games per matchday
  "b": "number",              // Budget
  "mppu": "number",           // Max points per user
  "mpst": "number",           // Max points single team
  "amd": "number",            // Active matchday
  "isp": "boolean",           // Is public
  "mgm": "number",            // Max managers
  "d": "string",              // Description
  "ism": "boolean",           // Is manager
  "adm": "boolean"            // Is admin
}
```

#### GET /v4/leagues/{leagueId}/ranking
**Description**: Returns ranking/leaderboard for a league.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID

#### GET /v4/leagues/{leagueId}/me
**Description**: Returns current user information in the league.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID

#### GET /v4/leagues/{leagueId}/me/budget
**Description**: Returns current user's budget information.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID

#### GET /v4/leagues/{leagueId}/squad
**Description**: Returns current user's squad.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID

#### GET /v4/leagues/{leagueId}/lineup
**Description**: Returns current user's lineup.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID

#### GET /v4/leagues/{leagueId}/market
**Description**: Returns transfer market information.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID

#### GET /v4/leagues/{leagueId}/settings
**Description**: Returns league settings.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID

#### GET /v4/leagues/{leagueId}/activitiesFeed
**Description**: Returns activity feed for the league.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID

#### GET /v4/leagues/{leagueId}/players/{playerId}
**Description**: Returns player information within league context.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID
- `playerId` (path): Player ID

#### GET /v4/leagues/{leagueId}/players/{playerId}/performance
**Description**: Returns player performance within league context.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID
- `playerId` (path): Player ID

#### GET /v4/leagues/{leagueId}/players/{playerId}/marketvalue/{timeframe}
**Description**: Returns player market value history within league context.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID
- `playerId` (path): Player ID
- `timeframe` (path): Timeframe for market value

#### GET /v4/leagues/{leagueId}/players/{playerId}/transfers
**Description**: Returns player transfer history within league context.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID
- `playerId` (path): Player ID

#### GET /v4/leagues/{leagueId}/teamcenter/myeleven
**Description**: Returns current user's team information.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID

#### GET /v4/leagues/{leagueId}/user/achievements
**Description**: Returns user achievements in the league.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID

#### GET /v4/leagues/{leagueId}/battles/{type}/users
**Description**: Returns battle information for users.

**Authentication**: Required

**Parameters**:
- `leagueId` (path): League ID
- `type` (path): Battle type

---

### Live Events Endpoints

#### GET /v4/live/eventtypes
**Description**: Returns available live event types.

**Authentication**: Required

**Parameters**: None

---

### User Management Endpoints

#### GET /v4/user/settings
**Description**: Returns user settings.

**Authentication**: Required

**Parameters**: None

---

### Bonus System Endpoints

#### GET /v4/bonus/collect
**Description**: Collects daily bonus for the user.

**Authentication**: Required

**Parameters**: None

---

## 🔍 Common Response Patterns

### Pagination
Many endpoints support pagination with these common parameters:
- `start`: Starting index (default: 0)
- `max`: Maximum results (default: 20)

### Error Responses
All endpoints may return these error formats:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional details"
}
```

### Success Responses
Most endpoints return data directly or wrapped in a container object with descriptive keys.

---

*This reference was generated from harvested API data and provides comprehensive endpoint documentation for AI consumption.*
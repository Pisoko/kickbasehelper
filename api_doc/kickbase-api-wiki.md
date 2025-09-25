# Kickbase API v4 - Comprehensive AI-Readable Documentation

## 📋 Table of Contents
- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Base Configuration](#base-configuration)
- [Endpoint Categories](#endpoint-categories)
- [Data Models](#data-models)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## 🌐 API Overview

### Base Information
- **API Version**: v4 (Only available version - v5, v6, v7 do not exist)
- **Base URL**: `https://api.kickbase.com`
- **Protocol**: HTTPS only
- **Data Format**: JSON
- **Content-Type**: `application/json`

### API Characteristics
- **Total Endpoints**: 53 documented endpoints
- **Authentication**: JWT-based authentication required for most endpoints
- **Rate Limiting**: Present but limits not documented
- **Versioning**: Path-based versioning (`/v4/`)

### Endpoint Categories
1. **Base & Configuration** (2 endpoints)
2. **Challenges** (19 endpoints)
3. **Chat** (2 endpoints)
4. **Competitions** (8 endpoints)
5. **Leagues** (19 endpoints)
6. **Live Events** (1 endpoint)
7. **User Settings** (1 endpoint)
8. **Bonus Collection** (1 endpoint)

## 🔐 Authentication

### Authentication Method
The API uses JWT (JSON Web Token) based authentication with Firebase integration.

### Token Structure
```json
{
  "tkn": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tknex": "2025-09-25T06:52:42Z"
}
```

### Authentication Endpoints
- **Token Refresh**: `GET /v4/chat/refreshtoken`
- **League Selection**: `GET /v4/chat/leagueselection`

### Token Claims
- `uid`: User ID
- `kblid`: Kickbase League IDs (comma-separated)
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp

### Authentication Requirements
- **Public Endpoints**: `/v4/config`, `/v4/base/overview`
- **Authenticated Endpoints**: All league, challenge, and user-specific endpoints
- **Authorization Header**: `Authorization: Bearer {token}`

## ⚙️ Base Configuration

### Configuration Endpoint
`GET /v4/config` - Returns global API configuration

### Key Configuration Fields
```json
{
  "lis": "2025-09-26T18:30:00Z",  // League start time
  "lie": "2025-09-29T16:00:00Z",  // League end time
  "cps": [                        // Competition configurations
    {
      "cpi": "1",                 // Competition ID
      "b": 50000000.0,           // Base budget
      "ntb": 200000000.0,        // New team budget
      "tv": 100000000.0,         // Transfer value
      "mds": 34,                 // Match days
      "lpc": 11,                 // Lineup player count
      "lts": ["4-4-2", "4-2-4"], // Lineup tactics
      "fts": [1, 2, 3, 4]        // Formation types
    }
  ]
}
```

## 📊 Endpoint Categories

### 1. Base & Configuration
- `GET /v4/config` - Global API configuration
- `GET /v4/base/overview` - Base overview information

### 2. Challenges (Fantasy Competitions)
- `GET /v4/challenges/overview` - All available challenges
- `GET /v4/challenges/archive` - Past challenges
- `GET /v4/challenges/recommended` - Recommended challenges
- `GET /v4/challenges/selection` - Challenge selection
- `GET /v4/challenges/{challengeId}/profile` - Challenge details
- `GET /v4/challenges/{challengeId}/ranking` - Challenge rankings
- `GET /v4/challenges/{challengeId}/table` - Manager rankings
- `GET /v4/challenges/{challengeId}/top10` - Top 10 managers
- `GET /v4/challenges/{challengeId}/performance` - Performance data
- `GET /v4/challenges/{challengeId}/favorites` - Favorite managers
- `GET /v4/challenges/{challengeId}/lineup/overview` - Lineup overview
- `GET /v4/challenges/{challengeId}/lineup/selection` - Player selection
- `GET /v4/challenges/{challengeId}/lineup/teams` - Available teams
- `GET /v4/challenges/{challengeId}/lineup/livepitch` - Live lineup
- `POST /v4/challenges/{challengeId}/lineup/fill` - Auto-fill lineup
- `POST /v4/challenges/{challengeId}/lineup/clear` - Clear lineup
- `POST /v4/challenges/favorites` - Add favorite manager
- `DELETE /v4/challenges/favorites/{userId}` - Remove favorite

### 3. Chat & Communication
- `GET /v4/chat/refreshtoken` - Refresh authentication token
- `GET /v4/chat/leagueselection` - Available leagues for chat

### 4. Competitions (Real Football)
- `GET /v4/competitions/{competitionId}/table` - Competition table
- `GET /v4/competitions/{competitionId}/ranking` - Competition ranking
- `GET /v4/competitions/{competitionId}/matchdays` - Match day information
- `GET /v4/competitions/{competitionId}/players` - All players
- `GET /v4/competitions/{competitionId}/players/search` - Search players
- `GET /v4/competitions/{competitionId}/players/{playerId}/performance` - Player performance
- `GET /v4/competitions/{competitionId}/players/{playerId}/marketvalue/{timeframe}` - Market value history
- `GET /v4/competitions/{competitionId}/playercenter/{playerId}` - Player details

### 5. Leagues (User Leagues)
- `GET /v4/leagues/selection` - Available leagues
- `GET /v4/leagues/{leagueId}/overview` - League overview
- `GET /v4/leagues/{leagueId}/ranking` - League ranking
- `GET /v4/leagues/{leagueId}/me` - Current user info
- `GET /v4/leagues/{leagueId}/me/budget` - User budget
- `GET /v4/leagues/{leagueId}/squad` - User squad
- `GET /v4/leagues/{leagueId}/lineup` - Current lineup
- `GET /v4/leagues/{leagueId}/market` - Transfer market
- `GET /v4/leagues/{leagueId}/settings` - League settings
- `GET /v4/leagues/{leagueId}/activitiesFeed` - Activity feed
- `GET /v4/leagues/{leagueId}/players/{playerId}` - Player details
- `GET /v4/leagues/{leagueId}/players/{playerId}/performance` - Player performance
- `GET /v4/leagues/{leagueId}/players/{playerId}/marketvalue/{timeframe}` - Market value
- `GET /v4/leagues/{leagueId}/players/{playerId}/transfers` - Transfer history
- `GET /v4/leagues/{leagueId}/teamcenter/myeleven` - My team
- `GET /v4/leagues/{leagueId}/user/achievements` - User achievements
- `GET /v4/leagues/{leagueId}/battles/{type}/users` - Battle information

### 6. Live Events
- `GET /v4/live/eventtypes` - Available live event types

### 7. User Management
- `GET /v4/user/settings` - User settings

### 8. Bonus System
- `GET /v4/bonus/collect` - Collect daily bonus

## 🏗️ Data Models

### Common Field Patterns
- **IDs**: String format (e.g., "2151182", "7389547")
- **Timestamps**: ISO 8601 format (e.g., "2025-09-26T18:30:00Z")
- **Money Values**: Float format (e.g., 50000000.0)
- **Images**: Relative paths (e.g., "content/file/...")
- **Arrays**: Often contain objects with consistent structure

### Key Data Structures

#### User Object
```json
{
  "ui": "2151182",           // User ID
  "unm": "pisoko",           // Username
  "n": "Display Name",       // Display name
  "isvf": false,            // Is verified flag
  "st": 0                   // Status
}
```

#### Player Object
```json
{
  "i": "10112",             // Player ID
  "n": "Jaquez",            // Player name
  "tid": "9",               // Team ID
  "pos": 4,                 // Position
  "mv": 100000000,          // Market value
  "st": 4,                  // Status
  "ap": 85,                 // Average points
  "t1": 9,                  // Team 1 goals
  "t2": 39                  // Team 2 goals
}
```

#### League Object
```json
{
  "i": "7389547",           // League ID
  "lnm": "Zucchini",        // League name
  "cpi": "1",               // Competition ID
  "cpn": "Bundesliga",      // Competition name
  "dt": "2025-08-21T07:03:48Z", // Date created
  "mgc": 1,                 // Manager count
  "b": 50000000.0,          // Budget
  "ism": true,              // Is manager
  "adm": true               // Is admin
}
```

#### Challenge Object
```json
{
  "ch": "504",              // Challenge ID
  "n": "Challenge Name",    // Challenge name
  "b": 250000000,           // Budget
  "uc": 5975,               // User count
  "lis": "2025-09-26T18:30:00Z", // Start time
  "lie": "2025-09-29T16:00:00Z"  // End time
}
```

## 💡 Usage Examples

### Basic Authentication Flow
```python
import requests

# Get refresh token
response = requests.get('https://api.kickbase.com/v4/chat/refreshtoken')
token_data = response.json()
token = token_data['tkn']

# Use token for authenticated requests
headers = {'Authorization': f'Bearer {token}'}
leagues = requests.get('https://api.kickbase.com/v4/leagues/selection', headers=headers)
```

### Get League Information
```python
# Get league overview
league_id = "7389547"
league_overview = requests.get(
    f'https://api.kickbase.com/v4/leagues/{league_id}/overview',
    headers=headers
).json()

# Get league ranking
ranking = requests.get(
    f'https://api.kickbase.com/v4/leagues/{league_id}/ranking',
    headers=headers
).json()
```

### Search Players
```python
# Search for players in a competition
competition_id = "1"
players = requests.get(
    f'https://api.kickbase.com/v4/competitions/{competition_id}/players/search',
    params={'query': 'Messi', 'start': '0', 'max': '20'},
    headers=headers
).json()
```

### Get Player Performance
```python
# Get player performance data
player_id = "10112"
performance = requests.get(
    f'https://api.kickbase.com/v4/competitions/{competition_id}/players/{player_id}/performance',
    headers=headers
).json()
```

## ⚠️ Error Handling

### Common HTTP Status Codes
- **200**: Success
- **401**: Unauthorized (invalid/expired token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (invalid endpoint/resource)
- **405**: Method Not Allowed
- **500**: Internal Server Error

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

## 🚦 Rate Limiting

### Observed Behavior
- Rate limiting is implemented but specific limits are not documented
- Recommended approach: Implement exponential backoff
- Monitor response headers for rate limit information

### Best Practices
1. Implement request throttling (max 10 requests/second recommended)
2. Use exponential backoff on 429 responses
3. Cache responses when possible
4. Batch requests where supported

## 🔍 API Discovery Notes

### Version Testing Results
- **v4**: ✅ Available (53 endpoints documented)
- **v5**: ❌ Not available (404 responses)
- **v6**: ❌ Not available (404 responses)
- **v7**: ❌ Not available (404 responses)

### Header Compatibility
The API accepts version-specific headers but always returns v4 data:
- `Accept: application/vnd.kickbase.v5+json` → Returns v4 data
- `API-Version: 5` → Returns v4 data
- `X-API-Version: 6` → Returns v4 data

This suggests the API is designed to be backward compatible but only v4 is implemented.

## 📝 Additional Notes

### Image Resources
- All image URLs use relative paths starting with "content/file/"
- Base URL for images: `https://kickbase.b-cdn.net/`
- Supported formats: PNG, JPG, SVG

### Timestamp Format
- All timestamps use ISO 8601 format with UTC timezone
- Format: `YYYY-MM-DDTHH:MM:SSZ`

### ID Formats
- User IDs: Numeric strings (e.g., "2151182")
- League IDs: Numeric strings (e.g., "7389547")
- Player IDs: Numeric strings (e.g., "10112")
- Challenge IDs: Numeric strings (e.g., "504")

### Competition IDs
- Bundesliga: "1"
- Other competitions may have different IDs

---

*This documentation was generated from harvested API data and is intended for AI consumption and understanding of the Kickbase API structure.*
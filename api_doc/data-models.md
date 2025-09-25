# Kickbase API v4 - Data Models & Schemas

## 📋 Table of Contents
- [Core Data Types](#core-data-types)
- [User & Authentication Models](#user--authentication-models)
- [League Models](#league-models)
- [Player Models](#player-models)
- [Challenge Models](#challenge-models)
- [Competition Models](#competition-models)
- [Configuration Models](#configuration-models)
- [Common Patterns](#common-patterns)

## 🔧 Core Data Types

### Basic Types
- **ID**: String representation of numeric ID (e.g., "2151182", "7389547")
- **Timestamp**: ISO 8601 format with UTC timezone (e.g., "2025-09-26T18:30:00Z")
- **Money**: Float representation of currency values (e.g., 50000000.0)
- **Image Path**: Relative path string (e.g., "content/file/competition/1/logo.png")
- **Boolean**: Standard boolean values (true/false)
- **Number**: Integer or float values

### Nullable Fields
Many fields can be null, indicated by `nullable: true` in the schema. Common nullable fields:
- Optional user information
- Performance statistics that may not be available
- Image paths for entities without images

## 👤 User & Authentication Models

### User Object
```json
{
  "ui": "string",           // User ID (required)
  "unm": "string",          // Username (required)
  "n": "string",            // Display name (nullable)
  "isvf": "boolean",        // Is verified flag (default: false)
  "st": "number",           // Status code (nullable)
  "img": "string"           // Profile image path (nullable)
}
```

**Example**:
```json
{
  "ui": "2151182",
  "unm": "pisoko",
  "n": "Display Name",
  "isvf": false,
  "st": 0,
  "img": null
}
```

### Authentication Token
```json
{
  "tkn": "string",          // JWT token (required)
  "tknex": "string"         // Token expiration timestamp (required)
}
```

**Example**:
```json
{
  "tkn": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tknex": "2025-09-25T06:52:42Z"
}
```

### JWT Token Claims
```json
{
  "uid": "string",          // User ID
  "kblid": "string",        // Kickbase League IDs (comma-separated)
  "iat": "number",          // Issued at timestamp
  "exp": "number",          // Expiration timestamp
  "iss": "string",          // Issuer
  "aud": "string"           // Audience
}
```

## 🏆 League Models

### League Object
```json
{
  "i": "string",            // League ID (required)
  "lnm": "string",          // League name (required)
  "cpi": "string",          // Competition ID (required)
  "cpn": "string",          // Competition name (required)
  "dt": "string",           // Date created (ISO 8601)
  "isr": "boolean",         // Is running (nullable)
  "mgc": "number",          // Manager count (required)
  "mid": "string",          // Manager ID (nullable)
  "m": "User",              // Manager object (nullable)
  "gpm": "number",          // Games per matchday (nullable)
  "b": "number",            // Budget (required)
  "mppu": "number",         // Max points per user (nullable)
  "mpst": "number",         // Max points single team (nullable)
  "amd": "number",          // Active matchday (nullable)
  "isp": "boolean",         // Is public (nullable)
  "mgm": "number",          // Max managers (nullable)
  "d": "string",            // Description (nullable)
  "ism": "boolean",         // Is manager (required)
  "adm": "boolean"          // Is admin (required)
}
```

**Example**:
```json
{
  "i": "7389547",
  "lnm": "Zucchini",
  "cpi": "1",
  "cpn": "Bundesliga",
  "dt": "2025-08-21T07:03:48Z",
  "isr": true,
  "mgc": 1,
  "mid": "2151182",
  "m": {
    "ui": "2151182",
    "unm": "pisoko",
    "n": "Display Name",
    "isvf": false,
    "st": 0
  },
  "gpm": 9,
  "b": 50000000.0,
  "mppu": 200000000,
  "mpst": 100000000,
  "amd": 1,
  "isp": false,
  "mgm": 1,
  "d": null,
  "ism": true,
  "adm": true
}
```

### League Ranking Entry
```json
{
  "ui": "string",           // User ID (required)
  "unm": "string",          // Username (required)
  "n": "string",            // Display name (nullable)
  "pos": "number",          // Position in ranking (required)
  "pts": "number",          // Total points (required)
  "tpts": "number",         // Team points (nullable)
  "tv": "number",           // Team value (nullable)
  "img": "string"           // Profile image (nullable)
}
```

## ⚽ Player Models

### Player Object
```json
{
  "i": "string",            // Player ID (required)
  "n": "string",            // Player name (required)
  "tid": "string",          // Team ID (required)
  "pos": "number",          // Position (1=GK, 2=DEF, 3=MID, 4=ATT)
  "mv": "number",           // Market value (required)
  "st": "number",           // Status (required)
  "ap": "number",           // Average points (nullable)
  "t1": "number",           // Team 1 goals (nullable)
  "t2": "number",           // Team 2 goals (nullable)
  "img": "string",          // Player image path (nullable)
  "fn": "string",           // First name (nullable)
  "ln": "string",           // Last name (nullable)
  "age": "number",          // Age (nullable)
  "nat": "string"           // Nationality (nullable)
}
```

**Example**:
```json
{
  "i": "10112",
  "n": "Jaquez",
  "tid": "9",
  "pos": 4,
  "mv": 100000000,
  "st": 4,
  "ap": 85,
  "t1": 9,
  "t2": 39,
  "img": "content/file/player/10112/image.png",
  "fn": "Jaquez",
  "ln": "Player",
  "age": 25,
  "nat": "GER"
}
```

### Player Performance
```json
{
  "md": "number",           // Matchday (required)
  "pts": "number",          // Points scored (required)
  "g": "number",            // Goals (nullable)
  "a": "number",            // Assists (nullable)
  "yc": "number",           // Yellow cards (nullable)
  "rc": "number",           // Red cards (nullable)
  "cs": "number",           // Clean sheets (nullable)
  "mp": "boolean",          // Played (nullable)
  "sub": "boolean"          // Substituted (nullable)
}
```

### Market Value History
```json
{
  "date": "string",         // Date (ISO 8601)
  "value": "number",        // Market value at date
  "change": "number",       // Change from previous value
  "percentage": "number"    // Percentage change
}
```

## 🎯 Challenge Models

### Challenge Object
```json
{
  "ch": "string",           // Challenge ID (required)
  "n": "string",            // Challenge name (required)
  "b": "number",            // Budget (required)
  "uc": "number",           // User count (required)
  "lis": "string",          // Start time (ISO 8601)
  "lie": "string",          // End time (ISO 8601)
  "st": "number",           // Status (required)
  "cpi": "string",          // Competition ID (required)
  "il": "string",           // Image logo path (nullable)
  "d": "string",            // Description (nullable)
  "t": "string",            // Type (nullable)
  "pr": "array"             // Prizes array (nullable)
}
```

**Example**:
```json
{
  "ch": "504",
  "n": "Weekend Challenge",
  "b": 250000000,
  "uc": 5975,
  "lis": "2025-09-26T18:30:00Z",
  "lie": "2025-09-29T16:00:00Z",
  "st": 1,
  "cpi": "1",
  "il": "content/file/challenge/504/logo.png",
  "d": "Weekend fantasy challenge",
  "t": "weekend",
  "pr": [
    {
      "pos": 1,
      "prize": "Premium subscription"
    }
  ]
}
```

### Challenge Ranking Entry
```json
{
  "ui": "string",           // User ID (required)
  "unm": "string",          // Username (required)
  "n": "string",            // Display name (nullable)
  "pos": "number",          // Position (required)
  "pts": "number",          // Points (required)
  "tv": "number",           // Team value (nullable)
  "img": "string"           // Profile image (nullable)
}
```

## 🏟️ Competition Models

### Competition Object
```json
{
  "cpi": "string",          // Competition ID (required)
  "cpn": "string",          // Competition name (required)
  "rcn": "string",          // Region code name (required)
  "rpcn": "string",         // Region parent code name (nullable)
  "rmcn": "string",         // Region main code name (nullable)
  "il": "string",           // Image logo path (nullable)
  "cpt": "string",          // Competition type (nullable)
  "mds": "number",          // Match days count (required)
  "lis": "string",          // Start time (ISO 8601)
  "lie": "string"           // End time (ISO 8601)
}
```

### Team Object
```json
{
  "i": "string",            // Team ID (required)
  "n": "string",            // Team name (required)
  "sn": "string",           // Short name (nullable)
  "il": "string",           // Image logo path (nullable)
  "cpi": "string",          // Competition ID (required)
  "pos": "number",          // Table position (nullable)
  "pts": "number",          // Points (nullable)
  "gf": "number",           // Goals for (nullable)
  "ga": "number"            // Goals against (nullable)
}
```

### Match Object
```json
{
  "i": "string",            // Match ID (required)
  "md": "number",           // Matchday (required)
  "t1": "string",           // Team 1 ID (required)
  "t2": "string",           // Team 2 ID (required)
  "g1": "number",           // Team 1 goals (nullable)
  "g2": "number",           // Team 2 goals (nullable)
  "dt": "string",           // Date/time (ISO 8601)
  "st": "number",           // Status (required)
  "fin": "boolean"          // Finished (required)
}
```

## ⚙️ Configuration Models

### Global Configuration
```json
{
  "lis": "string",          // League start time (ISO 8601)
  "lie": "string",          // League end time (ISO 8601)
  "cps": "array"            // Competition configurations array
}
```

### Competition Configuration
```json
{
  "cpi": "string",          // Competition ID (required)
  "lis": "string",          // Competition start (ISO 8601)
  "lie": "string",          // Competition end (ISO 8601)
  "rcn": "string",          // Region code name (required)
  "rpcn": "string",         // Region parent code name (nullable)
  "rmcn": "string",         // Region main code name (nullable)
  "b": "number",            // Base budget (required)
  "ntb": "number",          // New team budget (required)
  "tv": "number",           // Transfer value (required)
  "cpt": "string",          // Competition type (nullable)
  "il": "string",           // Image logo path (nullable)
  "mds": "number",          // Match days count (required)
  "lts": "array",           // Lineup tactics array (required)
  "lpc": "number",          // Lineup player count (required)
  "fts": "array",           // Formation types array (required)
  "pspt": "number",         // Points per point type (required)
  "bsc": "number"           // Base score (required)
}
```

**Example**:
```json
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
```

## 🔄 Common Patterns

### Pagination Response
```json
{
  "data": "array",          // Array of items
  "total": "number",        // Total count
  "start": "number",        // Start index
  "max": "number"           // Max items per page
}
```

### Error Response
```json
{
  "error": "string",        // Error message
  "code": "string",         // Error code
  "details": "string"       // Additional details (nullable)
}
```

### Success Response Wrapper
```json
{
  "success": "boolean",     // Success flag
  "data": "object",         // Response data
  "message": "string"       // Success message (nullable)
}
```

### Image URL Pattern
All image paths follow this pattern:
- **Relative Path**: `content/file/{type}/{id}/{filename}`
- **Full URL**: `https://kickbase.b-cdn.net/content/file/{type}/{id}/{filename}`

**Types**:
- `player`: Player images
- `team`: Team logos
- `competition`: Competition logos
- `challenge`: Challenge logos
- `user`: User profile images

### ID Patterns
- **User IDs**: 7-digit numeric strings (e.g., "2151182")
- **League IDs**: 7-digit numeric strings (e.g., "7389547")
- **Player IDs**: 5-digit numeric strings (e.g., "10112")
- **Team IDs**: 1-2 digit numeric strings (e.g., "9", "14")
- **Competition IDs**: 1-digit numeric strings (e.g., "1")
- **Challenge IDs**: 3-digit numeric strings (e.g., "504")

### Position Codes
Player positions are encoded as numbers:
- **1**: Goalkeeper (GK)
- **2**: Defender (DEF)
- **3**: Midfielder (MID)
- **4**: Attacker (ATT)

### Status Codes
Various entities use status codes:
- **0**: Inactive/Disabled
- **1**: Active/Enabled
- **2**: Pending
- **3**: Suspended
- **4**: Special status (varies by context)

### Formation Types
Formation types are encoded as numbers:
- **1**: 4-4-2
- **2**: 4-2-4
- **3**: 4-3-3
- **4**: 3-5-2
- **5**: 5-3-2

---

*This data model documentation was extracted from harvested API responses and provides comprehensive schema information for AI consumption and integration.*
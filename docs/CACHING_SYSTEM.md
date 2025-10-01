# Kickbase Helper - Caching System Documentation

## Overview

The Kickbase Helper application implements a comprehensive multi-layer caching system designed to optimize performance, reduce API calls to the Kickbase service, and improve user experience. The system consists of three specialized cache services working together to handle different types of data.

## Architecture

### Core Components

1. **KickbaseDataCacheService** - Caches player and match data from the Kickbase API
2. **ImageCacheService** - Handles player profile image caching with local storage
3. **TeamLogoCacheService** - Manages team logo caching with format optimization
4. **CacheWarmupService** - Orchestrates cache preloading and optimization
5. **Cache Management API** - Provides REST endpoints for cache monitoring and control

### Cache Storage Strategy

- **Memory Cache**: Fast access for frequently used data (Redis-compatible)
- **Disk Cache**: Persistent storage for images and logos
- **TTL Management**: Automatic expiration based on data type and usage patterns

## Cache Services

### 1. KickbaseDataCacheService

**Purpose**: Caches Kickbase API responses to reduce external API calls and improve response times.

**Key Features**:
- Player data caching with 1-hour TTL
- Match data caching with 30-minute TTL
- Automatic cache invalidation
- Memory-efficient storage

**Usage**:
```typescript
import { kickbaseDataCache } from '@/lib/services/KickbaseDataCacheService';

// Cache players data
await kickbaseDataCache.cachePlayer(playerData);

// Retrieve cached players
const players = await kickbaseDataCache.getCachedPlayers();

// Cache matches for a specific matchday
await kickbaseDataCache.cacheMatches(matchesData, spieltag);
```

**Cache Keys**:
- `players`: All player data
- `matches:{spieltag}`: Matches for specific matchday

### 2. ImageCacheService

**Purpose**: Downloads and caches player profile images locally to reduce external image requests.

**Key Features**:
- Automatic image downloading and local storage
- Format optimization (WebP, AVIF support)
- 7-day TTL for cached images
- Fallback to original URL if caching fails

**Usage**:
```typescript
import { imageCacheService } from '@/lib/services/ImageCacheService';

// Cache a player image
const cachedPath = await imageCacheService.getCachedImagePath(imageUrl);

// Cache specific player image
await imageCacheService.cachePlayerImage(playerId, imageUrl);
```

**Storage Location**: `/tmp/kickbase-cache/images/`

### 3. TeamLogoCacheService

**Purpose**: Manages team logo caching with support for multiple image formats.

**Key Features**:
- Multi-format support (PNG, JPG, SVG, WebP)
- Automatic format detection
- Optimized storage structure
- Team-based organization

**Usage**:
```typescript
import { teamLogoCacheService } from '@/lib/services/TeamLogoCacheService';

// Cache team logo
await teamLogoCacheService.cacheLogo(teamId, logoUrl);

// Get cached logo path
const logoPath = await teamLogoCacheService.getCachedLogoPath(teamId);
```

**Storage Location**: `/tmp/kickbase-cache/logos/{teamId}/`

### 4. CacheWarmupService

**Purpose**: Orchestrates cache preloading and provides performance optimization.

**Key Features**:
- Configurable warmup strategies
- Parallel processing for efficiency
- Progress tracking and reporting
- Error handling and retry logic

**Configuration**:
```typescript
interface WarmupConfig {
  includeKickbaseData?: boolean;
  includePlayerImages?: boolean;
  includeTeamLogos?: boolean;
  spieltag?: number;
  maxConcurrency?: number;
}
```

**Usage**:
```typescript
import { cacheWarmupService } from '@/lib/services/CacheWarmupService';

const config: WarmupConfig = {
  includeKickbaseData: true,
  includePlayerImages: true,
  includeTeamLogos: true,
  spieltag: 5
};

const result = await cacheWarmupService.warmupCaches(config);
```

## Cache Management API

### Endpoints

#### GET /api/cache
Returns current cache status and statistics.

**Response**:
```json
{
  "status": "active",
  "timestamp": "2025-10-01T18:11:13.674Z",
  "caches": {
    "data": {
      "entries": 150,
      "memorySize": 2048576,
      "diskSize": 0
    },
    "images": {
      "entries": 45,
      "memorySize": 0,
      "diskSize": 15728640
    },
    "logos": {
      "entries": 18,
      "totalSize": 524288,
      "formats": {
        "png": 12,
        "jpg": 4,
        "svg": 2,
        "webp": 0
      }
    }
  }
}
```

#### GET /api/cache?action=health
Provides cache health assessment and recommendations.

**Response**:
```json
{
  "status": "healthy|degraded|critical",
  "timestamp": "2025-10-01T18:11:20.297Z",
  "issues": ["Cache is empty", "No cached images"],
  "details": {
    "data": {
      "status": "healthy",
      "stats": {
        "memorySize": 2048576,
        "diskSize": 0,
        "totalEntries": 150
      }
    },
    "images": {
      "status": "empty"
    },
    "logos": {
      "status": "incomplete"
    }
  }
}
```

#### GET /api/cache?action=recommendations
Analyzes cache state and provides optimization recommendations.

**Response**:
```json
{
  "timestamp": "2025-10-01T18:11:26.247Z",
  "recommended": true,
  "reasons": [
    "Kickbase data cache is not healthy",
    "Player image cache has few entries"
  ],
  "config": {
    "includePlayerImages": true,
    "includeTeamLogos": true,
    "includeKickbaseData": true,
    "spieltag": 5
  }
}
```

#### POST /api/cache
Performs cache operations (warmup, clear, etc.).

**Warmup Request**:
```json
{
  "action": "warmup",
  "config": {
    "includeKickbaseData": true,
    "includeTeamLogos": true,
    "includePlayerImages": false,
    "spieltag": 5
  }
}
```

**Warmup Response**:
```json
{
  "timestamp": "2025-10-01T18:11:08.310Z",
  "success": true,
  "duration": 2288,
  "results": {
    "playerImages": {
      "success": 0,
      "failed": 0
    },
    "teamLogos": {
      "success": 18,
      "failed": 0
    },
    "kickbaseData": {
      "success": 1,
      "failed": 0
    }
  },
  "errors": []
}
```

## Performance Optimization

### Cache TTL Strategy

| Data Type | TTL | Reasoning |
|-----------|-----|-----------|
| Player Data | 1 hour | Player stats change frequently during match days |
| Match Data | 30 minutes | Live match data needs frequent updates |
| Player Images | 7 days | Profile images rarely change |
| Team Logos | 30 days | Team logos are very stable |

### Memory Management

- **Automatic Cleanup**: Expired entries are automatically removed
- **Memory Limits**: Configurable memory limits prevent excessive usage
- **Disk Cleanup**: Periodic cleanup of disk-based caches
- **Compression**: Images are optimized for size and format

### Performance Metrics

The system tracks:
- Cache hit/miss ratios
- Response time improvements
- Memory usage patterns
- Disk space utilization
- API call reduction percentages

## Testing

### Unit Tests

The caching system includes comprehensive unit tests covering:

- Cache storage and retrieval
- TTL expiration behavior
- Error handling and fallbacks
- Performance benchmarks
- Memory usage validation

**Run Tests**:
```bash
npm test tests/unit/cache-performance.test.ts
```

### Performance Benchmarks

Automated benchmarks measure:
- Cache write performance (target: <10ms)
- Cache read performance (target: <5ms)
- Memory efficiency
- Concurrent access handling

## Monitoring and Debugging

### Logging

All cache operations are logged with structured logging:

```typescript
// Example log output
{
  "level": "info",
  "msg": "Cache operation completed",
  "service": "KickbaseDataCacheService",
  "operation": "set",
  "key": "players",
  "duration": 15,
  "success": true
}
```

### Health Checks

Regular health checks monitor:
- Cache service availability
- Memory usage thresholds
- Disk space availability
- Error rates and patterns

### Metrics Collection

Key metrics tracked:
- Cache hit ratio (target: >80%)
- Average response time reduction
- API call reduction percentage
- Storage efficiency ratios

## Best Practices

### Development

1. **Always check cache first** before making external API calls
2. **Handle cache misses gracefully** with proper fallbacks
3. **Use appropriate TTL values** based on data volatility
4. **Monitor cache performance** regularly
5. **Test cache behavior** in unit and integration tests

### Production

1. **Monitor cache health** using the health endpoint
2. **Set up alerts** for cache degradation
3. **Regular cache warmup** during low-traffic periods
4. **Monitor disk space** for image/logo caches
5. **Review cache hit ratios** and optimize accordingly

### Error Handling

1. **Graceful degradation** when cache is unavailable
2. **Automatic retry logic** for transient failures
3. **Fallback to original sources** when cache fails
4. **Proper error logging** for debugging

## Configuration

### Environment Variables

```bash
# Cache configuration
CACHE_TTL_PLAYERS=3600          # 1 hour
CACHE_TTL_MATCHES=1800          # 30 minutes
CACHE_TTL_IMAGES=604800         # 7 days
CACHE_TTL_LOGOS=2592000         # 30 days

# Storage paths
CACHE_DIR=/tmp/kickbase-cache
IMAGE_CACHE_DIR=/tmp/kickbase-cache/images
LOGO_CACHE_DIR=/tmp/kickbase-cache/logos

# Performance tuning
CACHE_MAX_MEMORY=100MB
CACHE_MAX_CONCURRENT=10
```

### Runtime Configuration

Cache services can be configured at runtime through the management API or service initialization.

## Troubleshooting

### Common Issues

1. **Cache Miss Rate Too High**
   - Check TTL settings
   - Verify cache warmup is running
   - Monitor memory limits

2. **Slow Cache Performance**
   - Check memory usage
   - Verify disk space availability
   - Review concurrent access patterns

3. **Image Cache Failures**
   - Verify network connectivity
   - Check disk permissions
   - Review image URL validity

4. **Memory Usage Issues**
   - Monitor cache size limits
   - Check for memory leaks
   - Review cleanup processes

### Debug Commands

```bash
# Check cache status
curl http://localhost:3000/api/cache

# Get health report
curl "http://localhost:3000/api/cache?action=health"

# Get recommendations
curl "http://localhost:3000/api/cache?action=recommendations"

# Warmup caches
curl -X POST http://localhost:3000/api/cache \
  -H "Content-Type: application/json" \
  -d '{"action":"warmup","config":{"includeKickbaseData":true}}'
```

## Future Enhancements

### Planned Features

1. **Distributed Caching**: Redis cluster support for multi-instance deployments
2. **Cache Analytics**: Detailed usage analytics and optimization suggestions
3. **Smart Prefetching**: Predictive cache loading based on user patterns
4. **Cache Compression**: Advanced compression for large datasets
5. **Cache Synchronization**: Multi-node cache synchronization

### Performance Targets

- Cache hit ratio: >90%
- Response time improvement: >70%
- API call reduction: >80%
- Memory efficiency: <100MB for typical usage

---

*This documentation is maintained alongside the caching system implementation. For the latest updates, refer to the source code and test files.*
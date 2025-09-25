# Kickbase API v4 - Usage Examples & Code Snippets

## 📋 Table of Contents
- [Authentication Examples](#authentication-examples)
- [League Management](#league-management)
- [Player Operations](#player-operations)
- [Challenge Management](#challenge-management)
- [Data Analysis Examples](#data-analysis-examples)
- [Error Handling Patterns](#error-handling-patterns)
- [Rate Limiting & Best Practices](#rate-limiting--best-practices)

## 🔐 Authentication Examples

### Basic Authentication Setup
```python
import requests
import json
from datetime import datetime, timezone

class KickbaseAPI:
    def __init__(self):
        self.base_url = "https://api.kickbase.com"
        self.token = None
        self.token_expiry = None
        self.session = requests.Session()
    
    def authenticate(self):
        """Get authentication token"""
        response = self.session.get(f"{self.base_url}/v4/chat/refreshtoken")
        if response.status_code == 200:
            data = response.json()
            self.token = data['tkn']
            self.token_expiry = datetime.fromisoformat(data['tknex'].replace('Z', '+00:00'))
            self.session.headers.update({'Authorization': f'Bearer {self.token}'})
            return True
        return False
    
    def is_token_valid(self):
        """Check if current token is still valid"""
        if not self.token or not self.token_expiry:
            return False
        return datetime.now(timezone.utc) < self.token_expiry
    
    def ensure_authenticated(self):
        """Ensure we have a valid token"""
        if not self.is_token_valid():
            return self.authenticate()
        return True

# Usage
api = KickbaseAPI()
if api.authenticate():
    print("Successfully authenticated")
else:
    print("Authentication failed")
```

### Token Management with Auto-Refresh
```python
import functools

def require_auth(func):
    """Decorator to ensure authentication before API calls"""
    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        if not self.ensure_authenticated():
            raise Exception("Authentication failed")
        return func(self, *args, **kwargs)
    return wrapper

class KickbaseAPI:
    # ... previous code ...
    
    @require_auth
    def get_config(self):
        """Get API configuration"""
        response = self.session.get(f"{self.base_url}/v4/config")
        return response.json()
    
    @require_auth
    def get_leagues(self):
        """Get available leagues"""
        response = self.session.get(f"{self.base_url}/v4/leagues/selection")
        return response.json()
```

## 🏆 League Management

### Get League Information
```python
class LeagueManager:
    def __init__(self, api):
        self.api = api
    
    def get_league_overview(self, league_id):
        """Get comprehensive league information"""
        response = self.api.session.get(f"{self.api.base_url}/v4/leagues/{league_id}/overview")
        if response.status_code == 200:
            return response.json()
        return None
    
    def get_league_ranking(self, league_id):
        """Get league ranking/leaderboard"""
        response = self.api.session.get(f"{self.api.base_url}/v4/leagues/{league_id}/ranking")
        if response.status_code == 200:
            return response.json()
        return None
    
    def get_my_team(self, league_id):
        """Get current user's team information"""
        response = self.api.session.get(f"{self.api.base_url}/v4/leagues/{league_id}/me")
        if response.status_code == 200:
            return response.json()
        return None
    
    def get_my_budget(self, league_id):
        """Get current user's budget"""
        response = self.api.session.get(f"{self.api.base_url}/v4/leagues/{league_id}/me/budget")
        if response.status_code == 200:
            return response.json()
        return None

# Usage
api = KickbaseAPI()
api.authenticate()
league_manager = LeagueManager(api)

# Get all leagues
leagues = api.get_leagues()
for league in leagues.get('leagues', []):
    print(f"League: {league['lnm']} (ID: {league['i']})")
    
    # Get detailed information
    overview = league_manager.get_league_overview(league['i'])
    ranking = league_manager.get_league_ranking(league['i'])
    
    if overview:
        print(f"  Managers: {overview['mgc']}")
        print(f"  Budget: {overview['b']:,.0f}")
        print(f"  Active Matchday: {overview.get('amd', 'N/A')}")
```

### League Activity Monitoring
```python
def monitor_league_activities(api, league_id, limit=50):
    """Monitor recent activities in a league"""
    response = api.session.get(f"{api.base_url}/v4/leagues/{league_id}/activitiesFeed")
    if response.status_code == 200:
        activities = response.json()
        for activity in activities[:limit]:
            timestamp = activity.get('dt', 'Unknown time')
            user = activity.get('unm', 'Unknown user')
            action = activity.get('action', 'Unknown action')
            print(f"{timestamp}: {user} - {action}")
    return None

# Usage
monitor_league_activities(api, "7389547")
```

## ⚽ Player Operations

### Player Search and Analysis
```python
class PlayerManager:
    def __init__(self, api):
        self.api = api
    
    def search_players(self, competition_id, query, max_results=20):
        """Search for players in a competition"""
        params = {
            'query': query,
            'start': '0',
            'max': str(max_results)
        }
        response = self.api.session.get(
            f"{self.api.base_url}/v4/competitions/{competition_id}/players/search",
            params=params
        )
        if response.status_code == 200:
            return response.json()
        return None
    
    def get_player_performance(self, competition_id, player_id):
        """Get player performance statistics"""
        response = self.api.session.get(
            f"{self.api.base_url}/v4/competitions/{competition_id}/players/{player_id}/performance"
        )
        if response.status_code == 200:
            return response.json()
        return None
    
    def get_player_market_value(self, competition_id, player_id, timeframe="season"):
        """Get player market value history"""
        response = self.api.session.get(
            f"{self.api.base_url}/v4/competitions/{competition_id}/players/{player_id}/marketvalue/{timeframe}"
        )
        if response.status_code == 200:
            return response.json()
        return None
    
    def analyze_player_value(self, competition_id, player_id):
        """Comprehensive player analysis"""
        performance = self.get_player_performance(competition_id, player_id)
        market_value = self.get_player_market_value(competition_id, player_id)
        
        analysis = {
            'player_id': player_id,
            'performance': performance,
            'market_value': market_value,
            'value_trend': None,
            'recommendation': None
        }
        
        # Analyze market value trend
        if market_value and len(market_value) > 1:
            recent_value = market_value[-1]['value']
            previous_value = market_value[-2]['value']
            change = recent_value - previous_value
            analysis['value_trend'] = 'increasing' if change > 0 else 'decreasing' if change < 0 else 'stable'
        
        # Simple recommendation logic
        if performance and analysis['value_trend']:
            avg_points = performance.get('ap', 0)
            if avg_points > 80 and analysis['value_trend'] == 'increasing':
                analysis['recommendation'] = 'strong_buy'
            elif avg_points > 60 and analysis['value_trend'] == 'stable':
                analysis['recommendation'] = 'hold'
            else:
                analysis['recommendation'] = 'consider_selling'
        
        return analysis

# Usage
player_manager = PlayerManager(api)

# Search for players
players = player_manager.search_players("1", "Messi", 10)
if players:
    for player in players.get('players', []):
        print(f"Player: {player['n']} (ID: {player['i']})")
        print(f"  Position: {player['pos']}")
        print(f"  Market Value: {player['mv']:,.0f}")
        print(f"  Average Points: {player.get('ap', 'N/A')}")
        
        # Detailed analysis
        analysis = player_manager.analyze_player_value("1", player['i'])
        print(f"  Recommendation: {analysis['recommendation']}")
        print()
```

### Squad Management
```python
def get_squad_analysis(api, league_id):
    """Analyze current squad composition"""
    response = api.session.get(f"{api.base_url}/v4/leagues/{league_id}/squad")
    if response.status_code != 200:
        return None
    
    squad = response.json()
    analysis = {
        'total_players': len(squad.get('players', [])),
        'total_value': 0,
        'position_distribution': {'GK': 0, 'DEF': 0, 'MID': 0, 'ATT': 0},
        'top_performers': [],
        'underperformers': []
    }
    
    position_map = {1: 'GK', 2: 'DEF', 3: 'MID', 4: 'ATT'}
    
    for player in squad.get('players', []):
        analysis['total_value'] += player.get('mv', 0)
        pos = position_map.get(player.get('pos'), 'Unknown')
        analysis['position_distribution'][pos] += 1
        
        # Categorize by performance
        avg_points = player.get('ap', 0)
        if avg_points > 80:
            analysis['top_performers'].append(player)
        elif avg_points < 40:
            analysis['underperformers'].append(player)
    
    return analysis

# Usage
squad_analysis = get_squad_analysis(api, "7389547")
if squad_analysis:
    print(f"Squad Analysis:")
    print(f"  Total Players: {squad_analysis['total_players']}")
    print(f"  Total Value: {squad_analysis['total_value']:,.0f}")
    print(f"  Position Distribution: {squad_analysis['position_distribution']}")
    print(f"  Top Performers: {len(squad_analysis['top_performers'])}")
    print(f"  Underperformers: {len(squad_analysis['underperformers'])}")
```

## 🎯 Challenge Management

### Challenge Discovery and Participation
```python
class ChallengeManager:
    def __init__(self, api):
        self.api = api
    
    def get_available_challenges(self):
        """Get all available challenges"""
        response = self.api.session.get(f"{self.api.base_url}/v4/challenges/overview")
        if response.status_code == 200:
            return response.json()
        return None
    
    def get_recommended_challenges(self):
        """Get recommended challenges"""
        response = self.api.session.get(f"{self.api.base_url}/v4/challenges/recommended")
        if response.status_code == 200:
            return response.json()
        return None
    
    def get_challenge_ranking(self, challenge_id):
        """Get challenge leaderboard"""
        response = self.api.session.get(f"{self.api.base_url}/v4/challenges/{challenge_id}/ranking")
        if response.status_code == 200:
            return response.json()
        return None
    
    def analyze_challenge_opportunity(self, challenge_id):
        """Analyze if a challenge is worth joining"""
        ranking = self.get_challenge_ranking(challenge_id)
        if not ranking:
            return None
        
        participants = len(ranking.get('ranking', []))
        top_score = ranking['ranking'][0]['pts'] if ranking.get('ranking') else 0
        
        analysis = {
            'challenge_id': challenge_id,
            'participants': participants,
            'top_score': top_score,
            'competition_level': 'high' if participants > 1000 else 'medium' if participants > 100 else 'low',
            'recommended': participants < 500  # Less competition
        }
        
        return analysis

# Usage
challenge_manager = ChallengeManager(api)

# Get and analyze challenges
challenges = challenge_manager.get_available_challenges()
if challenges:
    for challenge in challenges.get('chs', []):
        print(f"Challenge: {challenge['n']} (ID: {challenge['ch']})")
        print(f"  Budget: {challenge['b']:,.0f}")
        print(f"  Participants: {challenge['uc']}")
        print(f"  Start: {challenge['lis']}")
        print(f"  End: {challenge['lie']}")
        
        # Analyze opportunity
        analysis = challenge_manager.analyze_challenge_opportunity(challenge['ch'])
        if analysis:
            print(f"  Competition Level: {analysis['competition_level']}")
            print(f"  Recommended: {'Yes' if analysis['recommended'] else 'No'}")
        print()
```

### Lineup Management for Challenges
```python
def manage_challenge_lineup(api, challenge_id):
    """Manage lineup for a specific challenge"""
    # Get current lineup
    response = api.session.get(f"{api.base_url}/v4/challenges/{challenge_id}/lineup/overview")
    if response.status_code != 200:
        return None
    
    lineup = response.json()
    
    # Auto-fill lineup if empty
    if not lineup.get('players'):
        fill_response = api.session.post(f"{api.base_url}/v4/challenges/{challenge_id}/lineup/fill")
        if fill_response.status_code == 200:
            print("Lineup auto-filled successfully")
        else:
            print("Failed to auto-fill lineup")
    
    # Get updated lineup
    response = api.session.get(f"{api.base_url}/v4/challenges/{challenge_id}/lineup/overview")
    if response.status_code == 200:
        updated_lineup = response.json()
        return updated_lineup
    
    return None

# Usage
lineup = manage_challenge_lineup(api, "504")
if lineup:
    print("Current lineup:")
    for player in lineup.get('players', []):
        print(f"  {player['n']} - Position: {player['pos']}")
```

## 📊 Data Analysis Examples

### League Performance Analysis
```python
import pandas as pd
from datetime import datetime, timedelta

def analyze_league_performance(api, league_id, days_back=30):
    """Analyze league performance over time"""
    # Get league ranking
    ranking_response = api.session.get(f"{api.base_url}/v4/leagues/{league_id}/ranking")
    if ranking_response.status_code != 200:
        return None
    
    ranking = ranking_response.json()
    
    # Get activities for trend analysis
    activities_response = api.session.get(f"{api.base_url}/v4/leagues/{league_id}/activitiesFeed")
    activities = activities_response.json() if activities_response.status_code == 200 else []
    
    analysis = {
        'league_id': league_id,
        'total_managers': len(ranking.get('ranking', [])),
        'top_performers': [],
        'recent_activities': len(activities),
        'performance_distribution': {'high': 0, 'medium': 0, 'low': 0}
    }
    
    # Analyze performance distribution
    for manager in ranking.get('ranking', []):
        points = manager.get('pts', 0)
        if points > 1000:
            analysis['performance_distribution']['high'] += 1
        elif points > 500:
            analysis['performance_distribution']['medium'] += 1
        else:
            analysis['performance_distribution']['low'] += 1
        
        # Track top performers
        if len(analysis['top_performers']) < 5:
            analysis['top_performers'].append({
                'username': manager.get('unm'),
                'points': points,
                'position': manager.get('pos')
            })
    
    return analysis

# Usage
performance = analyze_league_performance(api, "7389547")
if performance:
    print("League Performance Analysis:")
    print(f"  Total Managers: {performance['total_managers']}")
    print(f"  Recent Activities: {performance['recent_activities']}")
    print(f"  Performance Distribution: {performance['performance_distribution']}")
    print("  Top Performers:")
    for performer in performance['top_performers']:
        print(f"    {performer['position']}. {performer['username']} - {performer['points']} pts")
```

### Market Value Tracking
```python
def track_market_trends(api, competition_id, player_ids, timeframe="season"):
    """Track market value trends for multiple players"""
    trends = {}
    
    for player_id in player_ids:
        response = api.session.get(
            f"{api.base_url}/v4/competitions/{competition_id}/players/{player_id}/marketvalue/{timeframe}"
        )
        
        if response.status_code == 200:
            market_data = response.json()
            if market_data:
                current_value = market_data[-1]['value']
                initial_value = market_data[0]['value']
                change = current_value - initial_value
                percentage_change = (change / initial_value) * 100 if initial_value > 0 else 0
                
                trends[player_id] = {
                    'current_value': current_value,
                    'initial_value': initial_value,
                    'change': change,
                    'percentage_change': percentage_change,
                    'trend': 'up' if change > 0 else 'down' if change < 0 else 'stable'
                }
    
    return trends

# Usage
player_ids = ["10112", "10113", "10114"]  # Example player IDs
trends = track_market_trends(api, "1", player_ids)

print("Market Value Trends:")
for player_id, trend in trends.items():
    print(f"Player {player_id}:")
    print(f"  Current Value: {trend['current_value']:,.0f}")
    print(f"  Change: {trend['change']:+,.0f} ({trend['percentage_change']:+.1f}%)")
    print(f"  Trend: {trend['trend']}")
    print()
```

## ⚠️ Error Handling Patterns

### Robust API Client
```python
import time
import random
from requests.exceptions import RequestException

class RobustKickbaseAPI(KickbaseAPI):
    def __init__(self, max_retries=3, base_delay=1):
        super().__init__()
        self.max_retries = max_retries
        self.base_delay = base_delay
    
    def make_request(self, method, url, **kwargs):
        """Make request with retry logic and error handling"""
        for attempt in range(self.max_retries):
            try:
                response = self.session.request(method, url, **kwargs)
                
                # Handle rate limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 60))
                    print(f"Rate limited. Waiting {retry_after} seconds...")
                    time.sleep(retry_after)
                    continue
                
                # Handle server errors with exponential backoff
                if response.status_code >= 500:
                    delay = self.base_delay * (2 ** attempt) + random.uniform(0, 1)
                    print(f"Server error {response.status_code}. Retrying in {delay:.1f} seconds...")
                    time.sleep(delay)
                    continue
                
                # Handle authentication errors
                if response.status_code == 401:
                    print("Authentication failed. Attempting to re-authenticate...")
                    if self.authenticate():
                        continue
                    else:
                        raise Exception("Re-authentication failed")
                
                return response
                
            except RequestException as e:
                if attempt == self.max_retries - 1:
                    raise e
                delay = self.base_delay * (2 ** attempt)
                print(f"Request failed: {e}. Retrying in {delay} seconds...")
                time.sleep(delay)
        
        raise Exception(f"Max retries ({self.max_retries}) exceeded")
    
    def safe_get(self, endpoint, **kwargs):
        """Safe GET request with error handling"""
        try:
            response = self.make_request('GET', f"{self.base_url}{endpoint}", **kwargs)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Request failed with status {response.status_code}: {response.text}")
                return None
        except Exception as e:
            print(f"Error making request to {endpoint}: {e}")
            return None

# Usage
robust_api = RobustKickbaseAPI()
robust_api.authenticate()

# Safe API calls
config = robust_api.safe_get("/v4/config")
leagues = robust_api.safe_get("/v4/leagues/selection")
```

## 🚦 Rate Limiting & Best Practices

### Request Throttling
```python
import time
from collections import deque

class ThrottledKickbaseAPI(RobustKickbaseAPI):
    def __init__(self, requests_per_second=5, **kwargs):
        super().__init__(**kwargs)
        self.requests_per_second = requests_per_second
        self.request_times = deque()
    
    def throttle_request(self):
        """Implement request throttling"""
        now = time.time()
        
        # Remove old requests outside the time window
        while self.request_times and self.request_times[0] <= now - 1:
            self.request_times.popleft()
        
        # Check if we need to wait
        if len(self.request_times) >= self.requests_per_second:
            sleep_time = 1 - (now - self.request_times[0])
            if sleep_time > 0:
                time.sleep(sleep_time)
        
        # Record this request
        self.request_times.append(time.time())
    
    def make_request(self, method, url, **kwargs):
        """Make throttled request"""
        self.throttle_request()
        return super().make_request(method, url, **kwargs)

# Usage
throttled_api = ThrottledKickbaseAPI(requests_per_second=3)
throttled_api.authenticate()

# Batch operations with automatic throttling
league_ids = ["7389547", "7389548", "7389549"]
for league_id in league_ids:
    overview = throttled_api.safe_get(f"/v4/leagues/{league_id}/overview")
    ranking = throttled_api.safe_get(f"/v4/leagues/{league_id}/ranking")
    # Requests are automatically throttled
```

### Caching Strategy
```python
import pickle
import os
from datetime import datetime, timedelta

class CachedKickbaseAPI(ThrottledKickbaseAPI):
    def __init__(self, cache_dir="cache", cache_duration_minutes=30, **kwargs):
        super().__init__(**kwargs)
        self.cache_dir = cache_dir
        self.cache_duration = timedelta(minutes=cache_duration_minutes)
        os.makedirs(cache_dir, exist_ok=True)
    
    def get_cache_path(self, endpoint):
        """Get cache file path for endpoint"""
        safe_endpoint = endpoint.replace('/', '_').replace('?', '_').replace('&', '_')
        return os.path.join(self.cache_dir, f"{safe_endpoint}.cache")
    
    def is_cache_valid(self, cache_path):
        """Check if cache file is still valid"""
        if not os.path.exists(cache_path):
            return False
        
        cache_time = datetime.fromtimestamp(os.path.getmtime(cache_path))
        return datetime.now() - cache_time < self.cache_duration
    
    def get_from_cache(self, endpoint):
        """Get data from cache if valid"""
        cache_path = self.get_cache_path(endpoint)
        if self.is_cache_valid(cache_path):
            try:
                with open(cache_path, 'rb') as f:
                    return pickle.load(f)
            except:
                pass
        return None
    
    def save_to_cache(self, endpoint, data):
        """Save data to cache"""
        cache_path = self.get_cache_path(endpoint)
        try:
            with open(cache_path, 'wb') as f:
                pickle.dump(data, f)
        except:
            pass
    
    def cached_get(self, endpoint, use_cache=True, **kwargs):
        """GET request with caching"""
        if use_cache:
            cached_data = self.get_from_cache(endpoint)
            if cached_data is not None:
                return cached_data
        
        data = self.safe_get(endpoint, **kwargs)
        if data is not None and use_cache:
            self.save_to_cache(endpoint, data)
        
        return data

# Usage
cached_api = CachedKickbaseAPI(cache_duration_minutes=60)
cached_api.authenticate()

# First call hits the API
config = cached_api.cached_get("/v4/config")

# Second call uses cache
config_cached = cached_api.cached_get("/v4/config")  # Returns cached data

# Force fresh data
config_fresh = cached_api.cached_get("/v4/config", use_cache=False)
```

---

*These usage examples provide practical patterns for integrating with the Kickbase API, including authentication, data retrieval, analysis, and best practices for robust API consumption.*
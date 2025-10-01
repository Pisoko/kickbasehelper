'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  RefreshCw, 
  Trash2, 
  Download, 
  Activity, 
  HardDrive, 
  Image, 
  Database,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

// Inline UI Components
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)}>
    {children}
  </h3>
);

const CardDescription = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("text-sm text-muted-foreground", className)}>
    {children}
  </p>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("p-6 pt-0", className)}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default', className = '' }: { 
  children: React.ReactNode; 
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'; 
  className?: string;
}) => {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border border-input bg-background hover:bg-accent hover:text-accent-foreground"
  };
  
  return (
    <div className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      variants[variant],
      className
    )}>
      {children}
    </div>
  );
};

const Progress = ({ value, className = '' }: { value: number; className?: string }) => (
  <div className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}>
    <div 
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
);

const Alert = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
    className
  )}>
    {children}
  </div>
);

const AlertDescription = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("text-sm [&_p]:leading-relaxed", className)}>
    {children}
  </div>
);

interface CacheStats {
  status: string;
  timestamp: string;
  caches: {
    data: {
      entries: number;
      memorySize: number;
      diskSize: number;
    };
    images: {
      entries: number;
      memorySize: number;
      diskSize: number;
    };
    logos: {
      entries: number;
      totalSize: number;
      formats: Record<string, number>;
    };
  };
}

interface CacheHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  issues: string[];
  details: {
    data: {
      status: string;
      stats: any;
      issues: string[];
    };
    images: { status: string };
    logos: { status: string };
  };
}

interface WarmupRecommendations {
  recommended: boolean;
  reasons: string[];
  config: {
    includePlayerImages: boolean;
    includeTeamLogos: boolean;
    includeKickbaseData: boolean;
    spieltag: number;
  };
}

export default function CacheManagement() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [cacheHealth, setCacheHealth] = useState<CacheHealth | null>(null);
  const [recommendations, setRecommendations] = useState<WarmupRecommendations | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Load cache data
  const loadCacheData = async () => {
    setLoading(true);
    try {
      const [statsRes, healthRes, recRes] = await Promise.all([
        fetch('/api/cache?action=status'),
        fetch('/api/cache?action=health'),
        fetch('/api/cache?action=recommendations')
      ]);

      if (statsRes.ok) setCacheStats(await statsRes.json());
      if (healthRes.ok) setCacheHealth(await healthRes.json());
      if (recRes.ok) setRecommendations(await recRes.json());
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load cache data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Perform cache action
  const performCacheAction = async (action: string, params: any = {}) => {
    setLoading(true);
    try {
      const response = await fetch('/api/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`${action} completed:`, result);
        await loadCacheData(); // Refresh data
      } else {
        console.error(`${action} failed:`, await response.text());
      }
    } catch (error) {
      console.error(`${action} error:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Clear cache
  const clearCache = async (type: string) => {
    if (confirm(`Are you sure you want to clear ${type} cache?`)) {
      await performCacheAction('clear', { type });
    }
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  useEffect(() => {
    loadCacheData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadCacheData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cache Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage application caching for optimal performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button 
            onClick={loadCacheData} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status */}
      {cacheHealth && (
        <Alert className={`border-l-4 ${
          cacheHealth.status === 'healthy' ? 'border-l-green-500' : 
          cacheHealth.status === 'degraded' ? 'border-l-yellow-500' : 'border-l-red-500'
        }`}>
          <div className="flex items-center gap-2">
            {getStatusIcon(cacheHealth.status)}
            <AlertDescription>
              <span className={`font-medium ${getStatusColor(cacheHealth.status)}`}>
                Cache Status: {cacheHealth.status.toUpperCase()}
              </span>
              {cacheHealth.issues.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm">Issues detected:</p>
                  <ul className="text-sm list-disc list-inside mt-1">
                    {cacheHealth.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Recommendations */}
      {recommendations?.recommended && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Cache Warmup Recommended</p>
                <p className="text-sm mt-1">
                  {recommendations.reasons.join(', ')}
                </p>
              </div>
              <Button 
                onClick={() => performCacheAction('warmup', recommendations.config)}
                disabled={loading}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Warmup Now
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="data">Data Cache</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="logos">Team Logos</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {cacheStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Data Cache Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Cache</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cacheStats.caches.data.entries}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(cacheStats.caches.data.memorySize + cacheStats.caches.data.diskSize)}
                  </p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs">
                      <span>Memory: {formatBytes(cacheStats.caches.data.memorySize)}</span>
                      <span>Disk: {formatBytes(cacheStats.caches.data.diskSize)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Images Cache Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Player Images</CardTitle>
                  <Image className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cacheStats.caches.images.entries}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(cacheStats.caches.images.memorySize + cacheStats.caches.images.diskSize)}
                  </p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs">
                      <span>Memory: {formatBytes(cacheStats.caches.images.memorySize)}</span>
                      <span>Disk: {formatBytes(cacheStats.caches.images.diskSize)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logos Cache Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Logos</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cacheStats.caches.logos.entries}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(cacheStats.caches.logos.totalSize)}
                  </p>
                  <div className="mt-2 flex gap-1">
                    {Object.entries(cacheStats.caches.logos.formats).map(([format, count]) => (
                      <Badge key={format} variant="secondary" className="text-xs">
                        {format}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Warmup Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Cache Warmup</CardTitle>
                <CardDescription>
                  Preload data and assets to improve performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => performCacheAction('preload', { type: 'current' })}
                  disabled={loading}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Warmup Current Matchday
                </Button>
                <Button 
                  onClick={() => performCacheAction('preload', { type: 'next' })}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Warmup Next Matchday
                </Button>
                <Button 
                  onClick={() => performCacheAction('preload', { type: 'logos' })}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Preload Team Logos
                </Button>
              </CardContent>
            </Card>

            {/* Cleanup Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Cache Cleanup</CardTitle>
                <CardDescription>
                  Clear expired entries and manage storage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => performCacheAction('cleanup')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Cleanup Expired
                </Button>
                <Button 
                  onClick={() => clearCache('data')}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Data Cache
                </Button>
                <Button 
                  onClick={() => clearCache('images')}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Image Cache
                </Button>
                <Button 
                  onClick={() => clearCache('all')}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Caches
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Individual cache tabs would go here */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Kickbase Data Cache</CardTitle>
              <CardDescription>
                Cached player data, matches, and league information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cacheStats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Total Entries</p>
                      <p className="text-2xl font-bold">{cacheStats.caches.data.entries}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Size</p>
                      <p className="text-2xl font-bold">
                        {formatBytes(cacheStats.caches.data.memorySize + cacheStats.caches.data.diskSize)}
                      </p>
                    </div>
                  </div>
                  <Progress value={75} className="w-full" />
                  <p className="text-xs text-muted-foreground">
                    Cache utilization: 75% of maximum capacity
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Player Images Cache</CardTitle>
              <CardDescription>
                Cached player profile images and avatars
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cacheStats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Cached Images</p>
                      <p className="text-2xl font-bold">{cacheStats.caches.images.entries}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Storage Used</p>
                      <p className="text-2xl font-bold">
                        {formatBytes(cacheStats.caches.images.memorySize + cacheStats.caches.images.diskSize)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logos">
          <Card>
            <CardHeader>
              <CardTitle>Team Logos Cache</CardTitle>
              <CardDescription>
                Cached Bundesliga team logos and emblems
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cacheStats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Team Logos</p>
                      <p className="text-2xl font-bold">{cacheStats.caches.logos.entries}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Size</p>
                      <p className="text-2xl font-bold">
                        {formatBytes(cacheStats.caches.logos.totalSize)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Formats</p>
                    <div className="flex gap-2">
                      {Object.entries(cacheStats.caches.logos.formats).map(([format, count]) => (
                        <Badge key={format} variant="outline">
                          {format.toUpperCase()}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
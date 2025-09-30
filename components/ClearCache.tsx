'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { getCacheInfo, clearPlayerDataCache, clearPlayerImagesCache } from '@/lib/cache';
import { apiCache } from '@/lib/apiCache';

interface CacheStats {
  playerDataCached: boolean;
  playerImagesCached: boolean;
  playerDataAge?: number;
  playerImagesAge?: number;
  localStorageSize: number;
  sessionStorageSize: number;
  apiCacheSize: number;
}

export default function ClearCache() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && isOpen) {
      updateCacheStats();
    }
  }, [isClient, isOpen]);

  const updateCacheStats = () => {
    if (!isClient) return;

    try {
      const cacheInfo = getCacheInfo();
      const apiStats = apiCache.getStats();
      
      // Calculate localStorage size
      let localStorageSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length + key.length;
        }
      }

      // Calculate sessionStorage size
      let sessionStorageSize = 0;
      for (let key in sessionStorage) {
        if (sessionStorage.hasOwnProperty(key)) {
          sessionStorageSize += sessionStorage[key].length + key.length;
        }
      }

      setCacheStats({
        ...cacheInfo,
        localStorageSize: Math.round(localStorageSize / 1024), // KB
        sessionStorageSize: Math.round(sessionStorageSize / 1024), // KB
        apiCacheSize: apiStats.size,
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
    }
  };

  const clearAllCaches = async () => {
    if (!isClient) return;

    setIsClearing(true);
    setClearResult(null);

    try {
      let clearedItems: string[] = [];

      // Clear localStorage caches
      clearPlayerDataCache();
      clearPlayerImagesCache();
      
      // Clear RefreshButton cooldown
      localStorage.removeItem('refresh-button-last-click');
      
      // Clear any other localStorage items that might be cache-related
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('cache') || key.includes('kickbase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
        clearedItems.push(`localStorage (${keysToRemove.length} Einträge)`);
      }

      // Clear sessionStorage
      const sessionKeys = Object.keys(sessionStorage);
      if (sessionKeys.length > 0) {
        sessionStorage.clear();
        clearedItems.push(`sessionStorage (${sessionKeys.length} Einträge)`);
      }

      // Clear API cache
      const apiStats = apiCache.getStats();
      if (apiStats.size > 0) {
        apiCache.clear();
        clearedItems.push(`API-Cache (${apiStats.size} Einträge)`);
      }

      // Clear Service Worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        if (cacheNames.length > 0) {
          clearedItems.push(`Service Worker Cache (${cacheNames.length} Caches)`);
        }
      }

      // Force page reload to clear any remaining in-memory caches
      setTimeout(() => {
        window.location.reload();
      }, 1500);

      setClearResult(`✅ Cache erfolgreich geleert: ${clearedItems.join(', ')}`);
      
    } catch (error) {
      console.error('Error clearing caches:', error);
      setClearResult('❌ Fehler beim Löschen des Caches');
    } finally {
      setIsClearing(false);
      updateCacheStats();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isClient) {
    return null;
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        title="Cache löschen"
      >
        <Trash2 size={16} />
        <span className="hidden sm:inline">Cache löschen</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-orange-500" size={24} />
                <h2 className="text-lg font-semibold">Cache löschen</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
                disabled={isClearing}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Dies löscht alle zwischengespeicherten Daten und lädt die Seite neu.
                </p>

                {/* Cache Statistics */}
                {cacheStats && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h3 className="font-medium mb-3">Aktuelle Cache-Größe:</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>localStorage:</span>
                        <span className="font-mono">{formatBytes(cacheStats.localStorageSize * 1024)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>sessionStorage:</span>
                        <span className="font-mono">{formatBytes(cacheStats.sessionStorageSize * 1024)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>API-Cache:</span>
                        <span className="font-mono">{cacheStats.apiCacheSize} Einträge</span>
                      </div>
                      {cacheStats.playerDataCached && (
                        <div className="flex justify-between">
                          <span>Spielerdaten:</span>
                          <span className="text-green-600">
                            {cacheStats.playerDataAge}h alt
                          </span>
                        </div>
                      )}
                      {cacheStats.playerImagesCached && (
                        <div className="flex justify-between">
                          <span>Spielerbilder:</span>
                          <span className="text-green-600">
                            {cacheStats.playerImagesAge}h alt
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-orange-500 mt-0.5" size={16} />
                    <div className="text-sm">
                      <p className="font-medium text-orange-800 mb-1">Achtung:</p>
                      <ul className="text-orange-700 space-y-1">
                        <li>• Alle gespeicherten Daten werden gelöscht</li>
                        <li>• Die Seite wird automatisch neu geladen</li>
                        <li>• Daten müssen erneut vom Server geladen werden</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Result Message */}
                {clearResult && (
                  <div className={`rounded-lg p-4 mb-4 ${
                    clearResult.includes('✅') 
                      ? 'bg-green-50 border border-green-200 text-green-800' 
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-start gap-2">
                      {clearResult.includes('✅') ? (
                        <CheckCircle size={16} className="mt-0.5" />
                      ) : (
                        <AlertTriangle size={16} className="mt-0.5" />
                      )}
                      <p className="text-sm">{clearResult}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  disabled={isClearing}
                >
                  Abbrechen
                </button>
                <button
                  onClick={clearAllCaches}
                  disabled={isClearing}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isClearing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Lösche...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Cache löschen
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
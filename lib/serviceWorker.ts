/**
 * Service Worker registration and management utilities
 * Provides functions to register, update, and manage the service worker
 */

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isActive: boolean;
  needsUpdate: boolean;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            console.log('New service worker available');
            // You could show a notification to the user here
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      console.log('Service Worker unregistered:', result);
      return result;
    }
    return false;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Get service worker status
 */
export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  const status: ServiceWorkerStatus = {
    isSupported: false,
    isRegistered: false,
    isActive: false,
    needsUpdate: false,
  };

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return status;
  }

  status.isSupported = true;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      status.isRegistered = true;
      status.isActive = !!registration.active;
      status.needsUpdate = !!registration.waiting;
    }
  } catch (error) {
    console.error('Error getting service worker status:', error);
  }

  return status;
}

/**
 * Update the service worker
 */
export async function updateServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      console.log('Service Worker update triggered');
    }
  } catch (error) {
    console.error('Service Worker update failed:', error);
  }
}

/**
 * Skip waiting for new service worker
 */
export async function skipWaiting(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  } catch (error) {
    console.error('Skip waiting failed:', error);
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Clear service worker caches
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.active) {
        registration.active.postMessage({ type: 'CLEAR_CACHE' });
      }
    }

    // Clear browser caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }

    console.log('All caches cleared');
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}

/**
 * Get cache storage usage
 */
export async function getCacheStorageUsage(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> {
  if (typeof window === 'undefined' || !('navigator' in window) || !('storage' in navigator)) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      usage,
      quota,
      percentage,
    };
  } catch (error) {
    console.error('Error getting storage usage:', error);
    return null;
  }
}

/**
 * Hook for React components to use service worker
 */
export function useServiceWorker() {
  const [status, setStatus] = React.useState<ServiceWorkerStatus>({
    isSupported: false,
    isRegistered: false,
    isActive: false,
    needsUpdate: false,
  });

  React.useEffect(() => {
    let mounted = true;

    const updateStatus = async () => {
      const newStatus = await getServiceWorkerStatus();
      if (mounted) {
        setStatus(newStatus);
      }
    };

    // Initial status check
    updateStatus();

    // Register service worker
    registerServiceWorker().then(() => {
      if (mounted) {
        updateStatus();
      }
    });

    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', updateStatus);
    }

    return () => {
      mounted = false;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', updateStatus);
      }
    };
  }, []);

  return {
    status,
    register: registerServiceWorker,
    unregister: unregisterServiceWorker,
    update: updateServiceWorker,
    skipWaiting,
    clearCaches: clearAllCaches,
    getCacheUsage: getCacheStorageUsage,
  };
}

// Import React for the hook
import React from 'react';
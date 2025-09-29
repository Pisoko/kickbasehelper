'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '../lib/serviceWorker';

/**
 * Service Worker Provider Component
 * Registers the service worker when the app loads
 */
export default function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker on mount
    if (typeof window !== 'undefined') {
      registerServiceWorker().catch(console.error);
    }
  }, []);

  return <>{children}</>;
}
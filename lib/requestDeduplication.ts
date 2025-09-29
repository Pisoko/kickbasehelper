/**
 * Request deduplication utility to prevent multiple simultaneous requests to the same endpoint
 * This helps optimize performance by avoiding redundant API calls
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private readonly maxAge = 5000; // 5 seconds max age for pending requests

  /**
   * Deduplicate requests by URL and options
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Clean up old pending requests
    this.cleanup();

    // Check if we already have a pending request for this key
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing.promise;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Remove from pending requests when done
      this.pendingRequests.delete(key);
    });

    // Store the pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Clean up old pending requests
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.maxAge) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    this.cleanup();
    return this.pendingRequests.size;
  }
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Helper function to create a deduplication key from URL and options
 */
export function createRequestKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  return `${method}:${url}:${body}`;
}

/**
 * Optimized fetch function with request deduplication
 */
export async function optimizedFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const key = createRequestKey(url, options);
  
  return requestDeduplicator.deduplicate(key, async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  });
}
// Simple in-memory cache with TTL for Clover API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number = 500; // Maximum number of entries

  // Generate cache key from parameters
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  // Get cached value if not expired
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      console.log(`🗑️ [CACHE] Expired and removed: ${key} (age: ${Math.round(age / 1000)}s)`);
      return null;
    }

    console.log(`✅ [CACHE HIT] Key: ${key} (age: ${Math.round(age / 1000)}s)`);
    return entry.data as T;
  }

  // Set cache value with TTL
  set<T>(key: string, data: T, ttlMs: number = 600000): void {
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        console.log(`🗑️ [CACHE] Size limit reached, removed oldest: ${oldestKey}`);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });

    console.log(`💾 [CACHE SET] Key: ${key}, TTL: ${Math.round(ttlMs / 1000)}s`);
  }

  // Clear specific cache entry
  invalidate(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ [CACHE] Invalidated: ${key}`);
    }
    return deleted;
  }

  // Clear all cache entries
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ [CACHE] Cleared all ${size} entries`);
  }

  // Clear cache entries matching a pattern
  clearPattern(pattern: string): number {
    let count = 0;
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      console.log(`🗑️ [CACHE] Cleared ${count} entries matching pattern: ${pattern}`);
    }
    return count;
  }

  // Get cache statistics
  getStats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 [CACHE] Cleanup removed ${removed} expired entries`);
    }

    return removed;
  }
}

// Export singleton instance
export const ordersCache = new SimpleCache();

// Auto-cleanup every 5 minutes
setInterval(() => {
  ordersCache.cleanup();
}, 5 * 60 * 1000);

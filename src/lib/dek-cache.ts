/**
 * In-memory cache for Data Encryption Keys (DEK)
 *
 * DEKs are cached in memory for the duration of a user's session.
 * They are never persisted to disk or database.
 *
 * The cache has a TTL of 7 days (matching the session cookie lifetime).
 */

interface CacheEntry {
  dek: Buffer;
  expiresAt: number; // Unix timestamp in milliseconds
}

// Cache storage (in-memory, process-scoped)
const dekCache = new Map<string, CacheEntry>();

// Default TTL: 7 days in milliseconds
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Cleanup interval: Check for expired entries every hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Cache a DEK for a user
 */
export function cacheDEK(userId: string, dek: Buffer, ttlMs?: number): void {
  const expiresAt = Date.now() + (ttlMs ?? DEFAULT_TTL_MS);
  dekCache.set(userId, { dek, expiresAt });
}

/**
 * Get a DEK from cache
 * Returns null if not found or expired
 */
export function getDEK(userId: string): Buffer | null {
  const entry = dekCache.get(userId);

  if (!entry) {
    return null;
  }

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    dekCache.delete(userId);
    return null;
  }

  return entry.dek;
}

/**
 * Remove a DEK from cache (e.g., on logout)
 */
export function clearDEK(userId: string): void {
  dekCache.delete(userId);
}

/**
 * Clear all cached DEKs
 */
export function clearAllDEKs(): void {
  dekCache.clear();
}

/**
 * Check if a user has a cached DEK
 */
export function hasDEK(userId: string): boolean {
  return getDEK(userId) !== null;
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getCacheStats(): { size: number; entries: string[] } {
  const entries = Array.from(dekCache.keys());
  return {
    size: dekCache.size,
    entries,
  };
}

// Periodic cleanup of expired entries
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start the periodic cleanup task
 */
export function startCleanupTask(): void {
  if (cleanupInterval) {
    return; // Already running
  }

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [userId, entry] of dekCache.entries()) {
      if (now > entry.expiresAt) {
        dekCache.delete(userId);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent the process from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Stop the periodic cleanup task
 */
export function stopCleanupTask(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Auto-start cleanup task on module load
startCleanupTask();

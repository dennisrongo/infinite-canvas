/**
 * Rate Limiting Module
 *
 * In-memory rate limiting for API endpoints.
 * For production, consider using Redis or a dedicated rate limiting service.
 *
 * Note: In production with multiple server instances, use a shared store
 * like Redis, Upstash, or a database-backed rate limiter.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** How long to block the user after rate limit is exceeded (milliseconds) */
  blockDurationMs?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  blocked?: boolean;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 5,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 15 * 60 * 1000, // 15 minutes
};

/**
 * Get a unique identifier for the request
 * Uses IP address or email/username if available
 */
export function getIdentifier(request: Request): string {
  // Try to get IP from headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  const ip = forwardedFor?.split(',')[0]?.trim() ||
             realIp ||
             cfConnectingIp ||
             'unknown';

  return ip;
}

/**
 * Check if the request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult {
  const key = `${endpoint}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If entry exists and is blocked, check if block has expired
  if (entry && entry.blockedUntil && entry.blockedUntil > now) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetTime: entry.blockedUntil,
      blocked: true,
    };
  }

  // Reset window if expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.limit) {
    // Apply block if configured
    if (config.blockDurationMs) {
      entry.blockedUntil = now + config.blockDurationMs;
      rateLimitStore.set(key, entry);
    }

    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetTime: entry.blockedUntil || entry.resetTime,
      blocked: !!config.blockDurationMs,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Middleware to apply rate limiting to API routes
 */
export function withRateLimit(
  handler: (request: Request, ...args: any[]) => Promise<Response>,
  config?: RateLimitConfig
) {
  const endpointName = handler.name || 'unknown';

  return async (request: Request, ...args: any[]): Promise<Response> => {
    const identifier = getIdentifier(request);
    const result = checkRateLimit(identifier, endpointName, config);

    // Add rate limit headers to response
    const headers = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    };

    if (!result.success) {
      const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);

      return new Response(
        JSON.stringify({
          error: result.blocked
            ? 'Too many attempts. You have been temporarily blocked due to excessive requests.'
            : 'Rate limit exceeded',
          message: result.blocked
            ? `Too many attempts. Please try again in ${retryAfterSeconds} seconds.`
            : `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      );
    }

    // Call the original handler and add rate limit headers
    const response = await handler(request, ...args);

    // Clone response to add headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-RateLimit-Limit', headers['X-RateLimit-Limit']);
    responseHeaders.set('X-RateLimit-Remaining', headers['X-RateLimit-Remaining']);
    responseHeaders.set('X-RateLimit-Reset', headers['X-RateLimit-Reset']);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  };
}

/**
 * Rate limit configurations for different endpoint types
 */
export const rateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: {
    limit: 5,
    windowMs: 60 * 1000, // 5 requests per minute
    blockDurationMs: 15 * 60 * 1000, // 15 minute block
  },

  // Moderate rate limiting for general API
  api: {
    limit: 100,
    windowMs: 60 * 1000, // 100 requests per minute
    blockDurationMs: 5 * 60 * 1000, // 5 minute block
  },

  // Lenient rate limiting for public endpoints
  public: {
    limit: 20,
    windowMs: 60 * 1000, // 20 requests per minute
    blockDurationMs: 2 * 60 * 1000, // 2 minute block
  },
};

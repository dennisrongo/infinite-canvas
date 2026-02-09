import { cookies } from 'next/headers';

/**
 * CSRF Protection Module
 *
 * This module implements CSRF token validation for state-changing operations.
 * It uses the Double Submit Cookie pattern for CSRF protection.
 *
 * Note: The application already has CSRF protection through:
 * - SameSite=lax cookies (prevents cross-site requests)
 * - HTTP-only auth tokens (prevents XSS token theft)
 *
 * This explicit CSRF token system adds an additional layer of protection.
 */

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a random CSRF token
 */
export function generateCSRFToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get or create CSRF token for the current session
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (existingToken) {
    return existingToken;
  }

  // Generate new token
  const token = generateCSRFToken();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return token;
}

/**
 * Validate CSRF token from request
 * Checks for token in x-csrf-token header
 */
export async function validateCSRFToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken) {
    return false;
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!headerToken) {
    return false;
  }

  // Compare tokens using constant-time comparison
  // Note: timingSafeEqual may not be available in all environments
  // Use a simple comparison with length check as fallback
  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  // Simple character-by-character comparison
  // (In production with Node.js 20+, use crypto.timingSafeEqual if available)
  for (let i = 0; i < cookieToken.length; i++) {
    if (cookieToken[i] !== headerToken[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Middleware wrapper to protect API routes with CSRF validation
 * Only validates state-changing methods (POST, PUT, DELETE, PATCH)
 */
export function withCSRFProtection<T extends any[]>(
  handler: (request: Request, ...args: T) => Promise<Response>
): (request: Request, ...args: T) => Promise<Response> {
  return async (request: Request, ...args: T) => {
    const method = request.method.toUpperCase();

    // Only validate state-changing operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const isValid = await validateCSRFToken(request);

      if (!isValid) {
        return new Response(
          JSON.stringify({
            error: 'CSRF validation failed',
            message: 'Invalid or missing CSRF token'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return handler(request, ...args);
  };
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };

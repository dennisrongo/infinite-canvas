import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';

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
 * Constant-time string comparison to prevent timing attacks
 * Uses padded buffer approach to ensure constant execution time
 * regardless of input length differences
 */
function constantTimeEquals(a: string, b: string): boolean {
  // Handle empty string edge case
  if (!a || !b) {
    return a === b;
  }

  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');

  // Pad both buffers to the same length to ensure constant-time comparison
  // This prevents timing leaks from length differences
  const maxLen = Math.max(bufferA.length, bufferB.length);
  const paddedA = Buffer.alloc(maxLen);
  const paddedB = Buffer.alloc(maxLen);

  bufferA.copy(paddedA);
  bufferB.copy(paddedB);

  // Compare lengths after padding (constant time since we already did the work)
  const lengthsMatch = bufferA.length === bufferB.length;

  // Always perform the comparison (constant time)
  const valuesMatch = timingSafeEqual(paddedA, paddedB);

  return lengthsMatch && valuesMatch;
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

  // Use constant-time comparison to prevent timing attacks
  return constantTimeEquals(cookieToken, headerToken);
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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, validateEmail, generateToken } from '@/lib/auth';
import { validateCSRFToken } from '@/lib/csrf';
import { checkRateLimit, getIdentifier, rateLimitConfigs } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (with fallback if rate limiting module fails)
    let rateLimitResult = { success: true, limit: 100, remaining: 100, resetTime: Date.now() + 60000 };
    try {
      const identifier = getIdentifier(request);
      rateLimitResult = checkRateLimit(identifier, 'login', rateLimitConfigs.auth);
    } catch (rateLimitError) {
      console.error('Rate limiting error:', rateLimitError);
      // Continue without rate limiting if module fails
    }

    // Helper function to add rate limit headers
    const addRateLimitHeaders = (response: NextResponse, result: typeof rateLimitResult) => {
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      return response;
    };

    // Check if rate limited
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      const errorResponse = NextResponse.json(
        {
          error: 'Too many login attempts',
          message: rateLimitResult.blocked
            ? `Too many failed login attempts. Your account has been temporarily blocked. Please try again in ${retryAfter} seconds.`
            : `Too many login attempts. Please try again in ${retryAfter} seconds.`,
          retryAfter
        },
        { status: 429 }
      );
      errorResponse.headers.set('Retry-After', retryAfter.toString());
      addRateLimitHeaders(errorResponse, rateLimitResult);
      return errorResponse;
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !validateEmail(email)) {
      const response = NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    // Validate CSRF token (optional for login - we check if header is present)
    try {
      const csrfToken = request.headers.get('x-csrf-token');
      if (csrfToken) {
        const isValidCSRF = await validateCSRFToken(request);
        if (!isValidCSRF) {
          return NextResponse.json(
            { error: 'CSRF validation failed' },
            { status: 403 }
          );
        }
      }
    } catch (csrfError) {
      console.error('CSRF validation error:', csrfError);
      // Continue without CSRF validation if module fails
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      const response = NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      const response = NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = generateToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });

    // Set the cookie explicitly on the response
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

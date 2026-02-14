import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, validateEmail, generateToken, createDEKToken, getDEKCookieOptions } from '@/lib/auth';
import { validateCSRFToken } from '@/lib/csrf';
import { checkRateLimit, getIdentifier, rateLimitConfigs } from '@/lib/rate-limit';
import {
  deriveKEK,
  unwrapDEK,
  wrapDEK,
  generateSalt,
  generateDEK,
  getDefaultKDFParams,
  EncryptedData,
} from '@/lib/encryption';
import { cacheDEK } from '@/lib/dek-cache';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (with fallback if rate limiting module fails)
    let rateLimitResult: { success: boolean; limit: number; remaining: number; resetTime: number; blocked?: boolean } = { success: true, limit: 100, remaining: 100, resetTime: Date.now() + 60000, blocked: false };
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
    const { email, password, rememberMe } = body;

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

    // Store DEK token to set in cookie later
    let dekToken: string | null = null;

    // Derive KEK and cache DEK if user has encryption enabled
    if (user.encryptionSalt && user.wrappedDek) {
      try {
        const kek = await deriveKEK(password, user.encryptionSalt, {
          iterations: user.kdfIterations ?? undefined,
          memoryCost: user.kdfMemoryCost ?? undefined,
          parallelism: user.kdfParallelism ?? undefined,
        });
        const wrappedDEK: EncryptedData = JSON.parse(user.wrappedDek);
        const dek = unwrapDEK(wrappedDEK, kek);
        cacheDEK(user.id, dek);
        dekToken = createDEKToken(dek);
      } catch (encryptionError) {
        // Log error but don't fail login - user can still access unencrypted notes
        console.error('Failed to initialize encryption on login:', encryptionError);
      }
    } else {
      // Initialize encryption for existing users who don't have it yet
      try {
        const encryptionSalt = generateSalt();
        const kdfParams = getDefaultKDFParams();
        const dek = generateDEK();
        const kek = await deriveKEK(password, encryptionSalt, kdfParams);
        const wrappedDek = wrapDEK(dek, kek);

        // Update user with encryption fields
        await prisma.user.update({
          where: { id: user.id },
          data: {
            encryptionSalt,
            wrappedDek: JSON.stringify(wrappedDek),
            dekVersion: 1,
            kdfIterations: kdfParams.iterations,
            kdfMemoryCost: kdfParams.memoryCost,
            kdfParallelism: kdfParams.parallelism,
          },
        });

        // Cache the DEK for immediate use
        cacheDEK(user.id, dek);
        dekToken = createDEKToken(dek);
      } catch (initError) {
        console.error('Failed to initialize encryption for existing user:', initError);
        // Continue without encryption - user can still access unencrypted notes
      }
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      passwordVersion: user.passwordVersion || 0
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });

    // Set the auth cookie explicitly on the response
    // If rememberMe is true, use 7 days; otherwise use a session cookie (expires when browser closes)
    const maxAge = rememberMe ? 60 * 60 * 24 * 7 : undefined; // 7 days if rememberMe, else session cookie

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
      path: '/',
    });

    // Set DEK cookie on the response if we have a token
    if (dekToken) {
      response.cookies.set('dek_token', dekToken, getDEKCookieOptions());
    }

    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

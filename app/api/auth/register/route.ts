import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword, validateEmail, generateToken, setSessionCookie, createDEKToken, getDEKCookieOptions } from '@/lib/auth';
import { checkRateLimit, getIdentifier, rateLimitConfigs } from '@/lib/rate-limit';
import {
  generateSalt,
  generateDEK,
  deriveKEK,
  wrapDEK,
  getDefaultKDFParams,
} from '@/lib/encryption';
import { cacheDEK } from '@/lib/dek-cache';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = getIdentifier(request);
    const rateLimitResult = checkRateLimit(identifier, 'register', rateLimitConfigs.auth);

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
          error: 'Too many registration attempts',
          message: rateLimitResult.blocked
            ? `Too many registration attempts. Please try again in ${retryAfter} seconds.`
            : `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter
        },
        { status: 429 }
      );
      errorResponse.headers.set('Retry-After', retryAfter.toString());
      addRateLimitHeaders(errorResponse, rateLimitResult);
      return errorResponse;
    }

    const body = await request.json();
    const { email, password, confirmPassword } = body;

    if (!email || !validateEmail(email)) {
      const response = NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      const response = NextResponse.json(
        { error: passwordValidation.errors },
        { status: 400 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    if (password !== confirmPassword) {
      const response = NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      const response = NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    const passwordHash = await hashPassword(password);

    // Initialize encryption for the new user
    const encryptionSalt = generateSalt();
    const kdfParams = getDefaultKDFParams();
    const dek = generateDEK();
    const kek = await deriveKEK(password, encryptionSalt, kdfParams);
    const wrappedDek = wrapDEK(dek, kek);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        displayName: email.split('@')[0],
        passwordVersion: 0, // Initialize password version
        // Encryption fields
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
    const dekToken = createDEKToken(dek);

    await prisma.userSettings.create({
      data: { userId: user.id, theme: 'light' },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      passwordVersion: 0
    });

    const response = NextResponse.json(
      {
        user: { id: user.id, email: user.email, displayName: user.displayName },
        token
      },
      { status: 201 }
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // Use 'strict' for better CSRF protection
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    // Set DEK cookie
    response.cookies.set('dek_token', dekToken, getDEKCookieOptions());

    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

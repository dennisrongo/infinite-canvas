import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import * as crypto from 'crypto';

// Helper function to get JWT_SECRET with validation
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set. Please set it in your .env file.');
  }
  return secret;
}

// Helper function to get DEK encryption key (derived from JWT_SECRET)
function getDEKEncryptionKey(): Buffer {
  const secret = getJWTSecret();
  // Derive a 32-byte key from the JWT secret using SHA-256
  return crypto.createHash('sha256').update(secret + ':dek-encryption').digest();
}

// DEK cookie name
const DEK_COOKIE_NAME = 'dek_token';
const DEK_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface TokenPayload {
  userId: string;
  email: string;
  passwordVersion: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJWTSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJWTSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  // Verify password version matches (session invalidation on password change)
  // NOTE: Temporarily disabled due to Prisma client sync issues
  // TODO: Re-enable after running `npx prisma generate` and migration
  /*
  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { passwordVersion: true },
  });

  // If user doesn't exist or password version doesn't match, session is invalid
  if (!user || user.passwordVersion !== payload.passwordVersion) {
    return null;
  }
  */

  return payload;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Changed from 'strict' to 'lax' to allow redirects to work
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
    priority: 'high', // Ensures cookie is sent with high priority
  });
}

export function generateResetToken(): string {
  // Generate a random 32-byte token and convert to hex
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getTokenExpiration(): Date {
  // Token expires in 1 hour
  return new Date(Date.now() + 60 * 60 * 1000);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Create an encrypted DEK token for cookie storage
 * Returns the encrypted token that should be set as a cookie
 */
export function createDEKToken(dek: Buffer): string {
  const key = getDEKEncryptionKey();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(dek);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data and encode as base64
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Get cookie options for DEK cookie
 */
export function getDEKCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: DEK_COOKIE_MAX_AGE,
    path: '/',
    priority: 'high' as const,
  };
}

/**
 * Set an encrypted DEK cookie (uses cookies() API)
 * The DEK is encrypted with a server-side key derived from JWT_SECRET
 */
export async function setDEKCookie(dek: Buffer): Promise<void> {
  const token = createDEKToken(dek);

  const cookieStore = await cookies();
  cookieStore.set(DEK_COOKIE_NAME, token, getDEKCookieOptions());
}

/**
 * Get the DEK from the encrypted cookie
 * Returns null if cookie doesn't exist or decryption fails
 */
export async function getDEKCookie(): Promise<Buffer | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(DEK_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const key = getDEKEncryptionKey();
    const combined = Buffer.from(token, 'base64');

    // Extract IV (16 bytes), authTag (16 bytes), and ciphertext
    const iv = Buffer.from(combined.subarray(0, 16));
    const authTag = Buffer.from(combined.subarray(16, 32));
    const ciphertext = Buffer.from(combined.subarray(32));

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  } catch (error) {
    console.error('[DEK Cookie] Failed to decrypt:', error);
    return null;
  }
}

/**
 * Clear the DEK cookie
 */
export async function clearDEKCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEK_COOKIE_NAME);
}

import { z } from 'zod';

/**
 * UUID validation regex for standard UUID format (8-4-4-4-12)
 * Matches: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID
 * @param id - The ID string to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(id: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * Schema for validating UUID strings
 */
export const uuidSchema = z.string().refine(
  (id) => isValidUUID(id),
  { message: 'Invalid ID format. Expected a valid UUID.' }
);

/**
 * Validate and sanitize URL parameters to prevent path traversal attacks
 * @param param - The URL parameter to validate
 * @returns The sanitized parameter or null if invalid
 */
export function sanitizeUrlParam(param: string): string | null {
  if (!param || typeof param !== 'string') {
    return null;
  }

  // Check for path traversal attempts
  if (param.includes('..') || param.includes('\\') || param.includes('/')) {
    return null;
  }

  // Check for URL-encoded path traversal
  if (param.includes('%2e%2e') || param.includes('%2e') || param.includes('%5c')) {
    return null;
  }

  return param;
}

/**
 * Validate redirect URLs to prevent open redirect attacks
 * @param redirectUrl - The redirect URL to validate
 * @returns true if safe, false otherwise
 */
export function isSafeRedirectUrl(redirectUrl: string): boolean {
  if (!redirectUrl || typeof redirectUrl !== 'string') {
    return false;
  }

  // Must be a relative URL starting with /
  if (!redirectUrl.startsWith('/')) {
    return false;
  }

  // Prevent protocol-relative URLs (//evil.com)
  if (redirectUrl.startsWith('//')) {
    return false;
  }

  // Prevent javascript: and data: URLs
  if (redirectUrl.toLowerCase().startsWith('javascript:') ||
      redirectUrl.toLowerCase().startsWith('data:')) {
    return false;
  }

  // Only allow safe characters in path
  // Allow: alphanumeric, -, _, /, ?, &, =, #
  const safeUrlRegex = /^\/[a-zA-Z0-9\-_\/?&=#%]*$/;
  return safeUrlRegex.test(redirectUrl);
}

/**
 * Schema for validating note content
 * Ensures content is safe and doesn't contain obvious XSS attempts
 */
export const noteContentSchema = z.string().max(10 * 1024 * 1024, { // 10MB max per spec
  message: 'Note content is too large',
}).transform((content) => {
  // Remove script tags and other dangerous patterns
  let sanitized = content;

  // Remove script tags with content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove dangerous event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove iframe/object/embed tags
  sanitized = sanitized.replace(/<(iframe|object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

  // Remove style tags
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  return sanitized;
});

/**
 * Schema for validating note title
 */
export const noteTitleSchema = z.string().max(500, {
  message: 'Title is too long (max 500 characters)',
}).transform((title) => {
  // Remove any HTML tags
  return title.replace(/<[^>]*>/g, '').trim();
});

/**
 * Schema for validating note updates
 */
export const noteUpdateSchema = z.object({
  title: noteTitleSchema.optional(),
  content: noteContentSchema.optional(),
  positionX: z.number().safe().optional(),
  positionY: z.number().safe().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  fontFamily: z.string().max(100).optional(),
  fontSize: z.number().positive().max(72).optional(),
});

/**
 * Schema for validating note creation
 */
export const noteCreateSchema = z.object({
  title: noteTitleSchema,
  content: noteContentSchema,
  positionX: z.number().safe(),
  positionY: z.number().safe(),
  width: z.number().positive().default(300),
  height: z.number().positive().default(200),
});

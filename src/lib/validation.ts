import { z } from 'zod';

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

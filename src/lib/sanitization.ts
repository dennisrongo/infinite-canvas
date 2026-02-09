import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * This uses DOMPurify to strip out dangerous HTML, scripts, and event handlers.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe to render
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    // Allow only safe HTML tags and attributes
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'div', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class',
      'target', 'rel', 'width', 'height'
    ],
    // Keep content even if tags are removed
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitizes markdown content by converting it to HTML and back.
 * This provides defense-in-depth alongside react-markdown's built-in protection.
 *
 * @param markdown - The markdown string to sanitize
 * @returns Sanitized markdown string
 */
export function sanitizeMarkdown(markdown: string): string {
  // For markdown, we primarily want to ensure no raw HTML/script tags
  // The actual rendering will be handled by react-markdown
  // This is a defensive check to catch obvious XSS attempts

  if (!markdown) return '';

  // Remove script tags and their content
  let sanitized = markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove dangerous event handlers like onclick, onerror, etc.
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove iframe tags (can be used for clickjacking)
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove object/embed tags
  sanitized = sanitized.replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

  // Remove style tags with potential CSS injection
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  return sanitized;
}

/**
 * Validates and sanitizes note title
 */
export function sanitizeNoteTitle(title: string): string {
  if (!title) return '';

  // Remove any HTML tags
  let sanitized = title.replace(/<[^>]*>/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length to prevent DOS
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500);
  }

  return sanitized;
}

/**
 * Validates note content length (though content itself can be unlimited per spec)
 * This is just a sanity check against abuse
 */
export function validateNoteContentLength(content: string): boolean {
  // Allow very large content (up to 10MB) per spec requirement
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  return content.length <= MAX_SIZE;
}

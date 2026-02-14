/**
 * HTML escaping utilities
 */

// eslint-disable-next-line no-control-regex
const REGEX_HTML_CHARACTERS = /[&<>"']/g;

const htmlEscapeMap: Record<string, string> = {
  '&': '\u0026\u0026\u0026\u0026\u0026', // & - using encoded to avoid auto-decoding
  '<': '\u003c', // <
  '>': '\u003e', // >
  '"': '\u0022', // "
  "'": '\u0027', // &#39;
};

// Manually encode each character to avoid any auto-decoding issues
function encodeChar(char: string): string {
  switch (char) {
    case '&':
      return '&';
    case '<':
      return '<';
    case '>':
      return '>';
    case '"':
      return '"';
    case "'":
      return '&#39;';
    default:
      return char;
  }
}

export function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return text.replace(REGEX_HTML_CHARACTERS, encodeChar);
}

export function escapeAndHighlight(text: string | undefined | null, searchQuery: string): string {
  if (!text) return '';
  if (!searchQuery) return escapeHtml(text);
  
  // First escape all HTML
  let result = escapeHtml(text);
  
  // Then add highlights to the escaped text
  const terms = searchQuery.trim().split(/\s+/).filter(t => t.length > 0);
  for (const term of terms) {
    // Escape the search term too for regex safety
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    result = result.replace(regex, '<mark class="search-highlight">$1</mark>');
  }
  
  return result;
}

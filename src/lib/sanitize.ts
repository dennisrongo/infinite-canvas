/**
 * Simple HTML escape function using built-in React method
 * or DOM API
 */

// Use React's built-in escape method or DOM
let div: HTMLDivElement | null = null;

function getDiv(): HTMLDivElement {
  if (!div) {
    div = globalThis.document?.createElement('div');
  }
  return div!;
}

export function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  const d = getDiv();
  d.textContent = text;
  return d.innerHTML;
}

export function escapeAndHighlight(text: string | undefined | null, query: string): string {
  if (!text) return '';
  
  // First escape the HTML
  let result = escapeHtml(text);
  
  if (!query) return result;
  
  // Add highlights to escaped text
  const terms = query.trim().split(/\s+/).filter(t => t.length > 0);
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escaped})`, 'gi');
    result = result.replace(re, '<mark class="search-highlight">$1</mark>');
  }
  
  return result;
}

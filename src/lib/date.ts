/**
 * Date formatting utilities for displaying timestamps in user's local timezone
 * All dates are stored in the database as UTC and converted to user's timezone on display
 */

/**
 * Format a date string or Date object into a readable date and time in user's local timezone
 * @param dateString - ISO date string or Date object
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string in user's local timezone
 */
export function formatDateTime(
  dateString: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!dateString) return '';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  // Check for invalid date
  if (isNaN(date.getTime())) return '';

  // Default options for readable date and time
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  // Use user's locale for automatic timezone detection
  return date.toLocaleDateString(undefined, { ...defaultOptions, ...options });
}

/**
 * Format a date string as just the date (no time) in user's local timezone
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  return formatDateTime(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string as just the time in user's local timezone
 * @param dateString - ISO date string or Date object
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export function formatTime(dateString: string | Date | null | undefined): string {
  return formatDateTime(dateString, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date as a relative time string (e.g., "2 hours ago", "3 days ago")
 * @param dateString - ISO date string or Date object
 * @returns Relative time string or absolute date if older than 7 days
 */
export function formatRelativeTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Future dates (shouldn't happen but handle gracefully)
  if (diffMs < 0) {
    return formatDate(date);
  }

  // Less than a minute
  if (diffSeconds < 60) {
    return 'just now';
  }

  // Less than an hour
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }

  // Less than a day
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }

  // Less than a week
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  // Older than a week - show absolute date
  return formatDate(date);
}

/**
 * Format a date with both date and time in a concise format
 * @param dateString - ISO date string or Date object
 * @returns Formatted string (e.g., "Jan 15, 2024 at 2:30 PM")
 */
export function formatDateTimeWithAt(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get the user's local timezone name
 * @returns Timezone name (e.g., "America/New_York") or "Local" if not available
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Local';
  }
}

/**
 * Format a date string with timezone information
 * @param dateString - ISO date string or Date object
 * @returns Formatted string with timezone abbreviation (e.g., "Jan 15, 2024, 2:30 PM EST")
 */
export function formatDateTimeWithTimezone(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  if (isNaN(date.getTime())) return '';

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

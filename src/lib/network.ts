'use client';

/**
 * Network utility for detecting online/offline status
 */

/**
 * Check if the browser is currently online
 */
export function isOnline(): boolean {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true; // Default to true for SSR
}

/**
 * Add event listeners for online/offline status changes
 */
export function addNetworkStatusListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }
  return () => {}; // No-op for SSR
}

/**
 * Enhanced fetch wrapper that handles network errors gracefully
 */
export async function safeFetch(
  url: string,
  options?: RequestInit,
  onNetworkError?: (error: Error) => void
): Promise<Response> {
  try {
    // Check if offline before making request
    if (!isOnline()) {
      const networkError = new Error('You are currently offline. Please check your internet connection.');
      networkError.name = 'NetworkOfflineError';
      throw networkError;
    }

    const response = await fetch(url, options);

    // Check if the response indicates a network/connection issue
    if (!response.ok && response.status === 0) {
      const error = new Error('Network connection failed. Please check your internet connection.');
      error.name = 'NetworkConnectionError';
      throw error;
    }

    return response;
  } catch (error: any) {
    // Handle network-specific errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new Error('Network request failed. Please check your internet connection.');
      networkError.name = 'NetworkFetchError';
      if (onNetworkError) {
        onNetworkError(networkError);
      }
      throw networkError;
    }

    // Re-throw offline errors
    if (error.name === 'NetworkOfflineError' || error.name === 'NetworkConnectionError') {
      if (onNetworkError) {
        onNetworkError(error);
      }
      throw error;
    }

    // Re-throw other errors
    throw error;
  }
}

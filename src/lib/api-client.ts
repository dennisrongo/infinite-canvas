'use client';

import { safeFetch } from './network';

/**
 * API Error types for better error handling
 */
export class NetworkOfflineError extends Error {
  constructor(message: string = 'You are currently offline. Please check your internet connection.') {
    super(message);
    this.name = 'NetworkOfflineError';
  }
}

export class NetworkConnectionError extends Error {
  constructor(message: string = 'Network connection failed. Please check your internet connection.') {
    super(message);
    this.name = 'NetworkConnectionError';
  }
}

export class APIError extends Error {
  constructor(
    public status: number,
    public errorData?: any,
    message: string = 'Request failed'
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Enhanced API client with network error handling
 */
export const api = {
  /**
   * GET request with network error handling
   */
  async get(url: string): Promise<any> {
    try {
      const response = await safeFetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new APIError(response.status, errorData, errorData.error || 'GET request failed');
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof NetworkOfflineError || error instanceof NetworkConnectionError) {
        throw error;
      }
      if (error instanceof APIError) {
        throw error;
      }
      throw new NetworkConnectionError(error.message);
    }
  },

  /**
   * POST request with network error handling
   */
  async post(url: string, body?: any): Promise<any> {
    try {
      const response = await safeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new APIError(response.status, errorData, errorData.error || 'POST request failed');
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof NetworkOfflineError || error instanceof NetworkConnectionError) {
        throw error;
      }
      if (error instanceof APIError) {
        throw error;
      }
      throw new NetworkConnectionError(error.message);
    }
  },

  /**
   * PUT request with network error handling
   */
  async put(url: string, body?: any): Promise<any> {
    try {
      const response = await safeFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new APIError(response.status, errorData, errorData.error || 'PUT request failed');
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof NetworkOfflineError || error instanceof NetworkConnectionError) {
        throw error;
      }
      if (error instanceof APIError) {
        throw error;
      }
      throw new NetworkConnectionError(error.message);
    }
  },

  /**
   * DELETE request with network error handling
   */
  async delete(url: string): Promise<any> {
    try {
      const response = await safeFetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new APIError(response.status, errorData, errorData.error || 'DELETE request failed');
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof NetworkOfflineError || error instanceof NetworkConnectionError) {
        throw error;
      }
      if (error instanceof APIError) {
        throw error;
      }
      throw new NetworkConnectionError(error.message);
    }
  },
};

/**
 * Helper function to handle API errors and show appropriate toast messages
 */
export function handleAPIError(error: unknown, showToast: (message: string, type: 'success' | 'error' | 'info') => void): void {
  if (error instanceof NetworkOfflineError) {
    showToast(error.message, 'error');
  } else if (error instanceof NetworkConnectionError) {
    showToast(error.message, 'error');
  } else if (error instanceof APIError) {
    // Show specific API error messages
    if (typeof error.errorData === 'string') {
      showToast(error.errorData, 'error');
    } else if (error.errorData?.error) {
      showToast(error.errorData.error, 'error');
    } else if (error.errorData?.message) {
      showToast(error.errorData.message, 'error');
    } else {
      showToast(error.message, 'error');
    }
  } else if (error instanceof Error) {
    showToast(error.message, 'error');
  } else {
    showToast('An unexpected error occurred', 'error');
  }
}

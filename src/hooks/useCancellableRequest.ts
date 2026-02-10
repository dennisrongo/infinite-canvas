import { useRef, useCallback } from 'react';

/**
 * Feature #175: Hook for handling cancellable API requests
 * Prevents state updates on unmounted components and cancelled requests
 */
export function useCancellableRequest() {
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const isMountedRef = useRef(true);

  // Create a cancellable fetch request
  const cancellableFetch = useCallback(async (
    key: string,
    url: string,
    options?: RequestInit & { skipAbort?: boolean }
  ): Promise<Response> => {
    // Abort any existing request with the same key
    if (!options?.skipAbort) {
      const existingController = abortControllersRef.current.get(key);
      if (existingController) {
        existingController.abort();
      }
    }

    // Create a new AbortController for this request
    const controller = new AbortController();
    abortControllersRef.current.set(key, controller);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      // Clean up the controller after successful request
      abortControllersRef.current.delete(key);

      return response;
    } catch (error) {
      // Clean up the controller on error
      abortControllersRef.current.delete(key);

      // Re-throw if it's not an abort error
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    }
  }, []);

  // Abort a specific request by key
  const abortRequest = useCallback((key: string) => {
    const controller = abortControllersRef.current.get(key);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(key);
    }
  }, []);

  // Abort all pending requests
  const abortAllRequests = useCallback(() => {
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
  }, []);

  // Clean up on unmount
  const cleanup = useCallback(() => {
    isMountedRef.current = false;
    abortAllRequests();
  }, [abortAllRequests]);

  return {
    cancellableFetch,
    abortRequest,
    abortAllRequests,
    isMounted: () => isMountedRef.current,
    cleanup,
  };
}

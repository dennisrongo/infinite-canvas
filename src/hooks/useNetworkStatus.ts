'use client';

import { useState, useEffect } from 'react';
import { addNetworkStatusListeners } from '@/lib/network';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

/**
 * Hook to track network status changes
 * Returns whether the user is online and if they were previously offline
 */
export function useNetworkStatus(): NetworkStatus {
  // Initialize as online to avoid hydration mismatch
  // The actual value will be updated after mount
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set mounted flag and get actual online status after component mounts
    setMounted(true);
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const cleanup = addNetworkStatusListeners(
      () => {
        // Came back online
        setIsOnline(true);
        setWasOffline(true);
        // Reset wasOffline after a delay
        setTimeout(() => setWasOffline(false), 5000);
      },
      () => {
        // Went offline
        setIsOnline(false);
      }
    );

    return cleanup;
  }, []);

  // During SSR or before mount, always return online to avoid hydration mismatch
  if (!mounted) {
    return { isOnline: true, wasOffline: false };
  }

  return { isOnline, wasOffline };
}

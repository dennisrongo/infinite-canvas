'use client';

import { useEffect } from 'react';

/**
 * Error Boundary for Next.js App Router
 * Catches and handles JavaScript errors in React components
 *
 * See: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service (optional)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#0F172A] rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-2">
            Something went wrong
          </h1>
          <p className="text-[#64748B] dark:text-[#94A3B8] mb-6">
            An unexpected error occurred. We apologize for the inconvenience.
          </p>

          {/* Safe error message (no technical details exposed) */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              You can try refreshing the page or go back to the dashboard.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="px-6 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition font-medium"
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="px-6 py-2 border border-[#E2E8F0] dark:border-[#475569] text-[#1E293B] dark:text-[#F1F5F9] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

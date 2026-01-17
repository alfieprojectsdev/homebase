'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error icon - large and high contrast */}
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error message - large text, high contrast */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
            Something went wrong
          </h1>
          <p className="text-lg text-gray-600">
            We encountered an unexpected error. Don&apos;t worry, your data is safe.
            Please try again.
          </p>
        </div>

        {/* Action buttons - large touch targets */}
        <div className="space-y-4">
          <button
            onClick={reset}
            className="w-full flex justify-center py-4 px-6 border border-transparent text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            style={{ minHeight: '48px' }}
          >
            Try again
          </button>
          <a
            href="/bills"
            className="w-full flex justify-center py-4 px-6 border-2 border-gray-300 text-lg font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            style={{ minHeight: '48px' }}
          >
            Go to Bills
          </a>
        </div>

        {/* Error digest for support - only shown if available */}
        {error.digest && (
          <p className="text-sm text-gray-400">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

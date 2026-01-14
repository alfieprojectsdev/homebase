'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Check if user is already authenticated and redirect silently
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          // User is authenticated, redirect to bills
          router.replace('/bills');
        }
      } catch {
        // User is not authenticated, continue showing forgot password page
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate reset link');
        setLoading(false);
        return;
      }

      // Phase 1: Display token and link on screen
      setSuccess(true);
      setResetLink(`${window.location.origin}/reset-password?token=${data.token}`);
      setLoading(false);
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resetLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.select();
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot Password
          </h2>
          <p className="mt-2 text-center text-lg text-gray-600">
            Enter your email to receive a password reset link
          </p>
        </div>

        {!success && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ minHeight: '44px' }}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '48px' }}
              >
                {loading ? 'Requesting Reset Link...' : 'Request Reset Link'}
              </button>
            </div>
          </form>
        )}

        {success && resetLink && (
          <div className="mt-8 space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <p className="font-bold text-lg mb-2">Reset link generated successfully!</p>
              <p className="text-base">
                Copy and share this link (expires in 1 hour):
              </p>
            </div>

            <div className="mt-4">
              <label htmlFor="reset-link" className="block text-sm font-medium text-gray-700 mb-2">
                Reset Link
              </label>
              <textarea
                id="reset-link"
                readOnly
                value={resetLink}
                rows={4}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-base font-mono text-sm break-all"
              />
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent text-lg font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              style={{ minHeight: '48px' }}
            >
              {copySuccess ? 'Copied!' : 'Copy Link'}
            </button>

            <div className="text-center text-gray-600">
              <p className="text-base">Share this link with the person who needs to reset their password.</p>
              <p className="text-sm mt-2 text-gray-500">(In production, this will be sent via email automatically)</p>
            </div>

            <div className="text-center">
              <a
                href="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500 text-lg"
              >
                Return to Login
              </a>
            </div>
          </div>
        )}

        {error && !success && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md font-medium text-lg">
            {error}
          </div>
        )}

        {!success && (
          <div className="text-center mt-4">
            <a
              href="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500 text-lg"
            >
              Back to Sign in
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

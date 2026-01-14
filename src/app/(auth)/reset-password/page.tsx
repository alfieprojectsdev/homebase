'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No reset token provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-validate?token=${token}`, {
          method: 'GET',
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid or expired reset link');
          setValidToken(false);
          setLoading(false);
          return;
        }

        // Token is valid
        setValidToken(true);
        setEmail(data.email || '');
        setLoading(false);
      } catch {
        setError('Failed to validate reset link');
        setValidToken(false);
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        setSubmitting(false);
        return;
      }

      // Success - show success message and redirect
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch {
      setError('An error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Loading state */}
        {loading && (
          <div className="text-center">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Validating Reset Link
            </h2>
            <p className="mt-4 text-lg text-gray-600">Please wait...</p>
          </div>
        )}

        {/* Invalid token state */}
        {!loading && !validToken && (
          <div className="space-y-6">
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Invalid Reset Link
              </h2>
            </div>
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              <p className="font-bold text-lg mb-2">Reset link is invalid or expired</p>
              <p className="text-base">{error}</p>
            </div>
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="inline-flex justify-center items-center py-4 px-6 border border-transparent text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                style={{ minHeight: '48px' }}
              >
                Request New Reset Link
              </Link>
            </div>
            <div className="text-center">
              <Link
                href="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500 text-lg"
              >
                Back to Sign in
              </Link>
            </div>
          </div>
        )}

        {/* Valid token - show reset form */}
        {!loading && validToken && !success && (
          <div>
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Reset Password
              </h2>
              <p className="mt-2 text-center text-lg text-gray-600">
                Enter new password for: <span className="font-semibold">{email}</span>
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="appearance-none relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg"
                    placeholder="New Password (minimum 8 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ minHeight: '44px' }}
                  />
                </div>
                <div>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="appearance-none relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minHeight: '48px' }}
                >
                  {submitting ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </div>
            </form>

            <div className="text-center mt-4">
              <Link
                href="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500 text-lg"
              >
                Back to Sign in
              </Link>
            </div>
          </div>
        )}

        {/* Success state */}
        {success && (
          <div className="space-y-6">
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Password Reset Complete
              </h2>
            </div>
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <p className="font-bold text-lg mb-2">✅ Password updated successfully!</p>
              <p className="text-base">Redirecting to login page...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

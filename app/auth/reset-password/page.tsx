'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (error) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              Invalid Reset Link
            </h1>
            <p className="text-[#1E293B] dark:text-[#F1F5F9] mb-6">
              {error}
            </p>
            <button
              onClick={() => router.push('/auth/forgot-password')}
              className="w-full py-3 px-4 bg-[#3B82F6] text-white rounded-lg hover:opacity-90 transition font-medium"
            >
              Request New Reset Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-2 text-center">
            Reset Password
          </h1>
          <p className="text-[#1E293B] dark:text-[#F1F5F9] text-center mb-8">
            Enter your new password
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                <p className="text-green-600 dark:text-green-400 text-sm">
                  Password has been reset successfully!
                </p>
              </div>
              <p className="text-sm text-[#1E293B] dark:text-[#F1F5F9]">
                Redirecting to login page...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9]"
                  placeholder="Enter new password"
                />
                <p className="mt-1 text-xs text-[#1E293B] dark:text-[#F1F5F9]">
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9]"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#3B82F6] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center">
        <div className="text-[#1E293B] dark:text-[#F1F5F9]">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

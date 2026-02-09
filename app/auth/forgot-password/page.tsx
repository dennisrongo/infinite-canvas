'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [touched, setTouched] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return 'Email is required';
    }
    return undefined;
  };

  const handleFieldBlur = () => {
    setTouched(true);
    const error = validateEmail(email);
    setFieldError(error || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTouched(true);

    // Validate email
    const emailValidation = validateEmail(email);
    if (emailValidation) {
      setFieldError(emailValidation);
      return;
    }

    setFieldError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (error) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-2 text-center">
            Forgot Password
          </h1>
          <p className="text-[#1E293B] dark:text-[#F1F5F9] text-center mb-8">
            Enter your email to receive a password reset link
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
                  If an account exists with that email, a password reset link has been sent.
                </p>
              </div>
              <p className="text-sm text-[#1E293B] dark:text-[#F1F5F9] mb-4">
                Check your email inbox and spam folder for the reset link.
              </p>
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full py-3 px-4 bg-[#3B82F6] text-white rounded-lg hover:opacity-90 transition font-medium"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // Clear error when user starts typing
                    if (fieldError) {
                      setFieldError('');
                    }
                  }}
                  onBlur={handleFieldBlur}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] ${
                    touched && fieldError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-[#E2E8F0] dark:border-[#475569] focus:ring-[#3B82F6]'
                  }`}
                  placeholder="you@example.com"
                />
                {touched && fieldError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('');
                    setFieldError('');
                    setTouched(false);
                    setError('');
                  }}
                  disabled={loading}
                  className="flex-1 py-3 px-4 border border-[#E2E8F0] dark:border-[#475569] text-[#1E293B] dark:text-[#F1F5F9] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-[#3B82F6] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Sending...
                    </>
                  ) : 'Send Reset Link'}
                </button>
              </div>
            </form>
          )}

          {!success && (
            <p className="mt-6 text-center text-sm text-[#1E293B] dark:text-[#F1F5F9]">
              Remember your password?{' '}
              <a href="/auth/login" className="text-[#3B82F6] hover:underline">
                Login
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

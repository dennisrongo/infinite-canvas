'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForgotPassword } from '@/hooks/api/useAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const forgotPasswordMutation = useForgotPassword();
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [touched, setTouched] = useState(false);
  const [success, setSuccess] = useState(false);
  const loading = forgotPasswordMutation.isPending;

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

    try {
      await forgotPasswordMutation.mutateAsync({ email });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen bg-light-canvas dark:bg-dark-canvas flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-sm border border-light-note-border/60 dark:border-dark-note-border/60 p-8">
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-2 text-center">
            Forgot Password
          </h1>
          <p className="text-light-text/60 dark:text-dark-text/60 text-center mb-8">
            Enter your email to receive a password reset link
          </p>

          {error && (
            <div role="alert" aria-live="assertive" className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <p className="text-green-600 dark:text-green-400 text-sm">
                  If an account exists with that email, a password reset link has been sent.
                </p>
              </div>
              <p className="text-sm text-light-text dark:text-dark-text mb-4">
                Check your email inbox and spam folder for the reset link.
              </p>
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full py-3 px-4 bg-light-primary dark:bg-dark-primary text-white rounded-xl hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition font-medium"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
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
                  className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text ${
                    touched && fieldError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-light-note-border dark:border-dark-note-border focus:ring-light-primary dark:focus:ring-dark-primary'
                  }`}
                  placeholder="you@example.com"
                />
                {touched && fieldError && (
                  <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldError}</p>
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
                  className="flex-1 py-3 px-4 border border-light-note-border dark:border-dark-note-border text-light-text dark:text-dark-text rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-light-primary dark:bg-dark-primary text-white rounded-xl hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
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
            <p className="mt-6 text-center text-sm text-light-text/60 dark:text-dark-text/60">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-light-primary dark:text-dark-primary hover:underline">
                Login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

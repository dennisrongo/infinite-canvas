'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForgotPassword } from '@/hooks/api/useAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AuthLayout from '@/components/auth/AuthLayout';
import { Mail, CheckCircle } from 'lucide-react';

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
    <AuthLayout
      title="Forgot password?"
      subtitle="No worries, we'll send you a reset link."
    >
      {error && (
        <div role="alert" aria-live="assertive" className="mb-6 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-red-600 dark:text-red-400 text-xs font-bold">!</span>
          </div>
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success ? (
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg">
            <p className="text-green-600 dark:text-green-400 text-sm">
              If an account exists with that email, a password reset link has been sent.
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Check your email inbox and spam folder for the reset link.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium text-sm shadow-sm shadow-blue-500/20 active:scale-[0.98]"
          >
            Back to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
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
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors ${
                  touched && fieldError
                    ? 'border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400'
                }`}
                placeholder="you@example.com"
              />
            </div>
            {touched && fieldError && (
              <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldError}</p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setEmail('');
                setFieldError('');
                setTouched(false);
                setError('');
              }}
              disabled={loading}
              className="flex-1 py-2.5 px-4 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 active:scale-[0.98]"
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
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
            Log in
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { AuthFormSkeleton } from '@/components/ui/SkeletonLoader';

interface ValidationErrors {
  password?: string;
  confirmPassword?: string;
}

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
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const validateField = (name: string, value: string): string | undefined => {
    if (!value || value.trim() === '') {
      if (name === 'password') return 'Password is required';
      if (name === 'confirmPassword') return 'Please confirm your password';
    }
    if (name === 'confirmPassword' && value !== formData.password) {
      return 'Passwords do not match';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    let isValid = true;

    const passwordError = validateField('password', formData.password);
    if (passwordError) {
      errors.password = passwordError;
      isValid = false;
    }

    const confirmPasswordError = validateField('confirmPassword', formData.confirmPassword);
    if (confirmPasswordError) {
      errors.confirmPassword = confirmPasswordError;
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouched(prev => new Set(prev).add(fieldName));
    const error = validateField(fieldName, formData[fieldName as keyof typeof formData]);
    setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    // Mark all fields as touched
    setTouched(new Set(['password', 'confirmPassword']));

    // Validate form
    if (!validateForm()) {
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
      <div className="min-h-screen bg-light-canvas dark:bg-dark-canvas flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-sm border border-light-note-border/60 dark:border-dark-note-border/60 p-8 text-center">
            <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-4">
              Invalid Reset Link
            </h1>
            <p className="text-light-text dark:text-dark-text mb-6">
              {error}
            </p>
            <button
              onClick={() => router.push('/auth/forgot-password')}
              className="w-full py-3 px-4 bg-light-primary dark:bg-dark-primary text-white rounded-xl hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition font-medium"
            >
              Request New Reset Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-canvas dark:bg-dark-canvas flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-sm border border-light-note-border/60 dark:border-dark-note-border/60 p-8">
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-2 text-center">
            Reset Password
          </h1>
          <p className="text-light-text/60 dark:text-dark-text/60 text-center mb-8">
            Enter your new password
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
                  Password has been reset successfully!
                </p>
              </div>
              <p className="text-sm text-light-text dark:text-dark-text">
                Redirecting to login page...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    // Clear error when user starts typing
                    if (fieldErrors.password) {
                      setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }
                  }}
                  onBlur={() => handleFieldBlur('password')}
                  className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text ${
                    touched.has('password') && fieldErrors.password
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-light-note-border dark:border-dark-note-border focus:ring-light-primary dark:focus:ring-dark-primary'
                  }`}
                  placeholder="Enter new password"
                />
                {touched.has('password') && fieldErrors.password && (
                  <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</p>
                )}
                <p className="mt-1 text-xs text-light-text/60 dark:text-dark-text/60">
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    // Clear error when user starts typing
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                  onBlur={() => handleFieldBlur('confirmPassword')}
                  className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text ${
                    touched.has('confirmPassword') && fieldErrors.confirmPassword
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-light-note-border dark:border-dark-note-border focus:ring-light-primary dark:focus:ring-dark-primary'
                  }`}
                  placeholder="Confirm new password"
                />
                {touched.has('confirmPassword') && fieldErrors.confirmPassword && (
                  <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ password: '', confirmPassword: '' });
                    setFieldErrors({});
                    setTouched(new Set());
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
                      Resetting...
                    </>
                  ) : 'Reset Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

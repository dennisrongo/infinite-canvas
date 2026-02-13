'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useResetPassword } from '@/hooks/api/useAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { AuthFormSkeleton } from '@/components/ui/SkeletonLoader';
import AuthLayout from '@/components/auth/AuthLayout';
import { Lock, CheckCircle, AlertTriangle } from 'lucide-react';

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
  const resetPasswordMutation = useResetPassword();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const loading = resetPasswordMutation.isPending;
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

    try {
      await resetPasswordMutation.mutateAsync({
        token,
        ...formData,
      });

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password');
    }
  };

  if (!tokenValid) {
    return (
      <AuthLayout
        title="Invalid Reset Link"
      >
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push('/auth/forgot-password')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium text-sm shadow-sm shadow-blue-500/20 active:scale-[0.98]"
          >
            Request New Reset Link
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter your new password below."
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
              Password has been reset successfully!
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Redirecting to login page...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
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
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors ${
                  touched.has('password') && fieldErrors.password
                    ? 'border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400'
                }`}
                placeholder="Enter new password"
              />
            </div>
            {touched.has('password') && fieldErrors.password && (
              <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</p>
            )}
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              Must be at least 8 characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
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
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors ${
                  touched.has('confirmPassword') && fieldErrors.confirmPassword
                    ? 'border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400'
                }`}
                placeholder="Confirm new password"
              />
            </div>
            {touched.has('confirmPassword') && fieldErrors.confirmPassword && (
              <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setFormData({ password: '', confirmPassword: '' });
                setFieldErrors({});
                setTouched(new Set());
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
                  Resetting...
                </>
              ) : 'Reset Password'}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

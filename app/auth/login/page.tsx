'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ValidationErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true, // Default to true per spec
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [returnUrl, setReturnUrl] = useState('/dashboard');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Get return URL from query params on mount
  useEffect(() => {
    const returnParam = searchParams.get('returnUrl');
    if (returnParam && returnParam.startsWith('/')) {
      setReturnUrl(returnParam);
    }
  }, [searchParams]);

  const validateField = (name: string, value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    let isValid = true;

    // Validate email
    const emailError = validateField('email', formData.email);
    if (emailError) {
      errors.email = emailError;
      isValid = false;
    }

    // Validate password
    const passwordError = validateField('password', formData.password);
    if (passwordError) {
      errors.password = passwordError;
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouched(prev => new Set(prev).add(fieldName));
    const value = formData[fieldName as keyof typeof formData];
    // Only validate string fields (rememberMe is boolean)
    const error = typeof value === 'string' ? validateField(fieldName, value) : undefined;
    setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mark all fields as touched
    setTouched(new Set(['email', 'password']));

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Redirect to the return URL or dashboard
      router.push(returnUrl);
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
            Welcome Back
          </h1>
          <p className="text-[#1E293B] dark:text-[#F1F5F9] text-center mb-8">
            Login to your Infinite Canvas
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  // Clear error when user starts typing
                  if (fieldErrors.email) {
                    setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }
                }}
                onBlur={() => handleFieldBlur('email')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] ${
                  touched.has('email') && fieldErrors.email
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-[#E2E8F0] dark:border-[#475569] focus:ring-[#3B82F6]'
                }`}
                placeholder="you@example.com"
              />
              {touched.has('email') && fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                Password
              </label>
              <input
                id="password"
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
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] ${
                  touched.has('password') && fieldErrors.password
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-[#E2E8F0] dark:border-[#475569] focus:ring-[#3B82F6]'
                }`}
                placeholder="Enter your password"
              />
              {touched.has('password') && fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</p>
              )}
              <div className="mt-1 text-right">
                <a href="/auth/forgot-password" className="text-sm text-[#3B82F6] hover:underline">
                  Forgot password?
                </a>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                className="w-4 h-4 text-[#3B82F6] border-[#E2E8F0] dark:border-[#475569] rounded focus:ring-2 focus:ring-[#3B82F6]"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-[#1E293B] dark:text-[#F1F5F9]">
                Remember me
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormData({ email: '', password: '', rememberMe: true });
                  setFieldErrors({});
                  setTouched(new Set());
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
                className="flex-1 py-3 px-4 bg-[#3B82F6] text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Logging in...
                  </>
                ) : 'Login'}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-[#1E293B] dark:text-[#F1F5F9]">
            Don't have an account?{' '}
            <a href="/auth/register" className="text-[#3B82F6] hover:underline">
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

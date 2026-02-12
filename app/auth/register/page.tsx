'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRegister } from '@/hooks/api/useAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Client-side password validation matching the server-side validation
function validatePasswordClient(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const registerMutation = useRegister();
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const loading = registerMutation.isPending;

  // Client-side password validation for real-time feedback
  const passwordErrors = useMemo(() => {
    if (!formData.password) return [];
    return validatePasswordClient(formData.password);
  }, [formData.password]);

  const hasPasswordErrors = passwordErrors.length > 0;
  const passwordStrength = formData.password ? (
    passwordErrors.length === 0 ? 'valid' : 'invalid'
  ) : '';

  const validateField = (name: string, value: string): string | undefined => {
    if (!value || value.trim() === '') {
      if (name === 'email') return 'Email is required';
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

    const emailError = validateField('email', formData.email);
    if (emailError) {
      errors.email = emailError;
      isValid = false;
    }

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
    setErrors([]);

    // Mark all fields as touched
    setTouched(new Set(['email', 'password', 'confirmPassword']));

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      await registerMutation.mutateAsync(formData);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.message || 'Registration failed';
      const errorList = Array.isArray(msg) ? msg : [msg];
      setErrors(errorList);
    }
  };

  return (
    <div className="min-h-screen bg-light-canvas dark:bg-dark-canvas flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-sm border border-light-note-border/60 dark:border-dark-note-border/60 p-8">
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-2 text-center">
            Create Account
          </h1>
          <p className="text-light-text/60 dark:text-dark-text/60 text-center mb-8">
            Join Infinite Canvas today
          </p>

          {errors.length > 0 && (
            <div role="alert" aria-live="assertive" className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              {errors.map((error, index) => (
                <p key={index} className="text-red-600 dark:text-red-400 text-sm">
                  {error}
                </p>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
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
                className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text ${
                  touched.has('email') && fieldErrors.email
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-light-note-border dark:border-dark-note-border focus:ring-light-primary dark:focus:ring-dark-primary'
                }`}
                placeholder="you@example.com"
              />
              {touched.has('email') && fieldErrors.email && (
                <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                Password
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
                    : passwordStrength === 'valid'
                    ? 'border-green-500 focus:ring-green-500'
                    : passwordStrength === 'invalid'
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-light-note-border dark:border-dark-note-border focus:ring-light-primary dark:focus:ring-dark-primary'
                }`}
                placeholder="Min 8 chars, uppercase, lowercase, number, special"
              />
              {touched.has('password') && fieldErrors.password && (
                <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</p>
              )}
              {formData.password && hasPasswordErrors && (
                <ul role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                  {passwordErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
              {formData.password && !hasPasswordErrors && !fieldErrors.password && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                  ✓ Password meets all requirements
                </p>
              )}
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
                    : formData.confirmPassword && formData.password === formData.confirmPassword
                    ? 'border-green-500 focus:ring-green-500'
                    : formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-light-note-border dark:border-dark-note-border focus:ring-light-primary dark:focus:ring-dark-primary'
                }`}
                placeholder="Repeat your password"
              />
              {touched.has('confirmPassword') && fieldErrors.confirmPassword && (
                <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
              )}
              {formData.confirmPassword && !fieldErrors.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  ✓ Passwords match
                </p>
              )}
              {formData.confirmPassword && !fieldErrors.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Passwords do not match
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormData({ email: '', password: '', confirmPassword: '' });
                  setFieldErrors({});
                  setTouched(new Set());
                  setErrors([]);
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
                    Creating account...
                  </>
                ) : 'Create Account'}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-light-text/60 dark:text-dark-text/60">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-light-primary dark:text-dark-primary hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

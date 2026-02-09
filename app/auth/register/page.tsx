'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle both single error string and array of errors
        const errorList = Array.isArray(data.error) ? data.error : [data.error || 'Registration failed'];
        setErrors(errorList);
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      setErrors(['Network error. Please try again.']);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9] mb-2 text-center">
            Create Account
          </h1>
          <p className="text-[#1E293B] dark:text-[#F1F5F9] text-center mb-8">
            Join Infinite Canvas today
          </p>

          {errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              {errors.map((error, index) => (
                <p key={index} className="text-red-600 dark:text-red-400 text-sm">
                  {error}
                </p>
              ))}
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
                    : passwordStrength === 'valid'
                    ? 'border-green-500 focus:ring-green-500'
                    : passwordStrength === 'invalid'
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-[#E2E8F0] dark:border-[#475569] focus:ring-[#3B82F6]'
                }`}
                placeholder="Min 8 chars, uppercase, lowercase, number, special"
              />
              {touched.has('password') && fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</p>
              )}
              {formData.password && hasPasswordErrors && (
                <ul className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
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
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] ${
                  touched.has('confirmPassword') && fieldErrors.confirmPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : formData.confirmPassword && formData.password === formData.confirmPassword
                    ? 'border-green-500 focus:ring-green-500'
                    : formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-[#E2E8F0] dark:border-[#475569] focus:ring-[#3B82F6]'
                }`}
                placeholder="Repeat your password"
              />
              {touched.has('confirmPassword') && fieldErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
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
                    Creating account...
                  </>
                ) : 'Create Account'}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-[#1E293B] dark:text-[#F1F5F9]">
            Already have an account?{' '}
            <a href="/auth/login" className="text-[#3B82F6] hover:underline">
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

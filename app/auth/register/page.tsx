'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRegister } from '@/hooks/api/useAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AuthLayout from '@/components/auth/AuthLayout';
import { Mail, Lock, ShieldCheck } from 'lucide-react';

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

// Password strength as a score out of 5
function getPasswordStrengthScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  return score;
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

  const strengthScore = useMemo(() => getPasswordStrengthScore(formData.password), [formData.password]);

  const strengthLabel = useMemo(() => {
    if (!formData.password) return '';
    if (strengthScore <= 2) return 'Weak';
    if (strengthScore <= 4) return 'Medium';
    return 'Strong';
  }, [formData.password, strengthScore]);

  const strengthColor = useMemo(() => {
    if (strengthScore <= 2) return 'bg-red-500';
    if (strengthScore <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  }, [strengthScore]);

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
    <AuthLayout
      title="Create account"
      subtitle="Join our community of spatial thinkers today."
    >
      {errors.length > 0 && (
        <div role="alert" aria-live="assertive" className="mb-6 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-red-600 dark:text-red-400 text-xs font-bold">!</span>
          </div>
          <div>
            {errors.map((error, index) => (
              <p key={index} className="text-red-600 dark:text-red-400 text-sm">
                {error}
              </p>
            ))}
          </div>
        </div>
      )}

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
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                // Clear error when user starts typing
                if (fieldErrors.email) {
                  setFieldErrors(prev => ({ ...prev, email: undefined }));
                }
              }}
              onBlur={() => handleFieldBlur('email')}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors ${
                touched.has('email') && fieldErrors.email
                  ? 'border-red-500 focus:ring-red-500/20'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400'
              }`}
              placeholder="you@example.com"
            />
          </div>
          {touched.has('email') && fieldErrors.email && (
            <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Password
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
              placeholder="Min 8 chars, uppercase, lowercase, number, special"
            />
          </div>
          {touched.has('password') && fieldErrors.password && (
            <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</p>
          )}

          {/* Password strength bar */}
          {formData.password && (
            <div className="mt-2.5">
              <div className="flex gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < strengthScore ? strengthColor : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${
                  strengthScore <= 2 ? 'text-red-500' : strengthScore <= 4 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {strengthLabel}
                </span>
                {!hasPasswordErrors && (
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> All requirements met
                  </span>
                )}
              </div>
            </div>
          )}

          {formData.password && hasPasswordErrors && (
            <ul role="alert" className="mt-2 space-y-1">
              {passwordErrors.map((error, index) => (
                <li key={index} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                  {error}
                </li>
              ))}
            </ul>
          )}
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
                  : formData.confirmPassword && formData.password === formData.confirmPassword
                  ? 'border-green-500 focus:ring-green-500/20'
                  : formData.confirmPassword && formData.password !== formData.confirmPassword
                  ? 'border-red-500 focus:ring-red-500/20'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400'
              }`}
              placeholder="Repeat your password"
            />
          </div>
          {touched.has('confirmPassword') && fieldErrors.confirmPassword && (
            <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
          )}
          {formData.confirmPassword && !fieldErrors.confirmPassword && formData.password === formData.confirmPassword && (
            <p className="mt-1.5 text-xs text-green-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Passwords match
            </p>
          )}
          {formData.confirmPassword && !fieldErrors.confirmPassword && formData.password !== formData.confirmPassword && (
            <p className="mt-1.5 text-xs text-red-500">
              Passwords do not match
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              setFormData({ email: '', password: '', confirmPassword: '' });
              setFieldErrors({});
              setTouched(new Set());
              setErrors([]);
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
                Creating account...
              </>
            ) : 'Create Account'}
          </button>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}

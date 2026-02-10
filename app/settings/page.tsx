'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDateTime, getUserTimezone } from '@/lib/date';

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

interface PasswordValidationErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; displayName?: string; createdAt?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | string[]>('');
  const [success, setSuccess] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [passwordFieldErrors, setPasswordFieldErrors] = useState<PasswordValidationErrors>({});
  const [passwordTouched, setPasswordTouched] = useState<Set<string>>(new Set());

  const [profileForm, setProfileForm] = useState({
    displayName: '',
  });

  // Account deletion state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showSecondConfirmation, setShowSecondConfirmation] = useState(false);

  // Client-side password validation for real-time feedback
  const newPasswordErrors = useMemo(() => {
    if (!passwordForm.newPassword) return [];
    return validatePasswordClient(passwordForm.newPassword);
  }, [passwordForm.newPassword]);

  const hasPasswordErrors = newPasswordErrors.length > 0;
  const passwordStrength = passwordForm.newPassword ? (
    newPasswordErrors.length === 0 ? 'valid' : 'invalid'
  ) : '';

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/auth/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);
      setProfileForm({ displayName: data.user.displayName || '' });
      setLoading(false);
    } catch (error) {
      setError('Failed to load user data');
      setLoading(false);
    }
  };

  const validatePasswordField = (name: string, value: string): string | undefined => {
    if (!value || value.trim() === '') {
      if (name === 'currentPassword') return 'Current password is required';
      if (name === 'newPassword') return 'New password is required';
      if (name === 'confirmNewPassword') return 'Please confirm your new password';
    }
    if (name === 'confirmNewPassword' && value !== passwordForm.newPassword) {
      return 'Passwords do not match';
    }
    return undefined;
  };

  const validatePasswordForm = (): boolean => {
    const errors: PasswordValidationErrors = {};
    let isValid = true;

    const currentPasswordError = validatePasswordField('currentPassword', passwordForm.currentPassword);
    if (currentPasswordError) {
      errors.currentPassword = currentPasswordError;
      isValid = false;
    }

    const newPasswordError = validatePasswordField('newPassword', passwordForm.newPassword);
    if (newPasswordError) {
      errors.newPassword = newPasswordError;
      isValid = false;
    }

    const confirmNewPasswordError = validatePasswordField('confirmNewPassword', passwordForm.confirmNewPassword);
    if (confirmNewPasswordError) {
      errors.confirmNewPassword = confirmNewPasswordError;
      isValid = false;
    }

    setPasswordFieldErrors(errors);
    return isValid;
  };

  const handlePasswordFieldBlur = (fieldName: string) => {
    setPasswordTouched(prev => new Set(prev).add(fieldName));
    const error = validatePasswordField(fieldName, passwordForm[fieldName as keyof typeof passwordForm]);
    setPasswordFieldErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSavingProfile(true);

    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update profile');
        setSavingProfile(false);
        return;
      }

      setSuccess('Profile updated successfully!');
      setUser({ ...user!, displayName: profileForm.displayName });
      setSavingProfile(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Network error. Please try again.');
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Mark all fields as touched
    setPasswordTouched(new Set(['currentPassword', 'newPassword', 'confirmNewPassword']));

    // Validate form
    if (!validatePasswordForm()) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle both single error string and array of errors
        setError(data.error || 'Failed to change password');
        setSaving(false);
        return;
      }

      setSuccess('Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setPasswordFieldErrors({});
      setPasswordTouched(new Set());
      setSaving(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (error) {
      setError('Failed to logout');
    }
  };

  const handleInitiateDelete = () => {
    setShowDeleteConfirmation(true);
    setError('');
    setSuccess('');
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setShowSecondConfirmation(false);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    // Validate password is entered
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm deletion');
      return;
    }

    // If this is the first confirmation, show the second one
    if (!showSecondConfirmation) {
      setShowSecondConfirmation(true);
      setDeleteError('');
      return;
    }

    // This is the second confirmation - proceed with deletion
    setDeleting(true);
    setDeleteError('');

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDeleteError(data.error || 'Failed to delete account');
        setDeleting(false);
        return;
      }

      // Account deleted successfully - logout and redirect to login
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login?deleted=true');
    } catch (error) {
      setDeleteError('Network error. Please try again.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center">
        <div className="text-[#1E293B] dark:text-[#F1F5F9]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
              Settings
            </h1>
            <p className="text-[#1E293B] dark:text-[#F1F5F9] mt-1">
              Manage your account settings
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:opacity-90 transition"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div role="alert" aria-live="assertive" className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            {Array.isArray(error) ? (
              <ul className="text-red-600 dark:text-red-400 list-disc list-inside">
                {error.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            ) : (
              <p className="text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
        )}

        {success && (
          <div role="status" aria-live="polite" className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
            <p className="text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Profile Information Section */}
        <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-lg p-6 mb-6 overflow-x-hidden w-full">
          <h2 className="text-xl font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
            Profile Information
          </h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg bg-gray-100 dark:bg-gray-800 text-[#1E293B] dark:text-[#F1F5F9] cursor-not-allowed"
                readOnly
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email cannot be changed</p>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={profileForm.displayName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, displayName: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9]"
                placeholder="Enter your display name"
              />
              <p className="mt-1 text-xs text-[#1E293B] dark:text-[#F1F5F9]">
                This name will be displayed in your profile and across the app
              </p>
            </div>

            {user?.createdAt && (
              <div>
                <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                  Member Since
                </label>
                <p className="text-[#1E293B] dark:text-[#F1F5F9]" title={formatDateTime(user.createdAt)}>
                  {formatDateTime(user.createdAt)}
                </p>
                <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Your timezone: {getUserTimezone()}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-3 px-4 bg-[#3B82F6] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {savingProfile ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Change Password Section */}
        <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-lg p-6 overflow-x-hidden w-full">
          <h2 className="text-xl font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
            Change Password
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                Current Password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => {
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                  // Clear error when user starts typing
                  if (passwordFieldErrors.currentPassword) {
                    setPasswordFieldErrors(prev => ({ ...prev, currentPassword: undefined }));
                  }
                }}
                onBlur={() => handlePasswordFieldBlur('currentPassword')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] ${
                  passwordTouched.has('currentPassword') && passwordFieldErrors.currentPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-[#E2E8F0] dark:border-[#475569] focus:ring-[#3B82F6]'
                }`}
                placeholder="Enter your current password"
              />
              {passwordTouched.has('currentPassword') && passwordFieldErrors.currentPassword && (
                <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordFieldErrors.currentPassword}</p>
              )}
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => {
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                  // Clear error when user starts typing
                  if (passwordFieldErrors.newPassword) {
                    setPasswordFieldErrors(prev => ({ ...prev, newPassword: undefined }));
                  }
                }}
                onBlur={() => handlePasswordFieldBlur('newPassword')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] ${
                  passwordTouched.has('newPassword') && passwordFieldErrors.newPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : passwordStrength === 'valid'
                    ? 'border-green-500 focus:ring-green-500'
                    : passwordStrength === 'invalid'
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-[#E2E8F0] dark:border-[#475569] focus:ring-[#3B82F6]'
                }`}
                placeholder="Enter new password"
              />
              {passwordTouched.has('newPassword') && passwordFieldErrors.newPassword && (
                <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordFieldErrors.newPassword}</p>
              )}
              {passwordForm.newPassword && hasPasswordErrors && !passwordFieldErrors.newPassword && (
                <ul role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                  {newPasswordErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
              {passwordForm.newPassword && !hasPasswordErrors && !passwordFieldErrors.newPassword && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                  ✓ Password meets all requirements
                </p>
              )}
              {!passwordForm.newPassword && (
                <p className="mt-1 text-xs text-[#1E293B] dark:text-[#F1F5F9]">
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                value={passwordForm.confirmNewPassword}
                onChange={(e) => {
                  setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value });
                  // Clear error when user starts typing
                  if (passwordFieldErrors.confirmNewPassword) {
                    setPasswordFieldErrors(prev => ({ ...prev, confirmNewPassword: undefined }));
                  }
                }}
                onBlur={() => handlePasswordFieldBlur('confirmNewPassword')}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] ${
                  passwordTouched.has('confirmNewPassword') && passwordFieldErrors.confirmNewPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : passwordForm.confirmNewPassword && passwordForm.newPassword === passwordForm.confirmNewPassword
                    ? 'border-green-500 focus:ring-green-500'
                    : passwordForm.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-[#E2E8F0] dark:border-[#475569] focus:ring-[#3B82F6]'
                }`}
                placeholder="Confirm new password"
              />
              {passwordTouched.has('confirmNewPassword') && passwordFieldErrors.confirmNewPassword && (
                <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordFieldErrors.confirmNewPassword}</p>
              )}
              {passwordForm.confirmNewPassword && !passwordFieldErrors.confirmNewPassword && passwordForm.newPassword === passwordForm.confirmNewPassword && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  ✓ Passwords match
                </p>
              )}
              {passwordForm.confirmNewPassword && !passwordFieldErrors.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Passwords do not match
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmNewPassword: '',
                  });
                  setPasswordFieldErrors({});
                  setPasswordTouched(new Set());
                }}
                disabled={saving}
                className="flex-1 py-3 px-4 border border-[#E2E8F0] dark:border-[#475569] text-[#1E293B] dark:text-[#F1F5F9] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 px-4 bg-[#3B82F6] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Changing Password...
                  </>
                ) : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Logout Button */}
        <div className="mt-6 text-center">
          <button
            onClick={handleLogout}
            className="px-6 py-2 border border-[#E2E8F0] dark:border-[#475569] text-[#1E293B] dark:text-[#F1F5F9] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
          >
            Logout
          </button>
        </div>

        {/* Delete Account Section */}
        <div className="mt-8 bg-white dark:bg-[#0F172A] rounded-lg shadow-lg p-6 overflow-x-hidden w-full border-2 border-red-200 dark:border-red-900">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            Danger Zone
          </h2>
          <p className="text-[#1E293B] dark:text-[#F1F5F9] mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              <strong>Warning:</strong> This will permanently delete your account and all associated data, including:
            </p>
            <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside mt-2">
              <li>All your canvases and notes</li>
              <li>All folders and organizational structure</li>
              <li>All images and attachments</li>
              <li>Your profile information</li>
              <li>All settings and preferences</li>
            </ul>
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              <strong>This action cannot be undone.</strong>
            </p>
          </div>

          {!showDeleteConfirmation ? (
            <button
              onClick={handleInitiateDelete}
              className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              Delete My Account
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-[#1E293B] dark:text-[#F1F5F9] font-medium">
                {!showSecondConfirmation
                  ? 'Are you sure you want to delete your account?'
                  : 'This is your last chance - are you absolutely certain?'}
              </p>

              <div>
                <label htmlFor="deletePassword" className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-1">
                  Enter your password to confirm
                </label>
                <input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError('');
                  }}
                  className="w-full px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9]"
                  placeholder="Enter your password"
                  disabled={deleting}
                />
              </div>

              {deleteError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  disabled={deleting}
                  className="flex-1 py-3 px-4 border border-[#E2E8F0] dark:border-[#475569] text-[#1E293B] dark:text-[#F1F5F9] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting || !deletePassword}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Deleting...
                    </>
                  ) : showSecondConfirmation ? (
                    'Yes, Permanently Delete My Account'
                  ) : (
                    'Confirm Deletion'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser, useLogout } from '@/hooks/api/useAuth';
import { useUpdateProfile, useChangePassword, useDeleteAccount } from '@/hooks/api/useUser';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SettingsSkeleton } from '@/components/ui/SkeletonLoader';
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
  const { data: userData, isLoading: loading, isError: userError } = useCurrentUser();
  const user = userData?.user as { email: string; displayName?: string; createdAt?: string } | null;
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();
  const logoutMutation = useLogout();
  const deleteAccountMutation = useDeleteAccount();
  const savingProfile = updateProfileMutation.isPending;
  const saving = changePasswordMutation.isPending;
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

  // Redirect to login if user fetch fails (unauthorized)
  useEffect(() => {
    if (userError) {
      router.push('/auth/login');
    }
  }, [userError, router]);

  // Sync profile form with user data
  useEffect(() => {
    if (user) {
      setProfileForm({ displayName: user.displayName || '' });
    }
  }, [user]);

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

    try {
      await updateProfileMutation.mutateAsync(profileForm);
      setSuccess('Profile updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
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

    try {
      await changePasswordMutation.mutateAsync(passwordForm);
      setSuccess('Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setPasswordFieldErrors({});
      setPasswordTouched(new Set());

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to change password');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      router.push('/auth/login');
    } catch (err: any) {
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
      await deleteAccountMutation.mutateAsync({ password: deletePassword });

      // Account deleted successfully - logout and redirect to login
      try { await logoutMutation.mutateAsync(); } catch (_) {}
      router.push('/auth/login?deleted=true');
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-light-canvas dark:bg-dark-canvas p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">
              Settings
            </h1>
            <p className="text-light-text/60 dark:text-dark-text/60 mt-1">
              Manage your account settings
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-xl hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div role="alert" aria-live="assertive" className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
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
          <div role="status" aria-live="polite" className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Profile Information Section */}
        <div className="bg-white dark:bg-dark-bg rounded-xl shadow-sm border border-light-note-border/60 dark:border-dark-note-border/60 p-6 mb-6 overflow-x-hidden w-full">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4">
            Profile Information
          </h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl bg-gray-100 dark:bg-gray-800 text-light-text dark:text-dark-text cursor-not-allowed"
                readOnly
              />
              <p className="mt-1 text-xs text-light-text/50 dark:text-dark-text/50">Email cannot be changed</p>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={profileForm.displayName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, displayName: e.target.value })
                }
                className="w-full px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent outline-none bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text"
                placeholder="Enter your display name"
              />
              <p className="mt-1 text-xs text-light-text/60 dark:text-dark-text/60">
                This name will be displayed in your profile and across the app
              </p>
            </div>

            {user?.createdAt && (
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                  Member Since
                </label>
                <p className="text-light-text dark:text-dark-text" title={formatDateTime(user.createdAt)}>
                  {formatDateTime(user.createdAt)}
                </p>
                <p className="mt-1 text-xs text-light-text/60 dark:text-dark-text/60">
                  Your timezone: {getUserTimezone()}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-3 px-4 bg-light-primary dark:bg-dark-primary text-white rounded-xl hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
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
        <div className="bg-white dark:bg-dark-bg rounded-xl shadow-sm border border-light-note-border/60 dark:border-dark-note-border/60 p-6 overflow-x-hidden w-full">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4">
            Change Password
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                Current Password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => {
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                  if (passwordFieldErrors.currentPassword) {
                    setPasswordFieldErrors(prev => ({ ...prev, currentPassword: undefined }));
                  }
                }}
                onBlur={() => handlePasswordFieldBlur('currentPassword')}
                className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text ${
                  passwordTouched.has('currentPassword') && passwordFieldErrors.currentPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-light-note-border dark:border-dark-note-border focus:ring-light-primary dark:focus:ring-dark-primary'
                }`}
                placeholder="Enter your current password"
              />
              {passwordTouched.has('currentPassword') && passwordFieldErrors.currentPassword && (
                <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordFieldErrors.currentPassword}</p>
              )}
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => {
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                  if (passwordFieldErrors.newPassword) {
                    setPasswordFieldErrors(prev => ({ ...prev, newPassword: undefined }));
                  }
                }}
                onBlur={() => handlePasswordFieldBlur('newPassword')}
                className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text ${
                  passwordTouched.has('newPassword') && passwordFieldErrors.newPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : passwordStrength === 'valid'
                    ? 'border-green-500 focus:ring-green-500'
                    : passwordStrength === 'invalid'
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-light-note-border dark:border-dark-note-border focus:ring-light-primary dark:focus:ring-dark-primary'
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
                <p className="mt-1 text-xs text-light-text/60 dark:text-dark-text/60">
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                value={passwordForm.confirmNewPassword}
                onChange={(e) => {
                  setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value });
                  if (passwordFieldErrors.confirmNewPassword) {
                    setPasswordFieldErrors(prev => ({ ...prev, confirmNewPassword: undefined }));
                  }
                }}
                onBlur={() => handlePasswordFieldBlur('confirmNewPassword')}
                className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:border-transparent outline-none bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text ${
                  passwordTouched.has('confirmNewPassword') && passwordFieldErrors.confirmNewPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : passwordForm.confirmNewPassword && passwordForm.newPassword === passwordForm.confirmNewPassword
                    ? 'border-green-500 focus:ring-green-500'
                    : passwordForm.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-light-note-border dark:border-dark-note-border focus:ring-light-primary dark:focus:ring-dark-primary'
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
                className="flex-1 py-3 px-4 border border-light-note-border dark:border-dark-note-border text-light-text dark:text-dark-text rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 px-4 bg-light-primary dark:bg-dark-primary text-white rounded-xl hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
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
            className="px-6 py-2 border border-light-note-border dark:border-dark-note-border text-light-text dark:text-dark-text rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition"
          >
            Logout
          </button>
        </div>

        {/* Delete Account Section */}
        <div className="mt-8 bg-white dark:bg-dark-bg rounded-xl shadow-sm border-2 border-red-200 dark:border-red-900 p-6 overflow-x-hidden w-full">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            Danger Zone
          </h2>
          <p className="text-light-text dark:text-dark-text mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
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
              className="w-full py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium"
            >
              Delete My Account
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-light-text dark:text-dark-text font-medium">
                {!showSecondConfirmation
                  ? 'Are you sure you want to delete your account?'
                  : 'This is your last chance - are you absolutely certain?'}
              </p>

              <div>
                <label htmlFor="deletePassword" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
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
                  className="w-full px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text"
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
                  className="flex-1 py-3 px-4 border border-light-note-border dark:border-dark-note-border text-light-text dark:text-dark-text rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting || !deletePassword}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
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

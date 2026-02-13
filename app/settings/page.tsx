'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser, useLogout } from '@/hooks/api/useAuth';
import { useUpdateProfile, useChangePassword, useDeleteAccount } from '@/hooks/api/useUser';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SettingsSkeleton } from '@/components/ui/SkeletonLoader';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDateTime, getUserTimezone } from '@/lib/date';
import {
  User,
  Shield,
  Palette,
  AlertTriangle,
  Moon,
  Sun,
  LogOut,
  CheckCircle,
} from 'lucide-react';

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

type SettingsTab = 'profile' | 'security' | 'appearance' | 'danger';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

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
  const passwordStrengthScore = passwordForm.newPassword
    ? Math.max(0, 5 - newPasswordErrors.length)
    : 0;
  const userInitial = user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

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
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your account settings and preferences.
          </p>
        </div>

        {(error || success) && (
          <div className="space-y-3 mb-5">
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                {Array.isArray(error) ? (
                  <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                    {error.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                )}
              </div>
            )}
            {success && (
              <div
                role="status"
                aria-live="polite"
                className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
              >
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <aside className="lg:col-span-3">
            <div className="bg-white dark:bg-[#111827] border border-gray-200/80 dark:border-gray-800 rounded-lg p-2">
              <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1" aria-label="Settings sections">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`type-button flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    activeTab === 'profile'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`type-button flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    activeTab === 'security'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Security</span>
                </button>
                <button
                  onClick={() => setActiveTab('appearance')}
                  className={`type-button flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    activeTab === 'appearance'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  <span>Appearance</span>
                </button>
                <button
                  onClick={() => setActiveTab('danger')}
                  className={`type-button flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    activeTab === 'danger'
                      ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Danger Zone</span>
                </button>
              </nav>
            </div>
          </aside>

          <section className="lg:col-span-9">
            {activeTab === 'profile' && (
              <div className="bg-white dark:bg-[#111827] border border-gray-200/80 dark:border-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h2>

                <div className="flex items-center gap-3 p-4 mb-5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="type-nav text-gray-900 dark:text-white truncate">
                      {user?.displayName || user?.email || 'User'}
                    </p>
                    <p className="type-meta text-gray-500 dark:text-gray-400 truncate">{user?.email || ''}</p>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                      readOnly
                    />
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Email cannot be changed</p>
                  </div>

                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Display Name
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={profileForm.displayName}
                      onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your display name"
                    />
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      This name will be displayed in your profile and across the app
                    </p>
                  </div>

                  {user?.createdAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Member Since</label>
                      <p className="text-sm text-gray-900 dark:text-white" title={formatDateTime(user.createdAt)}>
                        {formatDateTime(user.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Your timezone: {getUserTimezone()}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="type-button inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingProfile ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="type-button inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white dark:bg-[#111827] border border-gray-200/80 dark:border-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                      className={`w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white ${
                        passwordTouched.has('currentPassword') && passwordFieldErrors.currentPassword
                          ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
                          : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
                      }`}
                      placeholder="Enter your current password"
                    />
                    {passwordTouched.has('currentPassword') && passwordFieldErrors.currentPassword && (
                      <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordFieldErrors.currentPassword}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                      className={`w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white ${
                        passwordTouched.has('newPassword') && passwordFieldErrors.newPassword
                          ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
                          : passwordStrength === 'valid'
                          ? 'border-green-400 dark:border-green-500 focus:ring-green-500'
                          : passwordStrength === 'invalid'
                          ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
                          : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
                      }`}
                      placeholder="Enter new password"
                    />

                    {passwordForm.newPassword && (
                      <div className="mt-2 flex gap-1.5" aria-label="Password strength indicator">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <div
                            key={index}
                            className={`h-1.5 flex-1 rounded-full ${
                              index < passwordStrengthScore
                                ? passwordStrengthScore >= 4
                                  ? 'bg-green-500'
                                  : passwordStrengthScore >= 2
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {passwordTouched.has('newPassword') && passwordFieldErrors.newPassword && (
                      <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordFieldErrors.newPassword}</p>
                    )}
                    {passwordForm.newPassword && hasPasswordErrors && !passwordFieldErrors.newPassword && (
                      <ul role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                        {newPasswordErrors.map((newPasswordError, index) => (
                          <li key={index}>{newPasswordError}</li>
                        ))}
                      </ul>
                    )}
                    {passwordForm.newPassword && !hasPasswordErrors && !passwordFieldErrors.newPassword && (
                      <p className="mt-2 text-sm text-green-600 dark:text-green-400">✓ Password meets all requirements</p>
                    )}
                    {!passwordForm.newPassword && (
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        Must be at least 8 characters with uppercase, lowercase, number, and special character
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                      className={`w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white ${
                        passwordTouched.has('confirmNewPassword') && passwordFieldErrors.confirmNewPassword
                          ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
                          : passwordForm.confirmNewPassword && passwordForm.newPassword === passwordForm.confirmNewPassword
                          ? 'border-green-400 dark:border-green-500 focus:ring-green-500'
                          : passwordForm.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword
                          ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
                          : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
                      }`}
                      placeholder="Confirm new password"
                    />
                    {passwordTouched.has('confirmNewPassword') && passwordFieldErrors.confirmNewPassword && (
                      <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordFieldErrors.confirmNewPassword}</p>
                    )}
                    {passwordForm.confirmNewPassword && !passwordFieldErrors.confirmNewPassword && passwordForm.newPassword === passwordForm.confirmNewPassword && (
                      <p className="mt-1 text-sm text-green-600 dark:text-green-400">✓ Passwords match</p>
                    )}
                    {passwordForm.confirmNewPassword && !passwordFieldErrors.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">Passwords do not match</p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
                        setPasswordFieldErrors({});
                        setPasswordTouched(new Set());
                      }}
                      disabled={saving}
                      className="type-button flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="type-button flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            )}

            {activeTab === 'appearance' && (
              <div className="bg-white dark:bg-[#111827] border border-gray-200/80 dark:border-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Appearance</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Choose how Infinite Canvas looks for you.</p>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="type-nav text-gray-900 dark:text-white">Theme</p>
                    <p className="type-meta text-gray-500 dark:text-gray-400 mt-1">
                      Current: {theme === 'light' ? 'Light mode' : 'Dark mode'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="type-button inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  >
                    {theme === 'light' ? (
                      <>
                        <Moon className="w-4 h-4" />
                        Switch to Dark
                      </>
                    ) : (
                      <>
                        <Sun className="w-4 h-4" />
                        Switch to Light
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="bg-white dark:bg-[#111827] border-2 border-red-200 dark:border-red-900/80 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-3">Danger Zone</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <strong>Warning:</strong> This will permanently delete your account and all associated data, including:
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside mt-2 space-y-0.5">
                    <li>All your canvases and notes</li>
                    <li>All folders and organizational structure</li>
                    <li>All images and attachments</li>
                    <li>Your profile information</li>
                    <li>All settings and preferences</li>
                  </ul>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                    <strong>This action cannot be undone.</strong>
                  </p>
                </div>

                {!showDeleteConfirmation ? (
                  <button
                    onClick={handleInitiateDelete}
                    className="type-button w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Delete My Account
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="type-nav text-gray-900 dark:text-white">
                      {!showSecondConfirmation
                        ? 'Are you sure you want to delete your account?'
                        : 'This is your last chance - are you absolutely certain?'}
                    </p>

                    <div>
                      <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                        className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                        placeholder="Enter your password"
                        disabled={deleting}
                      />
                    </div>

                    {deleteError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleCancelDelete}
                        disabled={deleting}
                        className="type-button flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        disabled={deleting || !deletePassword}
                        className="type-button flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

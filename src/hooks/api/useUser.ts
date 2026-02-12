'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api';
import { userKeys } from '@/lib/queryKeys';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { displayName: string }) => userApi.updateProfile(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string; confirmNewPassword: string }) =>
      userApi.changePassword(body),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (body: { password: string }) => userApi.deleteAccount(body),
  });
}

export function useUpdateSettings() {
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => userApi.updateSettings(body),
  });
}

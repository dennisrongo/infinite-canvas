'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { userKeys, authKeys } from '@/lib/queryKeys';

export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: () => authApi.me(),
  });
}

export function useCsrfToken() {
  return useQuery({
    queryKey: authKeys.csrf,
    queryFn: () => authApi.csrf(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (body: { email: string; password: string; rememberMe?: boolean }) =>
      authApi.login(body),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: { email: string; password: string; confirmPassword: string }) =>
      authApi.register(body),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: { email: string }) => authApi.forgotPassword(body),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: { token: string; password: string; confirmPassword: string }) =>
      authApi.resetPassword(body),
  });
}

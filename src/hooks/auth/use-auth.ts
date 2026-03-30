'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/src/lib/axios';
import { useAuthStore } from '@/src/stores/auth.store';
import type { AuthResponse, LoginRequest } from '@/src/types/auth.types';


export function useLogin() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) =>
      api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

    onSuccess: (data) => {
      qc.clear();
      setAuth(data.user, data.access_token, data.refresh_token);
      toast.success(`Bienvenido, ${data.user.first_name}`);

     
      if (data.user.is_first_login) {
        router.replace('/auth/change-password');
      } else {
        router.replace('/dashboard/dashboard');
      }
    },

    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Credenciales inválidas'));
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const { refreshToken, clearAuth } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post('/auth/logout', { refresh_token: refreshToken }),

    onSuccess: () => {
      qc.clear();
      clearAuth();
      router.replace('/auth/login');
    },

    onError: () => {
   
      clearAuth();
      router.replace('/auth/login');
    },
  });
}

export function useVerifyEmail(token: string | null) {
  return useMutation({
    mutationFn: () =>
      api.get(`/auth/verify-email?token=${token}`).then((r) => r.data),
  });
}


export function useChangePassword() {
  const router     = useRouter();
  const { updateUser } = useAuthStore();

  return useMutation({
    mutationFn: (data: { new_password: string; current_password?: string }) =>
      api.patch('/users/me/change-password', data).then((r) => r.data),

    onSuccess: () => {
      updateUser({ is_first_login: false });
      toast.success('Contraseña actualizada correctamente.');
      router.replace('/auth/login');
    },

    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al cambiar la contraseña'));
    },
  });
}
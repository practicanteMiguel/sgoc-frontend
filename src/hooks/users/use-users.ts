import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/src/lib/axios';
import type { User, PaginatedResponse } from '@/src/types/user.types';

// ── Listar usuarios ────────────────────────────────────────────
export function useUsers(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['users', { page, limit }],
    queryFn:  () =>
      api.get<PaginatedResponse<User>>(`/users?page=${page}&limit=${limit}`)
         .then((r) => r.data),
  });
}

// ── Obtener un usuario por ID ──────────────────────────────────
export function useUser(id: string | null) {
  return useQuery({
    queryKey: ['users', id],
    queryFn:  () =>
      api.get<User>(`/users/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

// ── Crear usuario ──────────────────────────────────────────────
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email:         string;
      first_name:    string;
      last_name:     string;
      position:      string;
      role_slug:     string;
      phone?:        string;
      field?:        string;
      module?:       string;
      temp_password?: string;
    }) => api.post<User>('/users', data).then((r) => r.data),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Usuario ${user.first_name} creado. Se envió email de bienvenida.`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear el usuario'));
    },
  });
}

// ── Actualizar usuario ─────────────────────────────────────────
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      api.patch<User>(`/users/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario actualizado correctamente');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar'));
    },
  });
}

// ── Eliminar usuario ───────────────────────────────────────────
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/users/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario eliminado');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar'));
    },
  });
}

// ── Admin resetea contraseña ───────────────────────────────────
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, new_password }: { id: string; new_password: string }) =>
      api.patch(`/users/${id}/reset-password`, { new_password }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Contraseña reseteada. Se notificó al usuario por email.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al resetear contraseña'));
    },
  });
}
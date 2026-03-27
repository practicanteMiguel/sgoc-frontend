import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/src/lib/axios';
import type { Role, Permission } from '@/src/types/user.types';



// ── Listar roles ───────────────────────────────────────────────
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn:  () =>
      api.get<Role[]>('/roles').then((r) => r.data),
  });
}

// ── Todos los permisos disponibles ────────────────────────────
export function useAllPermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn:  () =>
      api.get<Permission[]>('/roles/permissions').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

// ── Permisos de un rol específico ─────────────────────────────
export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ['roles', roleId, 'permissions'],
    queryFn:  () =>
      api.get(`/roles/${roleId}/permissions`).then((r) => r.data),
    enabled: !!roleId,
  });
}

// ── Agregar permisos a un rol ──────────────────────────────────
export function useAddPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      api.post(`/roles/${roleId}/permissions/add`, { permissions }).then((r) => r.data),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success(data.message ?? 'Permisos agregados');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al agregar permisos');
    },
  });
}

// ── Quitar permisos de un rol ──────────────────────────────────
export function useRemovePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      api.post(`/roles/${roleId}/permissions/remove`, { permissions }).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success(data.message ?? 'Permisos removidos');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al remover permisos');
    },
  });
}
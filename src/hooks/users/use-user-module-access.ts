import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/src/lib/axios';

export interface UserModuleAccess {
  module_slug: string;
  module?:     string; // fallback por si el backend usa "module" en lugar de "module_slug"
  can_view:    boolean;
  can_create:  boolean;
  can_edit:    boolean;
  can_delete:  boolean;
  can_export:  boolean;
}

export interface UserAccessPerms {
  can_create: boolean;
  can_edit:   boolean;
  can_delete: boolean;
  can_export: boolean;
}

// ── GET accesos individuales de un usuario ────────────────────
export function useUserModuleAccess(userId: string | null) {
  return useQuery({
    queryKey: ['modules', 'user', userId],
    queryFn:  () =>
      api
        .get<UserModuleAccess[]>(`/modules/user/${userId}`)
        .then((r) => {
          const list: any[] = Array.isArray(r.data) ? r.data : (r.data as any)?.data ?? [];
          // normalizar: backend puede devolver snake_case o camelCase,
          // y "module" puede ser string o un objeto con { slug }
          return list.map((m): UserModuleAccess => {
            const slug =
              m.module_slug ??
              m.moduleSlug ??
              m.slug ??
              (typeof m.module === 'string' ? m.module : m.module?.slug) ??
              '';
            return {
              module_slug: slug,
              can_view:    m.can_view   ?? m.canView   ?? true,
              can_create:  m.can_create ?? m.canCreate ?? false,
              can_edit:    m.can_edit   ?? m.canEdit   ?? false,
              can_delete:  m.can_delete ?? m.canDelete ?? false,
              can_export:  m.can_export ?? m.canExport ?? false,
            };
          });
        }),
    enabled:   !!userId,
    staleTime: 0, // siempre fresco al abrir el modal
  });
}

// ── PUT — asignar o actualizar un módulo individual ───────────
export function useAssignUserModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      moduleSlug,
      permissions,
    }: {
      userId:      string;
      moduleSlug:  string;
      permissions: Partial<UserAccessPerms>;
    }) =>
      api
        .put(`/modules/user/${userId}/module/${moduleSlug}`, permissions)
        .then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['modules', 'user', vars.userId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al asignar módulo');
    },
  });
}

// ── DELETE — revocar un módulo individual ─────────────────────
export function useRevokeUserModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, moduleSlug }: { userId: string; moduleSlug: string }) =>
      api.delete(`/modules/user/${userId}/module/${moduleSlug}`).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['modules', 'user', vars.userId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al revocar módulo');
    },
  });
}

// ── DELETE — limpiar todos los accesos individuales (vuelve al rol) ──
export function useClearUserModuleAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      api.delete(`/modules/user/${userId}`).then((r) => r.data),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['modules', 'user', vars.userId] });
      toast.success(
        typeof data?.message === 'string'
          ? data.message
          : 'Accesos individuales eliminados. Se usarán los del rol.',
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al limpiar accesos');
    },
  });
}

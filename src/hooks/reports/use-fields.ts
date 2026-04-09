import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/src/lib/axios';
import type { Field } from '@/src/types/reports.types';
import type { PaginatedResponse } from '@/src/types/user.types';

export function useFields(page = 1, limit = 100) {
  return useQuery({
    queryKey: ['fields', { page, limit }],
    queryFn: () =>
      api.get<PaginatedResponse<Field>>(`/fields?page=${page}&limit=${limit}`)
         .then((r) => r.data),
  });
}

export function useField(id: string | null) {
  return useQuery({
    queryKey: ['fields', id],
    queryFn: () => api.get<Field>(`/fields/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; location: string }) =>
      api.post<Field>('/fields', data).then((r) => r.data),
    onSuccess: (field) => {
      qc.invalidateQueries({ queryKey: ['fields'] });
      toast.success(`Planta "${field.name}" creada correctamente`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear la planta'));
    },
  });
}

export function useUpdateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; location?: string }) =>
      api.patch<Field>(`/fields/${id}`, data).then((r) => r.data),
    onSuccess: (field) => {
      qc.invalidateQueries({ queryKey: ['fields'] });
      toast.success(`Planta "${field.name}" actualizada`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar'));
    },
  });
}

export function useDeleteField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/fields/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fields'] });
      toast.success('Planta eliminada');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar'));
    },
  });
}

export function useAssignSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fieldId, user_id }: { fieldId: string; user_id: string }) =>
      api.post(`/fields/${fieldId}/supervisor`, { user_id }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fields'] });
      toast.success('Supervisor asignado correctamente');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al asignar supervisor'));
    },
  });
}

export function useRemoveSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fieldId: string) =>
      api.delete(`/fields/${fieldId}/supervisor`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fields'] });
      toast.success('Supervisor removido de la planta');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al remover supervisor'));
    },
  });
}

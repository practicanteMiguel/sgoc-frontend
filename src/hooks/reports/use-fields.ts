import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { api } from '@/src/lib/axios';
import type { Field, FieldLugar } from '@/src/types/reports.types';
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
    mutationFn: (data: { name: string; location: string; center_lat?: number | null; center_lng?: number | null }) =>
      api.post<Field>('/fields', data).then((r) => r.data),
    onSuccess: (field) => {
      qc.invalidateQueries({ queryKey: ['fields'] });
      toast.success(`Planta "${field.name}" creada correctamente`);
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear la planta'));
    },
  });
}

export function useUpdateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; location?: string; center_lat?: number | null; center_lng?: number | null }) =>
      api.patch<Field>(`/fields/${id}`, data).then((r) => r.data),
    onSuccess: (field) => {
      qc.invalidateQueries({ queryKey: ['fields'] });
      toast.success(field.name ? `Planta "${field.name}" actualizada` : 'Planta actualizada');
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message;
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
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message;
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
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message;
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
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al remover supervisor'));
    },
  });
}

export function useActualizarPresupuesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, presupuesto }: { id: string; presupuesto: number | null }) =>
      api.patch<{ id: string; name: string; presupuesto: number | null }>(`/fields/${id}/presupuesto`, { presupuesto }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fields'] });
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar presupuesto'));
    },
  });
}

export function useFieldLugares(fieldId: string | null) {
  return useQuery({
    queryKey: ['field-lugares', fieldId],
    queryFn: () => api.get<FieldLugar[]>(`/fields/${fieldId}/lugares`).then((r) => r.data),
    enabled: !!fieldId,
  });
}

export function useCreateFieldLugar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fieldId, nombre, lote }: { fieldId: string; nombre: string; lote?: number }) =>
      api.post<FieldLugar>(`/fields/${fieldId}/lugares`, { nombre, ...(lote != null ? { lote } : {}) }).then((r) => r.data),
    onSuccess: (_, { fieldId }) => {
      qc.invalidateQueries({ queryKey: ['field-lugares', fieldId] });
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear lugar'));
    },
  });
}

export function useActualizarFieldLugarPresupuesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fieldId, lugarId, presupuesto }: { fieldId: string; lugarId: string; presupuesto: number | null }) =>
      api.patch<FieldLugar>(`/fields/${fieldId}/lugares/${lugarId}/presupuesto`, { presupuesto }).then((r) => r.data),
    onSuccess: (_, { fieldId }) => {
      qc.invalidateQueries({ queryKey: ['field-lugares', fieldId] });
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar presupuesto'));
    },
  });
}

export function useDeleteFieldLugar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fieldId, lugarId }: { fieldId: string; lugarId: string }) =>
      api.delete(`/fields/${fieldId}/lugares/${lugarId}`).then((r) => r.data),
    onSuccess: (_, { fieldId }) => {
      qc.invalidateQueries({ queryKey: ['field-lugares', fieldId] });
      toast.success('Lugar eliminado');
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar lugar'));
    },
  });
}

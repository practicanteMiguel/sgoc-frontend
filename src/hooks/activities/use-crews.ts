import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'
import type { Crew, PaginatedCrews } from '@/src/types/activities.types'

export function useCrews(params?: { field_id?: string; page?: number; limit?: number }) {
  const q = new URLSearchParams()
  if (params?.field_id) q.set('field_id', params.field_id)
  q.set('page',  String(params?.page  ?? 1))
  q.set('limit', String(params?.limit ?? 100))
  return useQuery({
    queryKey: ['crews', params],
    queryFn: () => api.get<PaginatedCrews>(`/crews?${q}`).then((r) => r.data),
  })
}

export function useCrew(id: string | null) {
  return useQuery({
    queryKey: ['crew', id],
    queryFn: () => api.get<Crew>(`/crews/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateCrew() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, is_soldadura }: { name: string; is_soldadura?: boolean }) =>
      api.post<Crew>('/crews', { name, is_soldadura }).then((r) => r.data),
    onSuccess: (crew) => {
      qc.invalidateQueries({ queryKey: ['crews'] })
      toast.success(`Cuadrilla "${crew.name}" creada`)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear cuadrilla'))
    },
  })
}

export function useRenameCrew() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Crew>(`/crews/${id}`, { name }).then((r) => r.data),
    onSuccess: (crew) => {
      qc.invalidateQueries({ queryKey: ['crews'] })
      qc.invalidateQueries({ queryKey: ['crew', crew.id] })
      toast.success(`Cuadrilla renombrada a "${crew.name}"`)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al renombrar'))
    },
  })
}

export function useDeleteCrew() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/crews/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crews'] })
      toast.success('Cuadrilla eliminada')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar'))
    },
  })
}

export function useAddCrewEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ crewId, employee_id }: { crewId: string; employee_id: string }) =>
      api.post(`/crews/${crewId}/employees`, { employee_id }).then((r) => r.data),
    onSuccess: (_d, { crewId }) => {
      qc.invalidateQueries({ queryKey: ['crew', crewId] })
      qc.invalidateQueries({ queryKey: ['crews'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al agregar empleado'))
    },
  })
}

export function useRemoveCrewEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ crewId, employeeId }: { crewId: string; employeeId: string }) =>
      api.delete(`/crews/${crewId}/employees/${employeeId}`).then((r) => r.data),
    onSuccess: (_d, { crewId }) => {
      qc.invalidateQueries({ queryKey: ['crew', crewId] })
      qc.invalidateQueries({ queryKey: ['crews'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al remover empleado'))
    },
  })
}

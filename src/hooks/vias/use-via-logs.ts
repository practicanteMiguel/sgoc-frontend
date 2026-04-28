import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'
import type { ViaMonthlyLog, ViaMonthlyLogSummary, PaginatedViaLogs } from '@/src/types/vias.types'

export function useViaLogs(params?: { field_id?: string; year?: number; month?: number }) {
  const search = new URLSearchParams()
  if (params?.field_id) search.set('field_id', params.field_id)
  if (params?.year)     search.set('year', String(params.year))
  if (params?.month)    search.set('month', String(params.month))
  search.set('limit', '100')
  return useQuery({
    queryKey: ['via-logs', params],
    queryFn: () => api.get<PaginatedViaLogs>(`/via-logs?${search}`).then((r) => r.data),
  })
}

export function useViaLog(id: string | null) {
  return useQuery({
    queryKey: ['via-logs', id],
    queryFn: () => api.get<ViaMonthlyLog>(`/via-logs/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 20000,
  })
}

export function useViaLogToken(id: string | null) {
  return useQuery({
    queryKey: ['via-logs', id, 'token'],
    queryFn: () => api.get<{ vault_token: string }>(`/via-logs/${id}/token`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateViaLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { field_id: string; month: number; year: number }) =>
      api.post<ViaMonthlyLog>('/via-logs', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['via-logs'] })
      toast.success('Registro mensual creado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear el registro'))
    },
  })
}

export function useDeleteViaLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/via-logs/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['via-logs'] })
      toast.success('Registro eliminado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar'))
    },
  })
}

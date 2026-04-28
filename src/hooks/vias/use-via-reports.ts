import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'
import type { ViaReport, ViaState, ViaReportType, PaginatedViaReports } from '@/src/types/vias.types'

export function useViaReports(params?: { field_id?: string; type?: ViaReportType; year?: number; month?: number }) {
  const search = new URLSearchParams()
  if (params?.field_id) search.set('field_id', params.field_id)
  if (params?.type)     search.set('type', params.type)
  if (params?.year)     search.set('year', String(params.year))
  if (params?.month)    search.set('month', String(params.month))
  search.set('limit', '100')
  return useQuery({
    queryKey: ['via-reports', params],
    queryFn: () => api.get<PaginatedViaReports>(`/via-reports?${search}`).then((r) => r.data),
  })
}

export function useViaReport(id: string | null) {
  return useQuery({
    queryKey: ['via-reports', id],
    queryFn: () => api.get<ViaReport>(`/via-reports/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export interface CreateViaReportItem {
  capture_group_id?: string
  via_name: string
  state: ViaState
  observations?: string
}

export function useCreateViaReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      monthly_log_id: string
      type: ViaReportType
      general_observations?: string
      items: CreateViaReportItem[]
    }) => api.post<ViaReport>('/via-reports', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['via-reports'] })
      qc.invalidateQueries({ queryKey: ['via-logs'] })
      toast.success('Informe creado correctamente')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear el informe'))
    },
  })
}

export function useDeleteViaReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/via-reports/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['via-reports'] })
      toast.success('Informe eliminado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar'))
    },
  })
}

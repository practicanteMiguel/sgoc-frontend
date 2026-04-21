import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'
import type { TechnicalReport, PaginatedReports } from '@/src/types/activities.types'

interface ReportsParams {
  crew_id?: string
  page?: number
  limit?: number
}

export function useTechnicalReports(params?: ReportsParams) {
  const q = new URLSearchParams()
  if (params?.crew_id) q.set('crew_id', params.crew_id)
  q.set('page',  String(params?.page  ?? 1))
  q.set('limit', String(params?.limit ?? 200))
  return useQuery({
    queryKey: ['technical-reports', params],
    queryFn: () =>
      api.get<PaginatedReports | TechnicalReport[]>(`/technical-reports?${q}`)
        .then((r) => {
          const raw = r.data
          return Array.isArray(raw) ? raw : (raw.data ?? [])
        }),
  })
}

export function useTechnicalReport(id: string | null) {
  return useQuery({
    queryKey: ['technical-report', id],
    queryFn: () => api.get<TechnicalReport>(`/technical-reports/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

interface ActivityPayload {
  activity_id: string
  requirement?: string
  additional_resource?: string
  progress?: string
  is_scheduled?: boolean
}

interface CreatePayload {
  log_id: string
  activities: ActivityPayload[]
}

export function useCreateTechnicalReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePayload) =>
      api.post<TechnicalReport>('/technical-reports', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['technical-reports'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear reporte'))
    },
  })
}

interface UpdatePayload {
  activities: ActivityPayload[]
}

export function useUpdateTechnicalReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePayload }) =>
      api.patch<TechnicalReport>(`/technical-reports/${id}`, data).then((r) => r.data),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: ['technical-reports'] })
      qc.invalidateQueries({ queryKey: ['technical-report', report.id] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar reporte'))
    },
  })
}

export function useDeleteTechnicalReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/technical-reports/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['technical-reports'] })
      toast.success('Reporte eliminado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar reporte'))
    },
  })
}

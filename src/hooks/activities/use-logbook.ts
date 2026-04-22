import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'
import type { WeeklyLog, WeeklyLogSummary, Activity } from '@/src/types/activities.types'

interface LogsParams {
  crew_id?: string
  year?: number
  week?: number
}

export function useLogs(params?: LogsParams) {
  const q = new URLSearchParams()
  if (params?.crew_id) q.set('crew_id', params.crew_id)
  if (params?.year)    q.set('year',    String(params.year))
  if (params?.week)    q.set('week',    String(params.week))
  return useQuery({
    queryKey: ['logbook', params],
    queryFn: () =>
      api.get<{ data: WeeklyLogSummary[]; total: number } | WeeklyLogSummary[]>(`/logbook?${q}`)
        .then((r) => {
          const raw = r.data
          return Array.isArray(raw) ? raw : (raw.data ?? [])
        }),
  })
}

export function useLog(id: string | null) {
  return useQuery({
    queryKey: ['logbook-detail', id],
    queryFn: () => api.get<WeeklyLog>(`/logbook/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { crew_id: string; week_number: number; year: number }) =>
      api.post<WeeklyLog>('/logbook', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logbook'] })
      toast.success('Bitacora creada')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear bitacora'))
    },
  })
}

export function useAddActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ logId, data }: { logId: string; data: FormData }) =>
      api.post<Activity>(`/logbook/${logId}/activities`, data, {
        headers: { 'Content-Type': undefined },
        timeout: 0,
      }).then((r) => r.data),
    onSuccess: (_d, { logId }) => {
      qc.invalidateQueries({ queryKey: ['logbook-detail', logId] })
      toast.success('Actividad agregada')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al agregar actividad'))
    },
  })
}

export function useUpdateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ logId, activityId, data }: { logId: string; activityId: string; data: FormData }) =>
      api.patch<Activity>(`/logbook/${logId}/activities/${activityId}`, data, {
        headers: { 'Content-Type': undefined },
        timeout: 0,
      }).then((r) => r.data),
    onSuccess: (_d, { logId }) => {
      qc.invalidateQueries({ queryKey: ['logbook-detail', logId] })
      toast.success('Actividad actualizada')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar actividad'))
    },
  })
}

export function useDeleteActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ logId, activityId }: { logId: string; activityId: string }) =>
      api.delete(`/logbook/${logId}/activities/${activityId}`).then((r) => r.data),
    onSuccess: (_d, { logId }) => {
      qc.invalidateQueries({ queryKey: ['logbook-detail', logId] })
      qc.invalidateQueries({ queryKey: ['vault', logId] })
      toast.success('Actividad eliminada')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar actividad'))
    },
  })
}

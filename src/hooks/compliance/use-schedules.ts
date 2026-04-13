import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'
import type { Schedule, ScheduleTipo, Turno } from '@/src/types/compliance.types'

interface SchedulesParams {
  field_id?: string
  mes?: number
  anio?: number
  tipo?: ScheduleTipo
}

export function useSchedules(params: SchedulesParams = {}) {
  const q = new URLSearchParams()
  if (params.field_id) q.set('field_id', params.field_id)
  if (params.mes)      q.set('mes', String(params.mes))
  if (params.anio)     q.set('anio', String(params.anio))
  if (params.tipo)     q.set('tipo', params.tipo)
  return useQuery({
    queryKey: ['compliance-schedules', params],
    queryFn: () =>
      api.get<Schedule[]>(`/compliance/schedules?${q}`).then((r) => r.data),
    enabled: !!params.field_id,
  })
}

export function useSchedule(id: string | null) {
  return useQuery({
    queryKey: ['compliance-schedule', id],
    queryFn: () =>
      api.get<Schedule>(`/compliance/schedules/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { field_id: string; mes: number; anio: number; tipo: ScheduleTipo }) =>
      api.post<Schedule>('/compliance/schedules', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-schedules'] })
      toast.success('Horario creado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear horario'))
    },
  })
}

export function useUpdateScheduleDays() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      days,
    }: {
      id: string
      days: Array<{ employee_id: string; fecha: string; turno: Turno }>
    }) =>
      api.put(`/compliance/schedules/${id}/days`, { days }).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['compliance-schedule', vars.id] })
      toast.success('Horario guardado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al guardar horario'))
    },
  })
}

export function useCloseSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<Schedule>(`/compliance/schedules/${id}/close`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-schedules'] })
      qc.invalidateQueries({ queryKey: ['compliance-schedule'] })
      qc.invalidateQueries({ queryKey: ['compliance-deliverables'] })
      qc.invalidateQueries({ queryKey: ['compliance-month-detail'] })
      toast.success('Horario cerrado y vinculado al entregable')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al cerrar horario'))
    },
  })
}

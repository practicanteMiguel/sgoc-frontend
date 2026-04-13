import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'
import type { Deliverable, MonthDetail, ComplianceSummaryRow } from '@/src/types/compliance.types'

interface DeliverablesParams {
  field_id?: string
  mes?: number
  anio?: number
  status?: string
  format_type?: string
}

export function useDeliverables(params: DeliverablesParams = {}) {
  const q = new URLSearchParams()
  if (params.field_id)    q.set('field_id', params.field_id)
  if (params.mes)         q.set('mes', String(params.mes))
  if (params.anio)        q.set('anio', String(params.anio))
  if (params.status)      q.set('status', params.status)
  if (params.format_type) q.set('format_type', params.format_type)
  return useQuery({
    queryKey: ['compliance-deliverables', params],
    queryFn: () =>
      api.get<Deliverable[]>(`/compliance/deliverables?${q}`).then((r) => r.data),
  })
}

export function useDeliverablesSummary(params: { field_id?: string; anio?: number } = {}) {
  const q = new URLSearchParams()
  if (params.field_id) q.set('field_id', params.field_id)
  if (params.anio)     q.set('anio', String(params.anio))
  return useQuery({
    queryKey: ['compliance-summary', params],
    queryFn: () =>
      api.get<ComplianceSummaryRow[]>(`/compliance/deliverables/summary?${q}`).then((r) => r.data),
  })
}

export function useMonthDetail(fieldId: string | null, anio: number, mes: number) {
  return useQuery({
    queryKey: ['compliance-month-detail', fieldId, anio, mes],
    queryFn: () =>
      api
        .get<MonthDetail>(`/compliance/deliverables/month/${fieldId}/${anio}/${mes}`)
        .then((r) => r.data),
    enabled: !!fieldId,
  })
}

export function useGenerateMonth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { field_id: string; mes: number; anio: number; due_date?: string }) =>
      api
        .post<{ message: string; deliverables: Deliverable[] }>(
          '/compliance/deliverables/generate-month',
          data,
        )
        .then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['compliance-deliverables'] })
      qc.invalidateQueries({ queryKey: ['compliance-month-detail'] })
      qc.invalidateQueries({ queryKey: ['compliance-summary'] })
      toast.success(res.message ?? 'Mes generado correctamente')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al generar mes'))
    },
  })
}

export function useSubmitDeliverable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<Deliverable>(`/compliance/deliverables/${id}/submit`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-deliverables'] })
      qc.invalidateQueries({ queryKey: ['compliance-month-detail'] })
      qc.invalidateQueries({ queryKey: ['compliance-summary'] })
      toast.success('Entregable marcado como entregado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al entregar'))
    },
  })
}

export function useWaiveDeliverable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api
        .patch<Deliverable>(`/compliance/deliverables/${id}/waive`, { reason })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-deliverables'] })
      qc.invalidateQueries({ queryKey: ['compliance-month-detail'] })
      toast.success('Marcado como no aplica')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al marcar no aplica'))
    },
  })
}

export function useMarkViewed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<Deliverable>(`/compliance/deliverables/${id}/viewed`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-deliverables'] })
      qc.invalidateQueries({ queryKey: ['compliance-month-detail'] })
    },
  })
}

export function useUnwaiveDeliverable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<Deliverable>(`/compliance/deliverables/${id}/waive`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-deliverables'] })
      qc.invalidateQueries({ queryKey: ['compliance-month-detail'] })
      toast.success('Revertido a pendiente')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al revertir'))
    },
  })
}

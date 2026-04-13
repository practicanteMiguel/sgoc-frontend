import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'
import type {
  TaxiRecord,
  PernoctacionRecord,
  DisponibilidadRecord,
  HorasExtraRecord,
} from '@/src/types/compliance.types'

// ── Taxi ─────────────────────────────────────────────────────────────────────
export function useTaxiRecords(deliverableId: string | null) {
  return useQuery({
    queryKey: ['compliance-taxi', deliverableId],
    queryFn: () =>
      api
        .get<TaxiRecord[]>(`/compliance/deliverables/${deliverableId}/taxi`)
        .then((r) => r.data),
    enabled: !!deliverableId,
  })
}

export function useSaveTaxi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      deliverableId,
      rows,
    }: {
      deliverableId: string
      rows: Array<{
        employee_id: string
        fecha: string
        desde: string
        hasta: string
        trayecto_taxi: string
        descripcion?: string
      }>
    }) =>
      api
        .post(`/compliance/deliverables/${deliverableId}/taxi`, { rows })
        .then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['compliance-taxi', vars.deliverableId] })
      toast.success('Formato taxi guardado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al guardar taxi'))
    },
  })
}

// ── Pernoctacion ─────────────────────────────────────────────────────────────
export function usePernoctacionRecords(deliverableId: string | null) {
  return useQuery({
    queryKey: ['compliance-pernoctacion', deliverableId],
    queryFn: () =>
      api
        .get<PernoctacionRecord[]>(`/compliance/deliverables/${deliverableId}/pernoctacion`)
        .then((r) => r.data),
    enabled: !!deliverableId,
  })
}

export function useSavePernoctacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      deliverableId,
      rows,
    }: {
      deliverableId: string
      rows: Array<{ employee_id: string; fecha: string; vr_dia: number }>
    }) =>
      api
        .post(`/compliance/deliverables/${deliverableId}/pernoctacion`, { rows })
        .then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['compliance-pernoctacion', vars.deliverableId] })
      toast.success('Formato pernoctacion guardado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al guardar'))
    },
  })
}

// ── Disponibilidad ────────────────────────────────────────────────────────────
export function useDisponibilidadRecords(deliverableId: string | null) {
  return useQuery({
    queryKey: ['compliance-disponibilidad', deliverableId],
    queryFn: () =>
      api
        .get<DisponibilidadRecord[]>(`/compliance/deliverables/${deliverableId}/disponibilidad`)
        .then((r) => r.data),
    enabled: !!deliverableId,
  })
}

export function useSaveDisponibilidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      deliverableId,
      rows,
    }: {
      deliverableId: string
      rows: Array<{
        employee_id: string
        fecha_inicio: string
        fecha_final: string
        valor_total: number
        descripcion?: string
        quien_reporta?: string
      }>
    }) =>
      api
        .post(`/compliance/deliverables/${deliverableId}/disponibilidad`, { rows })
        .then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['compliance-disponibilidad', vars.deliverableId] })
      toast.success('Formato disponibilidad guardado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al guardar'))
    },
  })
}

// ── Horas Extra ───────────────────────────────────────────────────────────────
export function useHorasExtraRecords(deliverableId: string | null) {
  return useQuery({
    queryKey: ['compliance-horas-extra', deliverableId],
    queryFn: () =>
      api
        .get<HorasExtraRecord[]>(`/compliance/deliverables/${deliverableId}/horas-extra`)
        .then((r) => r.data),
    enabled: !!deliverableId,
  })
}

export function useSaveHorasExtra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      deliverableId,
      rows,
    }: {
      deliverableId: string
      rows: Array<{
        employee_id: string
        fecha_reporte: string
        entrada?: string
        salida?: string
        hed: number
        hen: number
        hfd: number
        hefd: number
        hefn: number
        rn: number
        actividad?: string
      }>
    }) =>
      api
        .post(`/compliance/deliverables/${deliverableId}/horas-extra`, { rows })
        .then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['compliance-horas-extra', vars.deliverableId] })
      toast.success('Formato horas extra guardado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al guardar'))
    },
  })
}

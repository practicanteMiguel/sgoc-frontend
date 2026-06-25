import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { api } from '@/src/lib/axios'
import type {
  Requisicion,
  RequisicionSummary,
  CreateRequisicionDto,
  LlenadoDto,
  EnvioMasivoDto,
  EnvioMasivoResult,
  EstadoRQ,
  FacturaItemDto,
  RecepcionDto,
} from '@/src/types/consumables.types'

export function useRequisiciones(params?: { mes?: number; anio?: number }) {
  const qs = new URLSearchParams()
  if (params?.mes)  qs.set('mes',  String(params.mes))
  if (params?.anio) qs.set('anio', String(params.anio))
  const queryStr = qs.toString()
  return useQuery({
    queryKey: ['requisiciones', params?.mes, params?.anio],
    queryFn: () =>
      api.get<RequisicionSummary[]>(`/requisiciones${queryStr ? `?${queryStr}` : ''}`).then((r) => r.data),
  })
}

export function useRequisicion(id: string | null) {
  return useQuery({
    queryKey: ['requisiciones', id],
    queryFn: () => api.get<Requisicion>(`/requisiciones/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 30000,
  })
}

export function useCreateRequisicion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRequisicionDto) =>
      api.post<Requisicion>('/requisiciones', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisiciones'] })
      toast.success('Requisicion creada')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear la requisicion'))
    },
  })
}

export function useDeleteRequisicion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/requisiciones/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisiciones'] })
      toast.success('Requisicion eliminada')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar'))
    },
  })
}

export function useEnvioMasivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EnvioMasivoDto) =>
      api.post<EnvioMasivoResult>('/requisiciones/masivo', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisiciones'] })
      toast.success('Requisiciones enviadas correctamente')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al enviar requisiciones'))
    },
  })
}

export function useLlenadoRequisicion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & LlenadoDto) =>
      api.patch<Requisicion>(`/requisiciones/${id}/llenado`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisiciones'] })
      toast.success('Requisicion enviada correctamente')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al enviar la solicitud'))
    },
  })
}

export function useCambiarEstadoRQ() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoRQ }) =>
      api.patch<Requisicion>(`/requisiciones/${id}/estado`, { estado }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisiciones'] })
      toast.success('Estado actualizado')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al cambiar estado'))
    },
  })
}

export function useRecepcionRQ() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & RecepcionDto) =>
      api.patch<Requisicion>(`/requisiciones/${id}/recepcion`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisiciones'] })
      qc.invalidateQueries({ queryKey: ['solicitudes'] })
      toast.success('Recepcion registrada correctamente')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al registrar la recepcion'))
    },
  })
}

export function useGuardarFacturas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: FacturaItemDto[] }) =>
      api.patch<Requisicion>(`/requisiciones/${id}/facturas`, { items }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisiciones'] })
      qc.invalidateQueries({ queryKey: ['informe'] })
      toast.success('Facturas guardadas')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al guardar facturas'))
    },
  })
}

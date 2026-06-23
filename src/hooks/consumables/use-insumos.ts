import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { api } from '@/src/lib/axios'
import type {
  Insumo,
  PaginatedInsumos,
  CreateInsumoDto,
  UpdateInsumoDto,
  CategoriaInsumo,
  CambioInsumo,
  CerrarMesDto,
  CerrarMesResult,
  PeriodoCerrado,
  InsumoBorrador,
} from '@/src/types/consumables.types'

export function useInsumos(params?: {
  categoria?: CategoriaInsumo
  search?: string
  activo?: boolean
  page?: number
  limit?: number
  mes?: number
  anio?: number
}) {
  const qs = new URLSearchParams()
  if (params?.categoria)            qs.set('categoria', params.categoria)
  if (params?.search)               qs.set('search',    params.search)
  if (params?.activo !== undefined) qs.set('activo',    String(params.activo))
  if (params?.mes)                  qs.set('mes',       String(params.mes))
  if (params?.anio)                 qs.set('anio',      String(params.anio))
  qs.set('page',  String(params?.page  ?? 1))
  qs.set('limit', String(params?.limit ?? 20))
  return useQuery({
    queryKey: ['insumos', params],
    queryFn: () => api.get<PaginatedInsumos>(`/insumos?${qs}`).then((r) => r.data),
    placeholderData: (prev) => prev,
  })
}

export function useInsumo(id: string | null) {
  return useQuery({
    queryKey: ['insumos', id],
    queryFn: () => api.get<Insumo>(`/insumos/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateInsumo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInsumoDto) =>
      api.post<Insumo>('/insumos', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insumos'] })
      toast.success('Insumo creado')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear el insumo'))
    },
  })
}

export function useUpdateInsumo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateInsumoDto) =>
      api.patch<Insumo>(`/insumos/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insumos'] })
      toast.success('Insumo actualizado')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar'))
    },
  })
}

export function useDeleteInsumo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/insumos/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insumos'] })
      toast.success('Insumo eliminado')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar'))
    },
  })
}

export function useCambiosInsumos(mes: number, anio: number, enabled: boolean) {
  return useQuery({
    queryKey: ['insumos', 'cambios', mes, anio],
    queryFn: () =>
      api.get<CambioInsumo[]>(`/insumos/cambios?mes=${mes}&anio=${anio}`).then((r) => r.data),
    enabled,
  })
}

export function useBorradores(mes: number, anio: number) {
  return useQuery({
    queryKey: ['insumos', 'borradores', mes, anio],
    queryFn: () =>
      api.get<InsumoBorrador[]>(`/insumos/borradores?mes=${mes}&anio=${anio}`).then((r) => r.data),
  })
}

export function useGuardarBorrador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id, mes, anio, ...data
    }: {
      id: string
      mes: number
      anio: number
      valor_unitario?: number | null
      proveedor_ordinario?: string | null
      proveedor_extraordinario?: string | null
      activo?: boolean
    }) => api.patch<InsumoBorrador>(`/insumos/${id}/borrador`, { mes, anio, ...data }).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['insumos', 'borradores', vars.mes, vars.anio] })
      toast.success('Cambio guardado — se aplicara al cerrar el mes')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al guardar borrador'))
    },
  })
}

export function usePeriodosCerrados() {
  return useQuery({
    queryKey: ['insumos', 'periodos-cerrados'],
    queryFn: () => api.get<PeriodoCerrado[]>('/insumos/periodos-cerrados').then((r) => r.data),
  })
}

export function useCerrarMes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CerrarMesDto) =>
      api.post<CerrarMesResult>('/insumos/cerrar-mes', data).then((r) => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['insumos', 'periodos-cerrados'] })
      qc.invalidateQueries({ queryKey: ['insumos', 'borradores', variables.mes, variables.anio] })
      qc.invalidateQueries({ queryKey: ['insumos'] })
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al cerrar el mes'))
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { api } from '@/src/lib/axios'
import type { IndumentariaItem, IndumentariaEntrega, TipoEntrega, EmpleadoTallaRow, EmpleadoTallaBulkRow, TallaCategoria, CensoEmpleadoResumen } from '@/src/types/indumentaria.types'

export function useIndumentariaCatalog() {
  return useQuery({
    queryKey: ['indumentaria', 'catalog'],
    queryFn: () => api.get<{ data: IndumentariaItem[] }>('/indumentaria').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateIndumentariaItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      nombre: string
      codigo?: string
      unidad: string
      valor_unitario?: number | null
      proveedor?: string | null
      requiere_talla?: boolean
    }) => api.post<IndumentariaItem>('/indumentaria', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['indumentaria', 'catalog'] })
      toast.success('Item creado')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear el item'))
    },
  })
}

export function useUpdateIndumentariaItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string
      nombre?: string
      codigo?: string
      unidad?: string
      valor_unitario?: number | null
      proveedor?: string | null
      activo?: boolean
      requiere_talla?: boolean
    }) => api.patch<IndumentariaItem>(`/indumentaria/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['indumentaria', 'catalog'] })
      toast.success('Item actualizado')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar el item'))
    },
  })
}

export function useDeleteIndumentariaItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/indumentaria/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['indumentaria', 'catalog'] })
      toast.success('Item eliminado')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar el item'))
    },
  })
}

export function useIndumentariaHistorialEmpleado(empleadoId: string | null, tipo?: TipoEntrega) {
  return useQuery({
    queryKey: ['indumentaria', 'historial', empleadoId, tipo],
    queryFn: () =>
      api.get<{ data: IndumentariaEntrega[] }>(`/indumentaria/entregas/historial/${empleadoId}`, {
        params: tipo ? { tipo } : undefined,
      }).then(r => r.data.data),
    enabled: !!empleadoId,
  })
}

export function useEntregasPorNumeroRQ(numeroRq: string | null) {
  return useQuery({
    queryKey: ['indumentaria', 'entregas', 'rq', numeroRq],
    queryFn: () =>
      api.get<{ data: IndumentariaEntrega[] }>('/indumentaria/entregas', {
        params: { numeroRq, limit: 500 },
      }).then(r => r.data.data),
    enabled: !!numeroRq,
  })
}

export function useRegistrarEntregaBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ empleadoId, tipo, fechaEntrega, numeroRq, observacion, items, firmaBlob }: {
      empleadoId: string
      tipo: TipoEntrega
      fechaEntrega: string
      numeroRq?: string | null
      observacion?: string
      items: { indumentaria_id: string; cantidad: number; talla?: string | null }[]
      firmaBlob: Blob
    }) => {
      const fd = new FormData()
      fd.append('firma', firmaBlob, 'firma.png')
      fd.append('empleado_id', empleadoId)
      fd.append('tipo', tipo)
      fd.append('fecha_entrega', fechaEntrega)
      if (numeroRq) fd.append('numero_rq', numeroRq)
      if (observacion) fd.append('observacion', observacion)
      fd.append('items', JSON.stringify(items))
      return api.post('/indumentaria/entregas/batch', fd, {
        headers: { 'Content-Type': undefined },
      }).then(r => r.data)
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['indumentaria', 'historial', variables.empleadoId] })
      qc.invalidateQueries({ queryKey: ['indumentaria', 'entregas'] })
      qc.invalidateQueries({ queryKey: ['indumentaria', 'censo-resumen'] })
      toast.success('Entrega registrada correctamente')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al registrar la entrega'))
    },
  })
}

export function useTallasEmpleado(empleadoId: string | null) {
  return useQuery({
    queryKey: ['indumentaria', 'tallas', empleadoId],
    queryFn: () => api.get<EmpleadoTallaRow[]>(`/indumentaria/tallas/${empleadoId}`).then(r => r.data),
    enabled: !!empleadoId,
  })
}

export function useTallasBulk() {
  return useQuery({
    queryKey: ['indumentaria', 'tallas', 'bulk'],
    queryFn: () => api.get<EmpleadoTallaBulkRow[]>('/indumentaria/tallas').then(r => r.data),
  })
}

export function useUpsertTallaEmpleado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ empleadoId, categoria, talla }: { empleadoId: string; categoria: TallaCategoria; talla: string | null }) =>
      api.patch(`/indumentaria/tallas/${empleadoId}/${categoria}`, { talla }).then(r => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['indumentaria', 'tallas', variables.empleadoId] })
      qc.invalidateQueries({ queryKey: ['indumentaria', 'tallas', 'bulk'] })
      toast.success('Talla actualizada')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar la talla'))
    },
  })
}

export function useCensoResumen() {
  return useQuery({
    queryKey: ['indumentaria', 'censo-resumen'],
    queryFn: () => api.get<CensoEmpleadoResumen[]>('/indumentaria/censo-resumen').then(r => r.data),
  })
}

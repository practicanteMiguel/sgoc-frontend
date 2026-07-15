import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { api } from '@/src/lib/axios'
import type { IndumentariaItem, IndumentariaEntrega } from '@/src/types/indumentaria.types'

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

export function useIndumentariaHistorialEmpleado(empleadoId: string | null) {
  return useQuery({
    queryKey: ['indumentaria', 'historial', empleadoId],
    queryFn: () =>
      api.get<IndumentariaEntrega[]>(`/indumentaria/entregas/historial/${empleadoId}`).then(r => r.data),
    enabled: !!empleadoId,
  })
}

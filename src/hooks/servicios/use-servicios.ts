import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { api } from '@/src/lib/axios'
import type {
  Servicio, CreateServicioDto, UpdateServicioDto, PaginatedServicios, CuadrillaDisponible,
  ServicioHerramienta, CreateServicioHerramientaDto, UpdateServicioHerramientaDto,
} from '@/src/types/servicios.types'

interface UseServiciosParams {
  search?: string
  activo?: boolean
  page?:   number
  limit?:  number
}

export function useServicios(params: UseServiciosParams = {}) {
  const { search, activo, page = 1, limit = 100 } = params
  return useQuery({
    queryKey: ['servicios', 'catalog', search, activo, page, limit],
    queryFn: () => api.get<PaginatedServicios>('/servicios', {
      params: {
        page, limit,
        ...(search ? { search } : {}),
        ...(activo !== undefined ? { activo } : {}),
      },
    }).then(r => r.data),
  })
}

export function useCreateServicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateServicioDto) => api.post<Servicio>('/servicios', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicios'] })
      toast.success('Servicio creado')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear el servicio'))
    },
  })
}

export function useUpdateServicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateServicioDto & { id: string }) =>
      api.patch<Servicio>(`/servicios/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicios'] })
      toast.success('Servicio actualizado')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar el servicio'))
    },
  })
}

export function useDeleteServicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/servicios/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicios'] })
      toast.success('Servicio eliminado')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar el servicio'))
    },
  })
}

export function useCuadrillasDisponibles(fieldId?: string) {
  return useQuery({
    queryKey: ['servicios', 'cuadrillas-disponibles', fieldId],
    queryFn: () => api.get<CuadrillaDisponible[]>('/servicios/cuadrillas-disponibles', {
      params: fieldId ? { field_id: fieldId } : undefined,
    }).then(r => r.data),
  })
}

export function useCuadrillasServicio(servicioId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'cuadrillas'],
    queryFn: () => api.get<CuadrillaDisponible[]>(`/servicios/${servicioId}/cuadrillas`).then(r => r.data),
    enabled: !!servicioId,
  })
}

export function useAsignarCuadrillas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ servicioId, crewIds }: { servicioId: string; crewIds: string[] }) =>
      api.post<CuadrillaDisponible[]>(`/servicios/${servicioId}/cuadrillas`, { crew_ids: crewIds }).then(r => r.data),
    onSuccess: (_data, { servicioId }) => {
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'cuadrillas'] })
      qc.invalidateQueries({ queryKey: ['servicios', 'cuadrillas-disponibles'] })
      toast.success('Cuadrillas asignadas')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al asignar cuadrillas'))
    },
  })
}

export function useQuitarCuadrilla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ servicioId, crewId }: { servicioId: string; crewId: string }) =>
      api.delete(`/servicios/${servicioId}/cuadrillas/${crewId}`).then(r => r.data),
    onSuccess: (_data, { servicioId }) => {
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'cuadrillas'] })
      qc.invalidateQueries({ queryKey: ['servicios', 'cuadrillas-disponibles'] })
      toast.success('Cuadrilla removida del servicio')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al remover la cuadrilla'))
    },
  })
}

// --- Herramientas exigidas ---

export function useHerramientasServicio(servicioId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'herramientas'],
    queryFn: () => api.get<ServicioHerramienta[]>(`/servicios/${servicioId}/herramientas`).then(r => r.data),
    enabled: !!servicioId,
  })
}

export function useAsignarHerramientasServicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ servicioId, items }: { servicioId: string; items: CreateServicioHerramientaDto[] }) =>
      api.post<ServicioHerramienta[]>(`/servicios/${servicioId}/herramientas`, { items }).then(r => r.data),
    onSuccess: (data, { servicioId }) => {
      // El POST ya devuelve la lista completa y actualizada de herramientas
      // exigidas del servicio, asi que se escribe directo en cache en vez de
      // invalidar (evita un GET redundante justo despues de este POST).
      qc.setQueryData(['servicios', servicioId, 'herramientas'], data)
      toast.success(`${data.length} herramienta${data.length !== 1 ? 's' : ''} asignada${data.length !== 1 ? 's' : ''} al servicio`)
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al asignar las herramientas'))
    },
  })
}

export function useActualizarHerramientaServicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ servicioId, itemId, ...data }: UpdateServicioHerramientaDto & { servicioId: string; itemId: string }) =>
      api.patch<ServicioHerramienta>(`/servicios/${servicioId}/herramientas/${itemId}`, data).then(r => r.data),
    onSuccess: (_data, { servicioId }) => {
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'herramientas'] })
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'fondo-comun-herramientas'] })
      toast.success('Herramienta actualizada')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar la herramienta'))
    },
  })
}

export function useQuitarHerramientaServicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ servicioId, itemId }: { servicioId: string; itemId: string }) =>
      api.delete(`/servicios/${servicioId}/herramientas/${itemId}`).then(r => r.data),
    onSuccess: (_data, { servicioId }) => {
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'herramientas'] })
      toast.success('Herramienta removida del servicio')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al remover la herramienta'))
    },
  })
}

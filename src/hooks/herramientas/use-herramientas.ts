import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { api } from '@/src/lib/axios'
import type {
  Herramienta, CategoriaHerramienta, CreateHerramientaDto, UpdateHerramientaDto, PaginatedHerramientas,
  BulkImportHerramientasResult,
} from '@/src/types/herramientas.types'

interface UseHerramientasParams {
  categoria?: CategoriaHerramienta
  search?:    string
  activo?:    boolean
  page?:      number
  limit?:     number
}

export function useHerramientas(params: UseHerramientasParams = {}) {
  const { categoria, search, activo, page = 1, limit = 50 } = params
  return useQuery({
    queryKey: ['herramientas', 'catalog', categoria, search, activo, page, limit],
    queryFn: () => api.get<PaginatedHerramientas>('/herramientas', {
      params: {
        page, limit,
        ...(categoria ? { categoria } : {}),
        ...(search ? { search } : {}),
        ...(activo !== undefined ? { activo } : {}),
      },
    }).then(r => r.data),
    // El catalogo no cambia a cada rato; evita relanzar la peticion cada vez
    // que un modal que lo usa (agregar/entregar herramientas) se vuelve a
    // abrir dentro de esta ventana, para no gastar el limite del throttle.
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateHerramienta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateHerramientaDto) => api.post<Herramienta>('/herramientas', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['herramientas'] })
      toast.success('Herramienta creada')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear la herramienta'))
    },
  })
}

export function useUpdateHerramienta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateHerramientaDto & { id: string }) =>
      api.patch<Herramienta>(`/herramientas/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['herramientas'] })
      toast.success('Herramienta actualizada')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar la herramienta'))
    },
  })
}

export function useBulkImportHerramientas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('archivo', file)
      return api.post<BulkImportHerramientasResult>('/herramientas/bulk-import', fd, {
        headers: { 'Content-Type': undefined },
      }).then(r => r.data)
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['herramientas'] })
      toast.success(`${data.creadas} herramienta${data.creadas !== 1 ? 's' : ''} importada${data.creadas !== 1 ? 's' : ''} correctamente`)
    },
    // Sin toast de error generico aca: el modal que llama a esta mutacion
    // muestra el detalle fila por fila a partir de mutation.error.
  })
}

export function useDeleteHerramienta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/herramientas/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['herramientas'] })
      toast.success('Herramienta eliminada')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar la herramienta'))
    },
  })
}

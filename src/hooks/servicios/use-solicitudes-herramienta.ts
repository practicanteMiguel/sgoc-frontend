import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { api } from '@/src/lib/axios'
import type {
  SolicitudHerramienta, CrearSolicitudHerramientaDto, AtenderSolicitudHerramientaDto,
  EstadoSolicitudHerramienta, CuadrillaCampoSupervisor, EstadisticasCampoSupervisor,
} from '@/src/types/solicitudes-herramienta.types'

export function useCuadrillasCampoSupervisor(fieldId: string | null) {
  return useQuery({
    queryKey: ['campos', fieldId, 'herramientas', 'cuadrillas'],
    queryFn: () => api.get<CuadrillaCampoSupervisor[]>(`/campos/${fieldId}/herramientas/cuadrillas`).then(r => r.data),
    enabled: !!fieldId,
  })
}

export function useEstadisticasCampoSupervisor(fieldId: string | null) {
  return useQuery({
    queryKey: ['campos', fieldId, 'herramientas', 'estadisticas'],
    queryFn: () => api.get<EstadisticasCampoSupervisor>(`/campos/${fieldId}/herramientas/estadisticas`).then(r => r.data),
    enabled: !!fieldId,
  })
}

export function useSolicitudesHerramienta(filtros: { fieldId?: string | null; crewId?: string | null; estado?: EstadoSolicitudHerramienta }) {
  return useQuery({
    queryKey: ['solicitudes-herramienta', filtros],
    queryFn: () => api.get<SolicitudHerramienta[]>('/solicitudes-herramienta', {
      params: { fieldId: filtros.fieldId || undefined, crewId: filtros.crewId || undefined, estado: filtros.estado },
    }).then(r => r.data),
  })
}

function useSolicitudErrorHandler() {
  return (err: AxiosError<{ message?: string | string[] }>) => {
    const msg = err.response?.data?.message
    toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al registrar la solicitud'))
  }
}

export function useCrearSolicitudHerramienta() {
  const qc = useQueryClient()
  const onError = useSolicitudErrorHandler()
  return useMutation({
    mutationFn: (dto: CrearSolicitudHerramientaDto) =>
      api.post<SolicitudHerramienta>('/solicitudes-herramienta', dto).then(r => r.data),
    onSuccess: (_data, dto) => {
      qc.invalidateQueries({ queryKey: ['solicitudes-herramienta'] })
      qc.invalidateQueries({ queryKey: ['campos'] })
      toast.success(dto.tipo === 'DANO' ? 'Daño reportado correctamente' : 'Solicitud enviada correctamente')
    },
    onError,
  })
}

export function useAtenderSolicitudHerramienta() {
  const qc = useQueryClient()
  const onError = useSolicitudErrorHandler()
  return useMutation({
    mutationFn: ({ id, ...dto }: AtenderSolicitudHerramientaDto & { id: string }) =>
      api.patch<SolicitudHerramienta>(`/solicitudes-herramienta/${id}/atender`, dto).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-herramienta'] })
      qc.invalidateQueries({ queryKey: ['campos'] })
      toast.success('Solicitud marcada como atendida')
    },
    onError,
  })
}

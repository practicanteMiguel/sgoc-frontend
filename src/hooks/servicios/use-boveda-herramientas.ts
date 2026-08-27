import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { api } from '@/src/lib/axios'
import type { BovedaResumen, MovimientoBoveda } from '@/src/types/boveda-herramientas.types'

function invalidarBoveda(qc: ReturnType<typeof useQueryClient>, servicioId: string, itemId: string) {
  qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'herramientas', itemId, 'boveda'] })
  // Cualquier cuadrilla del servicio puede haber quedado afectada (prestamo,
  // devolucion o traslado), asi que se invalida su historial en bloque.
  qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'cuadrillas'] })
}

export function useBoveda(servicioId: string | null, itemId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'herramientas', itemId, 'boveda'],
    queryFn: () => api.get<BovedaResumen>(`/servicios/${servicioId}/herramientas/${itemId}/boveda`).then(r => r.data),
    enabled: !!servicioId && !!itemId,
  })
}

export function useHistorialBoveda(servicioId: string | null, itemId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'herramientas', itemId, 'boveda', 'historial'],
    queryFn: () => api.get<MovimientoBoveda[]>(`/servicios/${servicioId}/herramientas/${itemId}/boveda/historial`).then(r => r.data),
    enabled: !!servicioId && !!itemId,
  })
}

function useBovedaErrorHandler() {
  return (err: AxiosError<{ message?: string | string[] }>) => {
    const msg = err.response?.data?.message
    toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al registrar el movimiento'))
  }
}

export function useRegistrarIngresoBoveda() {
  const qc = useQueryClient()
  const onError = useBovedaErrorHandler()
  return useMutation({
    mutationFn: ({ servicioId, itemId, cantidad, fecha, observacion }: {
      servicioId: string; itemId: string; cantidad: number; fecha: string; observacion?: string
    }) => api.post<BovedaResumen>(`/servicios/${servicioId}/herramientas/${itemId}/boveda/ingreso`, {
      cantidad, fecha, observacion,
    }).then(r => r.data),
    onSuccess: (_data, { servicioId, itemId }) => {
      invalidarBoveda(qc, servicioId, itemId)
      toast.success('Unidades cargadas a la bóveda')
    },
    onError,
  })
}

export function usePrestarHerramienta() {
  const qc = useQueryClient()
  const onError = useBovedaErrorHandler()
  return useMutation({
    mutationFn: ({ servicioId, itemId, crewId, cantidad, fecha, observacion }: {
      servicioId: string; itemId: string; crewId: string; cantidad: number; fecha: string; observacion?: string
    }) => api.post<BovedaResumen>(`/servicios/${servicioId}/herramientas/${itemId}/boveda/prestamo`, {
      crew_id: crewId, cantidad, fecha, observacion,
    }).then(r => r.data),
    onSuccess: (_data, { servicioId, itemId }) => {
      invalidarBoveda(qc, servicioId, itemId)
      toast.success('Herramienta prestada a la cuadrilla')
    },
    onError,
  })
}

export function useReasignarHerramienta() {
  const qc = useQueryClient()
  const onError = useBovedaErrorHandler()
  return useMutation({
    mutationFn: ({ servicioId, itemId, crewIdOrigen, crewIdDestino, cantidad, fecha, observacion }: {
      servicioId: string; itemId: string; crewIdOrigen: string; crewIdDestino: string
      cantidad: number; fecha: string; observacion?: string
    }) => api.post<BovedaResumen>(`/servicios/${servicioId}/herramientas/${itemId}/boveda/reasignar`, {
      crew_id_origen: crewIdOrigen, crew_id_destino: crewIdDestino, cantidad, fecha, observacion,
    }).then(r => r.data),
    onSuccess: (_data, { servicioId, itemId }) => {
      invalidarBoveda(qc, servicioId, itemId)
      toast.success('Herramienta trasladada a la otra cuadrilla')
    },
    onError,
  })
}

export function useDevolverHerramienta() {
  const qc = useQueryClient()
  const onError = useBovedaErrorHandler()
  return useMutation({
    mutationFn: ({ servicioId, itemId, crewId, cantidad, fecha, observacion }: {
      servicioId: string; itemId: string; crewId: string; cantidad: number; fecha: string; observacion?: string
    }) => api.post<BovedaResumen>(`/servicios/${servicioId}/herramientas/${itemId}/boveda/devolucion`, {
      crew_id: crewId, cantidad, fecha, observacion,
    }).then(r => r.data),
    onSuccess: (_data, { servicioId, itemId }) => {
      invalidarBoveda(qc, servicioId, itemId)
      toast.success('Herramienta devuelta a la bóveda')
    },
    onError,
  })
}

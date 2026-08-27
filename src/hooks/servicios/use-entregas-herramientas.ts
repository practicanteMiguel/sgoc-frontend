import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { api } from '@/src/lib/axios'
import type {
  EntregaHerramientaCrew, ResumenHerramientasCrewResponse, RegistrarEntregaHerramientasItemDto,
  InformeHerramientasServicio, StockHerramientaCrew, RetiroHerramientaCrew, RegistrarRetiroDto,
  TendenciaMensualPunto,
} from '@/src/types/entregas-herramientas.types'
import type { MovimientoBovedaCrewHistorial } from '@/src/types/boveda-herramientas.types'

export function useResumenHerramientasCrew(servicioId: string | null, crewId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'resumen-herramientas'],
    queryFn: () => api.get<ResumenHerramientasCrewResponse>(
      `/servicios/${servicioId}/cuadrillas/${crewId}/resumen-herramientas`,
    ).then(r => r.data),
    enabled: !!servicioId && !!crewId,
  })
}

export function useInformeServicio(servicioId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'informe-herramientas'],
    queryFn: () => api.get<InformeHerramientasServicio>(
      `/servicios/${servicioId}/informe-herramientas`,
    ).then(r => r.data),
    enabled: !!servicioId,
  })
}

export function useInformeHistoricoServicio(servicioId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'informe-herramientas-historico'],
    queryFn: () => api.get<InformeHerramientasServicio>(
      `/servicios/${servicioId}/informe-herramientas-historico`,
    ).then(r => r.data),
    enabled: !!servicioId,
  })
}

export function useTendenciaMensualServicio(servicioId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'informe-herramientas-tendencia'],
    queryFn: () => api.get<TendenciaMensualPunto[]>(
      `/servicios/${servicioId}/informe-herramientas-tendencia`,
    ).then(r => r.data),
    enabled: !!servicioId,
  })
}

export function useHistorialEntregasCrew(servicioId: string | null, crewId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'entregas'],
    queryFn: () => api.get<EntregaHerramientaCrew[]>(
      `/servicios/${servicioId}/cuadrillas/${crewId}/entregas`,
    ).then(r => r.data),
    enabled: !!servicioId && !!crewId,
  })
}

export function useMovimientosBovedaCrew(servicioId: string | null, crewId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'movimientos-boveda'],
    queryFn: () => api.get<MovimientoBovedaCrewHistorial[]>(
      `/servicios/${servicioId}/cuadrillas/${crewId}/movimientos-boveda`,
    ).then(r => r.data),
    enabled: !!servicioId && !!crewId,
  })
}

// Historial global de una cuadrilla, cruzando todos los servicios en los
// que haya estado — util para consultarla aunque ya no este asignada a
// ninguno.
export function useHistorialEntregasCrewGlobal(crewId: string | null) {
  return useQuery({
    queryKey: ['cuadrillas', crewId, 'entregas-herramientas'],
    queryFn: () => api.get<EntregaHerramientaCrew[]>(
      `/cuadrillas/${crewId}/entregas-herramientas`,
    ).then(r => r.data),
    enabled: !!crewId,
  })
}

export function useMovimientosBovedaCrewGlobal(crewId: string | null) {
  return useQuery({
    queryKey: ['cuadrillas', crewId, 'movimientos-boveda-herramientas'],
    queryFn: () => api.get<MovimientoBovedaCrewHistorial[]>(
      `/cuadrillas/${crewId}/movimientos-boveda-herramientas`,
    ).then(r => r.data),
    enabled: !!crewId,
  })
}

export function useHistorialRetirosCrewGlobal(crewId: string | null) {
  return useQuery({
    queryKey: ['cuadrillas', crewId, 'retiros-herramientas'],
    queryFn: () => api.get<RetiroHerramientaCrew[]>(
      `/cuadrillas/${crewId}/retiros-herramientas`,
    ).then(r => r.data),
    enabled: !!crewId,
  })
}

export function useRegistrarEntregaHerramientas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ servicioId, crewId, fechaEntrega, recibidoEmpleadoId, observacion, items, firmaBlob }: {
      servicioId: string
      crewId: string
      fechaEntrega: string
      recibidoEmpleadoId?: string | null
      observacion?: string
      items: RegistrarEntregaHerramientasItemDto[]
      firmaBlob: Blob
    }) => {
      const fd = new FormData()
      fd.append('firma', firmaBlob, 'firma.png')
      fd.append('fecha_entrega', fechaEntrega)
      if (recibidoEmpleadoId) fd.append('recibido_empleado_id', recibidoEmpleadoId)
      if (observacion) fd.append('observacion', observacion)
      fd.append('items', JSON.stringify(items))
      return api.post<EntregaHerramientaCrew>(
        `/servicios/${servicioId}/cuadrillas/${crewId}/entregas`, fd,
        { headers: { 'Content-Type': undefined } },
      ).then(r => r.data)
    },
    onSuccess: (_data, { servicioId, crewId }) => {
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'resumen-herramientas'] })
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'entregas'] })
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'informe-herramientas'] })
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'informe-herramientas-historico'] })
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'informe-herramientas-tendencia'] })
      toast.success('Entrega registrada correctamente')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al registrar la entrega'))
    },
  })
}

export function useStockCrew(servicioId: string | null, crewId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'stock'],
    queryFn: () => api.get<StockHerramientaCrew[]>(
      `/servicios/${servicioId}/cuadrillas/${crewId}/stock`,
    ).then(r => r.data),
    enabled: !!servicioId && !!crewId,
  })
}

export function useHistorialRetirosCrew(servicioId: string | null, crewId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'retiros'],
    queryFn: () => api.get<RetiroHerramientaCrew[]>(
      `/servicios/${servicioId}/cuadrillas/${crewId}/retiros`,
    ).then(r => r.data),
    enabled: !!servicioId && !!crewId,
  })
}

export function useRegistrarRetiro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ servicioId, crewId, ...dto }: RegistrarRetiroDto & { servicioId: string; crewId: string }) =>
      api.post<RetiroHerramientaCrew>(`/servicios/${servicioId}/cuadrillas/${crewId}/retiros`, dto).then(r => r.data),
    onSuccess: (_data, { servicioId, crewId }) => {
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'stock'] })
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'retiros'] })
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'resumen-herramientas'] })
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'informe-herramientas'] })
      qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'informe-herramientas-tendencia'] })
      toast.success('Herramienta sacada de funcionamiento')
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al sacar la herramienta de funcionamiento'))
    },
  })
}

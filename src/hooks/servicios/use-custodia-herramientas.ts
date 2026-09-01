import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { api } from '@/src/lib/axios'
import type {
  CustodiaHerramientaCrew, CustodiaRecibidaItem, MovimientoCustodiaHistorial, FondoComunHerramienta,
} from '@/src/types/custodia-herramientas.types'

// Un prestamo/cesion afecta la vista de custodia tanto de la cuadrilla
// origen como de la destino (que puede no ser la que tiene el modal
// abierto), asi que se invalida en bloque, igual que la boveda de rotativas.
function invalidarCustodia(qc: ReturnType<typeof useQueryClient>, servicioId: string) {
  qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'cuadrillas'] })
  qc.invalidateQueries({ queryKey: ['servicios', servicioId, 'fondo-comun-herramientas'] })
}

export function useFondoComunServicio(servicioId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'fondo-comun-herramientas'],
    queryFn: () => api.get<FondoComunHerramienta[]>(
      `/servicios/${servicioId}/fondo-comun-herramientas`,
    ).then(r => r.data),
    enabled: !!servicioId,
  })
}

export function useCustodiaCrew(servicioId: string | null, crewId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'custodia-herramientas'],
    queryFn: () => api.get<CustodiaHerramientaCrew[]>(
      `/servicios/${servicioId}/cuadrillas/${crewId}/custodia-herramientas`,
    ).then(r => r.data),
    enabled: !!servicioId && !!crewId,
  })
}

export function useCustodiaRecibida(servicioId: string | null, crewId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'custodia-recibida'],
    queryFn: () => api.get<CustodiaRecibidaItem[]>(
      `/servicios/${servicioId}/cuadrillas/${crewId}/custodia-recibida`,
    ).then(r => r.data),
    enabled: !!servicioId && !!crewId,
  })
}

export function useHistorialCustodiaCrew(servicioId: string | null, crewId: string | null) {
  return useQuery({
    queryKey: ['servicios', servicioId, 'cuadrillas', crewId, 'custodia-herramientas', 'historial'],
    queryFn: () => api.get<MovimientoCustodiaHistorial[]>(
      `/servicios/${servicioId}/cuadrillas/${crewId}/custodia-herramientas/historial`,
    ).then(r => r.data),
    enabled: !!servicioId && !!crewId,
  })
}

export function useHistorialCustodiaCrewGlobal(crewId: string | null) {
  return useQuery({
    queryKey: ['cuadrillas', crewId, 'custodia-herramientas'],
    queryFn: () => api.get<MovimientoCustodiaHistorial[]>(
      `/cuadrillas/${crewId}/custodia-herramientas`,
    ).then(r => r.data),
    enabled: !!crewId,
  })
}

function useCustodiaErrorHandler() {
  return (err: AxiosError<{ message?: string | string[] }>) => {
    const msg = err.response?.data?.message
    toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al registrar el movimiento'))
  }
}

export function useRegistrarPrestamoCustodia() {
  const qc = useQueryClient()
  const onError = useCustodiaErrorHandler()
  return useMutation({
    mutationFn: ({ servicioId, crewId, herramientaId, crewDestinoId, cantidad, fecha, observacion }: {
      servicioId: string; crewId: string; herramientaId: string; crewDestinoId: string
      cantidad: number; fecha: string; observacion?: string
    }) => api.post<CustodiaHerramientaCrew[]>(`/servicios/${servicioId}/cuadrillas/${crewId}/custodia-herramientas/prestamo`, {
      herramienta_id: herramientaId, crew_destino_id: crewDestinoId, cantidad, fecha, observacion,
    }).then(r => r.data),
    onSuccess: (_data, { servicioId }) => {
      invalidarCustodia(qc, servicioId)
      toast.success('Herramienta prestada a la otra cuadrilla')
    },
    onError,
  })
}

export function useRegistrarCesionBoveda() {
  const qc = useQueryClient()
  const onError = useCustodiaErrorHandler()
  return useMutation({
    mutationFn: ({ servicioId, crewId, herramientaId, cantidad, fecha, observacion }: {
      servicioId: string; crewId: string; herramientaId: string
      cantidad: number; fecha: string; observacion?: string
    }) => api.post<CustodiaHerramientaCrew[]>(`/servicios/${servicioId}/cuadrillas/${crewId}/custodia-herramientas/boveda`, {
      herramienta_id: herramientaId, cantidad, fecha, observacion,
    }).then(r => r.data),
    onSuccess: (_data, { servicioId }) => {
      invalidarCustodia(qc, servicioId)
      toast.success('Herramienta cedida al fondo común del servicio')
    },
    onError,
  })
}

export function usePrestarDesdeFondoComun() {
  const qc = useQueryClient()
  const onError = useCustodiaErrorHandler()
  return useMutation({
    mutationFn: ({ servicioId, herramientaId, crewDestinoId, cantidad, fecha, observacion }: {
      servicioId: string; herramientaId: string; crewDestinoId: string
      cantidad: number; fecha: string; observacion?: string
    }) => api.post<FondoComunHerramienta[]>(`/servicios/${servicioId}/fondo-comun-herramientas/${herramientaId}/prestamo`, {
      crew_destino_id: crewDestinoId, cantidad, fecha, observacion,
    }).then(r => r.data),
    onSuccess: (_data, { servicioId }) => {
      invalidarCustodia(qc, servicioId)
      toast.success('Herramienta prestada desde el fondo común')
    },
    onError,
  })
}

export function useRegistrarDevolucionCustodia() {
  const qc = useQueryClient()
  const onError = useCustodiaErrorHandler()
  return useMutation({
    mutationFn: ({ servicioId, crewId, herramientaId, crewDestinoId, cantidad, fecha, observacion }: {
      servicioId: string; crewId: string; herramientaId: string; crewDestinoId: string | null
      cantidad: number; fecha: string; observacion?: string
    }) => api.post<CustodiaHerramientaCrew[]>(`/servicios/${servicioId}/cuadrillas/${crewId}/custodia-herramientas/devolucion`, {
      herramienta_id: herramientaId, crew_destino_id: crewDestinoId, cantidad, fecha, observacion,
    }).then(r => r.data),
    onSuccess: (_data, { servicioId }) => {
      invalidarCustodia(qc, servicioId)
      toast.success('Herramienta devuelta a la cuadrilla')
    },
    onError,
  })
}

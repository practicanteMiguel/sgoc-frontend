import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'
import type {
  Solicitud,
  SolicitudResumen,
  SolicitudLlenadoDto,
  EnviarPlantillasDto,
  EnviarPlantillasResult,
  GenerarRQsDto,
  GenerarRQsResult,
  RequisicionSummary,
  CreateAdicionalDto,
  UpdateAdicionalDto,
} from '@/src/types/consumables.types'

export function useSolicitudes(mes: number, anio: number) {
  return useQuery({
    queryKey: ['solicitudes', mes, anio],
    queryFn: () =>
      api.get<SolicitudResumen[]>(`/solicitudes?mes=${mes}&anio=${anio}`).then((r) => r.data),
  })
}

export function useSolicitud(id: string | null) {
  return useQuery({
    queryKey: ['solicitudes', id],
    queryFn: () => api.get<Solicitud>(`/solicitudes/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useEnviarPlantillas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EnviarPlantillasDto) =>
      api.post<EnviarPlantillasResult>('/solicitudes', data).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['solicitudes', vars.mes, vars.anio] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al enviar plantillas'))
    },
  })
}

export function useMisSolicitudes(mes: number, anio: number) {
  return useQuery({
    queryKey: ['solicitudes', 'mis-solicitudes', mes, anio],
    queryFn: () =>
      api.get<SolicitudResumen[]>(`/solicitudes/mis-solicitudes?mes=${mes}&anio=${anio}`).then((r) => r.data),
  })
}

export function useMiSolicitud(mes: number, anio: number) {
  return useQuery({
    queryKey: ['solicitudes', 'mi-solicitud', mes, anio],
    queryFn: async () => {
      try {
        return await api.get<Solicitud>(`/solicitudes/mi-solicitud?mes=${mes}&anio=${anio}`).then((r) => r.data)
      } catch (err: any) {
        if (err?.response?.status === 404) return null
        throw err
      }
    },
    retry: false,
  })
}

export function useLlenarMiSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fecha, nombre_solicitante, numero_contrato, items }: { id: string } & SolicitudLlenadoDto) =>
      api.patch<Solicitud>(`/solicitudes/${id}/llenado`, { fecha, nombre_solicitante, numero_contrato, items }).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['solicitudes', id] })
      qc.invalidateQueries({ queryKey: ['solicitudes', 'mis-solicitudes'] })
      toast.success('Solicitud enviada')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al enviar la solicitud'))
    },
  })
}

export function useSolicitudRequisiciones(solicitudId: string | null) {
  return useQuery({
    queryKey: ['solicitudes', solicitudId, 'requisiciones'],
    queryFn: async () => {
      try {
        return await api.get<RequisicionSummary[]>(`/solicitudes/${solicitudId}/requisiciones`).then((r) => r.data)
      } catch {
        return [] as RequisicionSummary[]
      }
    },
    enabled: !!solicitudId,
  })
}

export function useGenerarRQs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GenerarRQsDto) =>
      api.post<GenerarRQsResult>('/solicitudes/generar-rqs', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes'] })
      qc.invalidateQueries({ queryKey: ['requisiciones'] })
      toast.success('Requisiciones generadas')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al generar requisiciones'))
    },
  })
}

export function useCrearAdicional(solicitudId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAdicionalDto) =>
      api.post(`/solicitudes/${solicitudId}/adicionales`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes'] })
      toast.success('Insumo adicional agregado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al agregar el adicional'))
    },
  })
}

export function useEditarAdicional(solicitudId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ adicionalId, data }: { adicionalId: string; data: UpdateAdicionalDto }) =>
      api.patch(`/solicitudes/${solicitudId}/adicionales/${adicionalId}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes'] })
      toast.success('Insumo adicional actualizado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar el adicional'))
    },
  })
}

export function useEliminarAdicional(solicitudId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (adicionalId: string) =>
      api.delete(`/solicitudes/${solicitudId}/adicionales/${adicionalId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes'] })
      toast.success('Insumo adicional eliminado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar el adicional'))
    },
  })
}

export function useReabrirSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<Solicitud>(`/solicitudes/${id}/reabrir`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes'] })
      toast.success('Solicitud re-abierta para modificacion')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al re-abrir la solicitud'))
    },
  })
}

export function useCrearSolicitudAdicional() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { mes: number; anio: number; lugar?: string; field_lugar_id?: string }) =>
      api.post<Solicitud>('/solicitudes/adicional', data).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['solicitudes', 'mis-solicitudes', vars.mes, vars.anio] })
      toast.success('Solicitud adicional creada')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear solicitud adicional'))
    },
  })
}

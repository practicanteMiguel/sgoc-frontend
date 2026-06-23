import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AxiosError } from 'axios'
import { api } from '@/src/lib/axios'
import type { DotacionSpace, DotacionSpaceInfo, DotacionSolicitud, GenerarDotacionRQDto } from '@/src/types/dotaciones.types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

// ── Supervisor (requires auth) ─────────────────────────────────────────────

export function useMyDotacionSpace() {
  return useQuery({
    queryKey: ['dotaciones', 'my-space'],
    queryFn: () => api.get<DotacionSpace>('/dotaciones/spaces/my').then(r => r.data),
    retry: false,
  })
}

export function useCreateOrGetDotacionSpace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<DotacionSpace>('/dotaciones/spaces').then(r => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['dotaciones', 'my-space'], data)
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => {
      const msg = err.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear espacio'))
    },
  })
}

// ── Public (no auth) ───────────────────────────────────────────────────────

export function useDotacionSpaceInfo(token: string | null) {
  return useQuery({
    queryKey: ['dotaciones', 'space-info', token],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/dotaciones/spaces/${token}`)
      if (!r.ok) throw new Error('not found')
      return r.json() as Promise<DotacionSpaceInfo>
    },
    enabled: !!token,
    retry: false,
  })
}

export function useDotacionSolicitudesByToken(token: string | null) {
  return useQuery({
    queryKey: ['dotaciones', 'solicitudes-token', token],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/dotaciones/spaces/${token}/solicitudes`)
      if (!r.ok) throw new Error('error')
      return r.json() as Promise<DotacionSolicitud[]>
    },
    enabled: !!token,
  })
}

// ── Firma (public) ────────────────────────────────────────────────────────

export function useFirmarHSE() {
  return useMutation({
    mutationFn: ({ id, firmaBlob }: { id: string; firmaBlob: Blob }) => {
      const fd = new FormData()
      fd.append('firma', firmaBlob, 'firma.png')
      return fetch(`${API_BASE}/dotaciones/solicitudes/${id}/firma-hse`, {
        method: 'PATCH',
        body:   fd,
      }).then(r => { if (!r.ok) throw new Error('error'); return r.json() as Promise<DotacionSolicitud> })
    },
    onError: () => { toast.error('Error al guardar la firma') },
  })
}

export function useFirmarAutorizador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, firmaBlob, nombre, cargo }: { id: string; firmaBlob: Blob; nombre: string; cargo: string }) => {
      const fd = new FormData()
      fd.append('firma',              firmaBlob, 'firma.png')
      fd.append('nombre_autorizador', nombre)
      fd.append('cargo_autorizador',  cargo)
      return fetch(`${API_BASE}/dotaciones/solicitudes/${id}/firma-autorizador`, {
        method: 'PATCH',
        body:   fd,
      }).then(r => { if (!r.ok) throw new Error('error'); return r.json() as Promise<DotacionSolicitud> })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dotaciones', 'all-solicitudes'] }) },
    onError:   () => { toast.error('Error al guardar la firma del autorizador') },
  })
}

// ── Autorizador (public) ───────────────────────────────────────────────────

export function useAllDotacionSolicitudes(params?: { estado?: string; campo_id?: string }) {
  const search = new URLSearchParams()
  if (params?.estado)    search.set('estado',    params.estado)
  if (params?.campo_id)  search.set('campo_id',  params.campo_id)
  const qs = search.toString() ? `?${search}` : ''

  return useQuery({
    queryKey: ['dotaciones', 'all-solicitudes', params],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/dotaciones/solicitudes${qs}`)
      if (!r.ok) throw new Error('error')
      return r.json() as Promise<DotacionSolicitud[]>
    },
  })
}

export function useAutorizarDotacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) =>
      fetch(`${API_BASE}/dotaciones/solicitudes/${id}/estado`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ estado }),
      }).then(r => { if (!r.ok) throw new Error('error'); return r.json() as Promise<DotacionSolicitud> }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dotaciones', 'all-solicitudes'] })
      toast.success('Solicitud autorizada')
    },
    onError: () => {
      toast.error('Error al autorizar la solicitud')
    },
  })
}

export function useGenerarDotacionRQ() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & GenerarDotacionRQDto) =>
      fetch(`${API_BASE}/dotaciones/solicitudes/${id}/rq`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }).then(async r => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}))
          throw data
        }
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dotaciones', 'all-solicitudes'] })
      qc.invalidateQueries({ queryKey: ['requisiciones'] })
      toast.success('RQ generada correctamente')
    },
    onError: (err: { message?: string | string[] }) => {
      const msg = err.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al generar la RQ'))
    },
  })
}

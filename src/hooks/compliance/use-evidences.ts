import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'
import type { Evidence, EvidenceCategory, EvidenceUploadResult } from '@/src/types/compliance.types'

interface EvidencesParams {
  field_id?: string
  anio?: number
  mes?: number
  category?: EvidenceCategory
}

interface UploadParams {
  files: File[]
  field_id: string
  anio?: number
  mes?: number
  category?: EvidenceCategory
  onUploadProgress?: (percent: number) => void
}

export function useEvidences(params: EvidencesParams) {
  const q = new URLSearchParams()
  if (params.field_id) q.set('field_id', params.field_id)
  if (params.anio)     q.set('anio', String(params.anio))
  if (params.mes)      q.set('mes', String(params.mes))
  if (params.category) q.set('category', params.category)
  return useQuery({
    queryKey: ['evidences', params],
    queryFn: () => api.get<Evidence[]>(`/compliance/evidences?${q}`).then((r) => r.data),
    enabled: !!params.field_id,
  })
}

export function useUploadEvidences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ files, field_id, anio, mes, category, onUploadProgress }: UploadParams) => {
      const fd = new FormData()
      fd.append('field_id', field_id)
      if (anio)     fd.append('anio', String(anio))
      if (mes)      fd.append('mes', String(mes))
      if (category) fd.append('category', category)
      files.forEach((f) => fd.append('files', f))
      return api.post<EvidenceUploadResult>('/compliance/evidences/upload', fd, {
        headers: { 'Content-Type': undefined },
        timeout: 0,
        onUploadProgress: (e) => {
          if (e.total) onUploadProgress?.(Math.round((e.loaded * 100) / e.total))
        },
      }).then((r) => r.data)
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['evidences'] })
      toast.success(`${data.uploaded} archivo${data.uploaded !== 1 ? 's' : ''} subido${data.uploaded !== 1 ? 's' : ''} correctamente`)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al subir archivos'))
    },
  })
}

export function useClearEvidenceCache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (field_id?: string) => {
      const url = field_id
        ? `/compliance/evidences/cache?field_id=${field_id}`
        : '/compliance/evidences/cache'
      return api.delete(url).then((r) => r.data)
    },
    onSuccess: (_data, field_id) => {
      qc.invalidateQueries({ queryKey: ['evidences'] })
      toast.success(field_id ? 'Cache de la planta limpiado' : 'Cache general limpiado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al limpiar cache'))
    },
  })
}

export function useDeleteEvidence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/compliance/evidences/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidences'] })
      toast.success('Archivo eliminado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar'))
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'

export interface VoiceLog {
  id:                string
  user_id:           string
  transcription:     string
  original_filename: string
  created_at:        string
  updated_at:        string
}

export interface VoiceReport {
  title:   string
  report:  string
  sources: number
}

interface ListParams {
  from?:    string
  to?:      string
  user_id?: string
}

export function useVoiceLogs(params?: ListParams) {
  const q = new URLSearchParams()
  if (params?.from)    q.set('from',    params.from)
  if (params?.to)      q.set('to',      params.to)
  if (params?.user_id) q.set('user_id', params.user_id)
  const qs = q.toString()
  return useQuery({
    queryKey: ['voice-logs', params],
    queryFn:  () => api.get<VoiceLog[]>(`/voice-logs${qs ? `?${qs}` : ''}`).then((r) => r.data),
  })
}

export function useTranscribeAudio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('audio', file)
      return api.post<VoiceLog>('/voice-logs/transcribe', fd, {
        headers: { 'Content-Type': undefined },
        timeout: 0,
      }).then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voice-logs'] })
      toast.success('Audio transcrito correctamente')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al transcribir el audio'))
    },
  })
}

export function useDeleteVoiceLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/voice-logs/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voice-logs'] })
      toast.success('Registro eliminado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al eliminar'))
    },
  })
}

export function useGenerateVoiceReport() {
  return useMutation({
    mutationFn: ({ ids, title }: { ids: string[]; title?: string }) =>
      api.post<VoiceReport>('/voice-logs/report', { ids, title }).then((r) => r.data),
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al generar el informe'))
    },
  })
}

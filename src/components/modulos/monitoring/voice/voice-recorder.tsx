'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranscribeAudio } from '@/src/hooks/monitoring/use-voice-logs'

type RecState = 'idle' | 'recording' | 'processing'

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function VoiceRecorder() {
  const [recState, setRecState] = useState<RecState>('idle')
  const [elapsed,  setElapsed]  = useState(0)

  const mrRef    = useRef<MediaRecorder | null>(null)
  const chunks   = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const transcribe = useTranscribeAudio()

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  useEffect(() => stopTimer, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg'

      const mr = new MediaRecorder(stream, { mimeType })
      mrRef.current  = mr
      chunks.current = []

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks.current, { type: mimeType })
        const ext  = mimeType.includes('ogg') ? 'ogg' : 'webm'
        const file = new File([blob], `grabacion-${Date.now()}.${ext}`, { type: mimeType })
        stopTimer()
        setElapsed(0)
        setRecState('processing')
        transcribe.mutate(file, { onSettled: () => setRecState('idle') })
      }

      mr.start()
      setRecState('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } catch {
      toast.error('No se pudo acceder al microfono')
    }
  }

  function stopRecording() {
    mrRef.current?.stop()
  }

  return (
    <div
      className="rounded-xl p-8 flex flex-col items-center gap-5"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
    >
      <div className="text-center">
        <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-secundary)' }}>
          Grabar nota de voz
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
          Graba tu actividad y se transcribira automaticamente con IA
        </p>
      </div>

      {recState === 'idle' && (
        <button
          onClick={startRecording}
          className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 8px 24px rgba(26,107,107,0.35)' }}
        >
          <Mic size={32} />
        </button>
      )}

      {recState === 'recording' && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-base font-mono font-semibold tabular-nums" style={{ color: 'var(--color-text-900)' }}>
              {fmtTime(elapsed)}
            </span>
          </div>
          <button
            onClick={stopRecording}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: '#ef4444', color: '#fff', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}
          >
            <Square size={20} fill="#fff" />
          </button>
          <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Toca para detener</p>
        </div>
      )}

      {recState === 'processing' && (
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Procesando audio...</p>
          <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>La transcripcion aparecera en un momento</p>
        </div>
      )}
    </div>
  )
}

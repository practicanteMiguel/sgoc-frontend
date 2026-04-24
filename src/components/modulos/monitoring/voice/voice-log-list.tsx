'use client'

import { useState, useMemo } from 'react'
import { Mic, Trash2, Loader2, FileText, Check, CheckSquare, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useVoiceLogs, useDeleteVoiceLog, VoiceLog } from '@/src/hooks/monitoring/use-voice-logs'
import { VoiceReportModal } from './voice-report-modal'
import { ModalPortal } from '@/src/components/ui/modal-portal'

const INPUT_STYLE: React.CSSProperties = {
  background:   'var(--color-surface-1)',
  border:       '1.5px solid var(--color-border)',
  color:        'var(--color-text-900)',
  borderRadius: '8px',
  padding:      '6px 10px',
  fontSize:     '12px',
  outline:      'none',
}

export function VoiceLogList() {
  const [from,        setFrom]        = useState('')
  const [to,          setTo]          = useState('')
  const [fromTime,    setFromTime]    = useState('')
  const [toTime,      setToTime]      = useState('')
  const [selectMode,  setSelectMode]  = useState(false)
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [reportOpen,  setReportOpen]  = useState(false)
  const [detail,      setDetail]      = useState<VoiceLog | null>(null)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)

  // Dates go to backend; time filter is applied locally
  const { data: rawLogs = [], isLoading } = useVoiceLogs({
    from: from || undefined,
    to:   to   || undefined,
  })

  const logs = useMemo(() => {
    if (!fromTime && !toTime) return rawLogs
    return rawLogs.filter((log) => {
      const t = format(new Date(log.created_at), 'HH:mm')
      if (fromTime && toTime) return t >= fromTime && t <= toTime
      if (fromTime)           return t >= fromTime
      return                         t <= toTime
    })
  }, [rawLogs, fromTime, toTime])

  const deleteLog = useDeleteVoiceLog()

  function toggleSelectMode() {
    setSelectMode((v) => !v)
    setSelected(new Set())
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(selected.size === logs.length ? new Set() : new Set(logs.map((l) => l.id)))
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    deleteLog.mutate(id, {
      onSettled: () => {
        setDeletingId(null)
        setSelected((prev) => { const next = new Set(prev); next.delete(id); return next })
      },
    })
  }

  function handleItemClick(log: VoiceLog) {
    if (selectMode) toggleSelect(log.id)
    else            setDetail(log)
  }

  function handleCloseReport() {
    setReportOpen(false)
    exitSelectMode()
  }

  return (
    <>
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-secundary)' }}>
              Mis transcripciones
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {isLoading ? 'Cargando...' : `${logs.length} registro${logs.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date range */}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={INPUT_STYLE} />
            <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>-</span>
            <input type="date" value={to}   onChange={(e) => setTo(e.target.value)}   style={INPUT_STYLE} />

            {/* Separator */}
            <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', alignSelf: 'center' }} />

            {/* Time range */}
            <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} style={{ ...INPUT_STYLE, width: '96px' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>-</span>
            <input type="time" value={toTime}   onChange={(e) => setToTime(e.target.value)}   style={{ ...INPUT_STYLE, width: '96px' }} />
            {(fromTime || toTime) && (
              <button
                onClick={() => { setFromTime(''); setToTime('') }}
                className="w-6 h-6 rounded flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-text-400)', border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
                title="Limpiar filtro de hora"
              >
                <X size={11} />
              </button>
            )}

            {selectMode && selected.size > 0 && (
              <button
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                <FileText size={12} />
                Generar informe ({selected.size})
              </button>
            )}

            {logs.length > 0 && (
              <button
                onClick={toggleSelectMode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                style={{
                  background:  selectMode ? 'var(--color-surface-2)' : 'var(--color-surface-1)',
                  border:      '1.5px solid var(--color-border)',
                  color:       'var(--color-text-700)',
                }}
              >
                <CheckSquare size={12} />
                {selectMode ? 'Cancelar' : 'Seleccionar'}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <Mic size={28} style={{ color: 'var(--color-text-400)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>No hay transcripciones</p>
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Graba tu primera nota de voz arriba</p>
          </div>
        ) : (
          <>
            {selectMode && logs.length > 1 && (
              <div
                className="flex items-center gap-2 px-5 py-2 cursor-pointer hover:opacity-70 transition-opacity"
                style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
                onClick={toggleAll}
              >
                <Checkbox checked={selected.size === logs.length} />
                <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                  {selected.size === logs.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </span>
                {selected.size > 0 && selected.size < logs.length && (
                  <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                    ({selected.size} seleccionados)
                  </span>
                )}
              </div>
            )}

            <div className="divide-y" style={{ ['--tw-divide-color' as any]: 'var(--color-border)' }}>
              {logs.map((log) => {
                const isSelected = selected.has(log.id)
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors"
                    style={{ background: isSelected ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)' : 'transparent' }}
                    onClick={() => handleItemClick(log)}
                  >
                    {selectMode && (
                      <div className="shrink-0 mt-0.5">
                        <Checkbox checked={isSelected} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-3" style={{ color: 'var(--color-text-900)' }}>
                        {log.transcription}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}
                        >
                          {log.original_filename}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-400)' }}>
                          {format(new Date(log.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(log.id) }}
                      disabled={deletingId === log.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity shrink-0"
                      style={{ color: 'var(--color-error, #ef4444)' }}
                    >
                      {deletingId === log.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {reportOpen && (
        <VoiceReportModal
          ids={Array.from(selected)}
          onClose={handleCloseReport}
        />
      )}

      {detail && (
        <VoiceDetailModal log={detail} onClose={() => setDetail(null)} />
      )}
    </>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div
      className="w-4 h-4 rounded flex items-center justify-center border transition-all"
      style={{
        background:  checked ? 'var(--color-primary)' : 'transparent',
        borderColor: checked ? 'var(--color-primary)' : 'var(--color-border)',
      }}
    >
      {checked && <Check size={10} color="#fff" />}
    </div>
  )
}

function VoiceDetailModal({ log, onClose }: { log: VoiceLog; onClose: () => void }) {
  return (
    <ModalPortal onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
          width:      '560px',
          maxHeight:  '80vh',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-secundary)' }}>
              Transcripcion
            </p>
            <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--color-text-400)' }}>
              {log.original_filename} &middot;{' '}
              {format(new Date(log.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-400)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-900)' }}>
            {log.transcription}
          </p>
        </div>
      </div>
    </ModalPortal>
  )
}

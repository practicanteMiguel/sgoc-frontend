'use client'

import { useState, useMemo } from 'react'
import { Mic, Loader2, Users, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useVoiceLogs, VoiceLog } from '@/src/hooks/monitoring/use-voice-logs'
import { useListUsersSelect } from '@/src/hooks/users/use-users'
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

export function VoiceAdminPanel() {
  const [userId,    setUserId]    = useState('')
  const [from,      setFrom]      = useState('')
  const [to,        setTo]        = useState('')
  const [fromTime,  setFromTime]  = useState('')
  const [toTime,    setToTime]    = useState('')
  const [detail,    setDetail]    = useState<VoiceLog | null>(null)

  // Dates go to backend; time filter is applied locally
  const { data: rawLogs = [], isLoading } = useVoiceLogs({
    user_id: userId || undefined,
    from:    from   || undefined,
    to:      to     || undefined,
  })
  const { data: users = [] } = useListUsersSelect()

  const userMap = useMemo(() => {
    const m = new Map<string, string>()
    users.forEach((u) => m.set(u.id, `${u.first_name} ${u.last_name}`))
    return m
  }, [users])

  const logs = useMemo(() => {
    if (!fromTime && !toTime) return rawLogs
    return rawLogs.filter((log) => {
      const t = format(new Date(log.created_at), 'HH:mm')
      if (fromTime && toTime) return t >= fromTime && t <= toTime
      if (fromTime)           return t >= fromTime
      return                         t <= toTime
    })
  }, [rawLogs, fromTime, toTime])

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
              Transcripciones de voz
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {isLoading ? 'Cargando...' : `${logs.length} registro${logs.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ ...INPUT_STYLE, cursor: 'pointer' }}
            >
              <option value="">Todos los usuarios</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>

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
          </div>
        ) : (
          <div className="divide-y" style={{ ['--tw-divide-color' as any]: 'var(--color-border)' }}>
            {logs.map((log) => {
              const userName = userMap.get(log.user_id) ?? `${log.user_id.slice(0, 8)}...`
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors hover:opacity-80"
                  onClick={() => setDetail(log)}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'var(--color-secondary-muted)', color: 'var(--color-secondary)' }}
                  >
                    <Users size={14} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text-700)' }}>
                        {userName}
                      </span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}
                      >
                        {log.original_filename}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2" style={{ color: 'var(--color-text-900)' }}>
                      {log.transcription}
                    </p>
                    <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-400)' }}>
                      {format(new Date(log.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {detail && (
        <VoiceDetailModal
          log={detail}
          userName={userMap.get(detail.user_id) ?? `${detail.user_id.slice(0, 8)}...`}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  )
}

function VoiceDetailModal({ log, userName, onClose }: { log: VoiceLog; userName: string; onClose: () => void }) {
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
              {userName}
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

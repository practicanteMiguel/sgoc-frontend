'use client'

import { Activity, Mic } from 'lucide-react'
import { useAuthStore } from '@/src/stores/auth.store'
import { AuditLogsList } from './audit/audit-log-list'
import { VoiceRecorder } from './voice/voice-recorder'
import { VoiceLogList } from './voice/voice-log-list'
import { VoiceAdminPanel } from './voice/voice-admin-panel'

export function MonitoringView() {
  const { user } = useAuthStore()
  const isAdmin  = user?.roles?.includes('admin')

  return (
    <div className="max-w-8xl p-10 mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--color-secondary-muted)', color: 'var(--color-secondary)' }}
          >
            {isAdmin ? <Activity size={18} strokeWidth={1.8} /> : <Mic size={18} strokeWidth={1.8} />}
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-secundary)' }}>
              {isAdmin ? 'Monitoreo Operativo' : 'Notas de voz'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
              {isAdmin
                ? 'Indicadores en tiempo real del estado de la operacion'
                : 'Graba y transcribe tus actividades del dia'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {isAdmin ? (
          <>
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
            >
              <AuditLogsList />
            </div>
            <VoiceAdminPanel />
          </>
        ) : (
          <>
            <VoiceRecorder />
            <VoiceLogList />
          </>
        )}
      </div>
    </div>
  )
}

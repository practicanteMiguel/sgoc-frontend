'use client'

import { useState, useMemo } from 'react'
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Image, FileText, Calendar, Lock } from 'lucide-react'
import { useLog, useDeleteActivity } from '@/src/hooks/activities/use-logbook'
import { useTechnicalReports } from '@/src/hooks/activities/use-technical-reports'
import { ActivityFormModal } from './activity-form-modal'
import type { Activity, TechnicalReport } from '@/src/types/activities.types'

interface Props {
  logId:             string
  onBack:            () => void
  onGenerateReport:  (logId: string, crewId: string) => void
  readOnly?:         boolean
}

function fmt(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function ImageThumb({ src, label }: { src: string | null; label: string }) {
  if (!src) return (
    <div
      className="rounded flex items-center justify-center"
      style={{ width: 56, height: 42, background: 'var(--color-surface-2)', flexShrink: 0 }}
    >
      <Image size={14} style={{ color: 'var(--color-text-400)' }} />
    </div>
  )
  return (
    <div className="relative rounded overflow-hidden" style={{ width: 56, height: 42, flexShrink: 0 }}>
      <img src={src} alt={label} className="w-full h-full object-cover" />
    </div>
  )
}

export function LogbookDetail({ logId, onBack, onGenerateReport, readOnly }: Props) {
  const { data: log, isLoading }    = useLog(logId)
  const { data: crewReports = [] }  = useTechnicalReports(
    log ? { crew_id: log.crew.id } : undefined,
  )
  const hasReport = useMemo(
    () => (crewReports as TechnicalReport[]).some((r) => r.weekly_log?.id === logId),
    [crewReports, logId],
  )

  const deleteActivity           = useDeleteActivity()
  const [actModal, setActModal]  = useState<{ open: boolean; activity?: Activity | null }>({ open: false })
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
      </div>
    )
  }

  if (!log) return null

  const activities = log.activities ?? []

  function handleDelete(activity: Activity) {
    setDeletingId(activity.id)
    deleteActivity.mutate(
      { logId, activityId: activity.id },
      { onSettled: () => setDeletingId(null) },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-secundary)' }}>
              {log.crew.name}
            </h3>
            <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              <Calendar size={11} />
              Semana {log.week_number} &middot; {log.year}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && !hasReport && (
            <button
              onClick={() => setActModal({ open: true, activity: null })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)', border: '1px solid var(--color-border)' }}
            >
              <Plus size={13} /> Agregar actividad
            </button>
          )}
          {!readOnly && hasReport && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: '#d1fae5', color: '#065f46' }}
            >
              <Lock size={12} /> Bitacora cerrada
            </div>
          )}
          {!readOnly && (
            <button
              onClick={() => onGenerateReport(logId, log.crew.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <FileText size={13} /> {hasReport ? 'Ver informe' : 'Generar informe'}
            </button>
          )}
        </div>
      </div>

      {/* Activities */}
      {activities.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <FileText size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin actividades</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
            {readOnly ? 'Esta bitacora no tiene actividades.' : 'Agrega la primera actividad con el boton superior.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map((act) => (
            <div
              key={act.id}
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
            >
              {/* Activity header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                    {act.description}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                    {fmt(act.start_date)}
                    {act.end_date !== act.start_date && ` - ${fmt(act.end_date)}`}
                  </p>
                  {act.notes && (
                    <p className="text-xs mt-1 italic" style={{ color: 'var(--color-text-400)' }}>
                      {act.notes}
                    </p>
                  )}
                </div>
                {!readOnly && !hasReport && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setActModal({ open: true, activity: act })}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--color-text-400)' }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(act)}
                      disabled={deletingId === act.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--color-error, #ef4444)' }}
                    >
                      {deletingId === act.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Images row */}
              <div className="flex items-center gap-3 flex-wrap">
                {(['image_before', 'image_during', 'image_after'] as const).map((key) => {
                  const labels: Record<string, string> = {
                    image_before: 'Antes',
                    image_during: 'Durante',
                    image_after:  'Despues',
                  }
                  return (
                    <div key={key} className="flex flex-col items-center gap-1">
                      {act[key] ? (
                        <a href={act[key]!} target="_blank" rel="noreferrer">
                          <ImageThumb src={act[key]} label={labels[key]} />
                        </a>
                      ) : (
                        <ImageThumb src={null} label={labels[key]} />
                      )}
                      <span className="text-[10px]" style={{ color: 'var(--color-text-400)' }}>
                        {labels[key]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {actModal.open && (
        <ActivityFormModal
          logId={logId}
          activity={actModal.activity}
          onClose={() => setActModal({ open: false })}
        />
      )}
    </div>
  )
}

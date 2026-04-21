'use client'

import { useState } from 'react'
import {
  MapPin, Users, BookOpen, FileText, Loader2, ChevronRight,
  TrendingUp, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { useFields } from '@/src/hooks/reports/use-fields'
import { useCrews } from '@/src/hooks/activities/use-crews'
import { useLogs } from '@/src/hooks/activities/use-logbook'
import { useTechnicalReports } from '@/src/hooks/activities/use-technical-reports'
import { LogbookDetail } from './logbook-detail'
import { ReportGenerate } from './report-generate'
import type { WeeklyLogSummary, TechnicalReport } from '@/src/types/activities.types'

// Contract field ID to exclude (same pattern as evidencias)
const CONTRACT_FIELD_ID = '5f96a67e-b392-4c77-95ae-5d80f5c0f05c'

type DrillView =
  | null
  | { type: 'logbook'; logId: string; crewId: string }
  | { type: 'report';  logId: string; crewId: string }

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
    >
      <span className="text-2xl font-bold font-display" style={{ color: color ?? 'var(--color-text-900)' }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{label}</span>
    </div>
  )
}

function fmt(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function CoordinatorActivitiesView() {
  const [fieldId,   setFieldId]   = useState('')
  const [drillView, setDrillView] = useState<DrillView>(null)

  const { data: fieldsData, isLoading: loadingFields } = useFields()
  const fields = (fieldsData?.data ?? []).filter((f) => f.id !== CONTRACT_FIELD_ID)

  const selectedField = fields.find((f) => f.id === fieldId)

  const { data: crewsData, isLoading: loadingCrews } = useCrews(
    fieldId ? { field_id: fieldId } : undefined,
  )
  const crews = (crewsData?.data ?? [])

  // Fetch logs for all crews in the field (we pass no crew_id to get all)
  const { data: allLogs = [], isLoading: loadingLogs } = useLogs()
  const fieldLogs = (allLogs as WeeklyLogSummary[]).filter((l) =>
    crews.some((c) => c.id === l.crew.id),
  )

  const { data: allReports = [], isLoading: loadingReports } = useTechnicalReports()
  const fieldReports = (allReports as TechnicalReport[]).filter((r) =>
    crews.some((c) => c.id === r.crew?.id),
  )

  const scheduled   = fieldReports.filter((r) =>
    (r.weekly_log?.activities ?? []).length === 0 ||
    (r.weekly_log?.activities ?? []).every((a) => a.is_scheduled !== false),
  ).length
  const unscheduled = fieldReports.length - scheduled
  const pct         = fieldReports.length ? Math.round((scheduled / fieldReports.length) * 100) : 0

  if (drillView?.type === 'logbook') {
    return (
      <div>
        <LogbookDetail
          logId={drillView.logId}
          readOnly
          onBack={() => setDrillView(null)}
          onGenerateReport={(logId, crewId) => setDrillView({ type: 'report', logId, crewId })}
        />
      </div>
    )
  }

  if (drillView?.type === 'report') {
    return (
      <ReportGenerate
        logId={drillView.logId}
        crewId={drillView.crewId}
        fieldName={selectedField?.name}
        onBack={() => setDrillView({ type: 'logbook', logId: drillView.logId, crewId: drillView.crewId })}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Field selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <MapPin size={15} style={{ color: 'var(--color-text-400)' }} />
        {loadingFields ? (
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        ) : (
          <select
            value={fieldId}
            onChange={(e) => { setFieldId(e.target.value); setDrillView(null) }}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--color-surface-0)',
              border:     '1.5px solid var(--color-border)',
              color:      fieldId ? 'var(--color-text-900)' : 'var(--color-text-400)',
              minWidth:   180,
            }}
          >
            <option value="">Seleccionar planta...</option>
            {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
        {selectedField && (
          <span className="text-sm" style={{ color: 'var(--color-text-400)' }}>
            {selectedField.location}
          </span>
        )}
      </div>

      {!fieldId && (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <MapPin size={30} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
            Selecciona una planta para ver sus actividades
          </p>
        </div>
      )}

      {fieldId && (loadingCrews || loadingLogs || loadingReports) && (
        <div className="flex justify-center py-12">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      )}

      {fieldId && !loadingCrews && !loadingLogs && !loadingReports && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Cuadrillas" value={crews.length} />
            <StatCard label="Bitacoras" value={fieldLogs.length} />
            <StatCard label="Informes" value={fieldReports.length} />
            <StatCard
              label="Cumplimiento"
              value={`${pct}%`}
              color={pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}
            />
          </div>

          {/* Programadas vs no programadas */}
          {fieldReports.length > 0 && (
            <div
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={14} style={{ color: 'var(--color-text-400)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text-700)' }}>
                  Estado de actividades en informes
                </span>
              </div>
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                    {scheduled} programada{scheduled !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                    {unscheduled} no programada{unscheduled !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width:      `${pct}%`,
                    background: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          )}

          {/* Crews + their logs */}
          {crews.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-14 rounded-xl"
              style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
            >
              <Users size={26} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
                Esta planta no tiene cuadrillas registradas.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-400)' }}>
                Cuadrillas y bitacoras
              </h4>
              {crews.map((crew) => {
                const crewLogs = fieldLogs.filter((l) => l.crew.id === crew.id)
                return (
                  <div
                    key={crew.id}
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--color-border)' }}
                  >
                    {/* Crew header */}
                    <div
                      className="flex items-center gap-3 px-4 py-3"
                      style={{ background: 'var(--color-surface-1)', borderBottom: crewLogs.length > 0 ? '1px solid var(--color-border)' : 'none' }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'var(--color-surface-2)' }}
                      >
                        <Users size={14} style={{ color: 'var(--color-text-400)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                          {crew.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                          {crew.employees.length} empleado{crew.employees.length !== 1 ? 's' : ''} &middot; {crewLogs.length} bitacora{crewLogs.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Logbooks */}
                    {crewLogs.length > 0 && (
                      <div
                        className="divide-y"
                        style={{ background: 'var(--color-surface-0)', ['--tw-divide-color' as any]: 'var(--color-border)' }}
                      >
                        {crewLogs.map((log) => (
                          <button
                            key={log.id}
                            onClick={() => setDrillView({ type: 'logbook', logId: log.id, crewId: log.crew.id })}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity"
                          >
                            <BookOpen size={13} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                            <span className="flex-1 text-xs" style={{ color: 'var(--color-text-700)' }}>
                              Semana {log.week_number} &middot; {log.year}
                            </span>
                            <ChevronRight size={13} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Recent reports */}
          {fieldReports.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-400)' }}>
                Informes tecnicos
              </h4>
              {fieldReports.slice(0, 20).map((report) => {
                const wl   = report.weekly_log
                const acts = wl?.activities ?? []
                return (
                  <button
                    key={report.id}
                    onClick={() => setDrillView({ type: 'report', logId: wl.id, crewId: report.crew.id })}
                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:opacity-90"
                    style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--color-surface-2)' }}
                    >
                      <FileText size={13} style={{ color: 'var(--color-text-400)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                        {report.crew?.name} &middot; {acts.length} actividad{acts.length !== 1 ? 'es' : ''}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>
                        Sem. {wl?.week_number ?? '-'} / {wl?.year ?? '-'}
                      </p>
                    </div>
                    <ChevronRight size={13} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

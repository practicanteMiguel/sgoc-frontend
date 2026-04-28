'use client'

import { useState } from 'react'
import { Plus, Calendar, FileText, Loader2, ChevronRight, Trash2, Map } from 'lucide-react'
import { useAuthStore } from '@/src/stores/auth.store'
import { useViaLogs, useCreateViaLog, useDeleteViaLog } from '@/src/hooks/vias/use-via-logs'
import { useViaReports, useDeleteViaReport } from '@/src/hooks/vias/use-via-reports'
import { ViaLogDetail } from './via-log-detail'
import { ViaReportForm } from './via-report-form'
import { ViaReportDetail } from './via-report-detail'
import { MONTHS, VIA_STATE_COLORS, VIA_STATE_LABELS } from '@/src/types/vias.types'
import type { ViaMonthlyLog, ViaMonthlyLogSummary, ViaState } from '@/src/types/vias.types'

type SubTab = 'registros' | 'informes'

type DrillView =
  | null
  | { type: 'log';    log:      ViaMonthlyLog }
  | { type: 'form';   log:      ViaMonthlyLog }
  | { type: 'report'; reportId: string }

const NOW = new Date()

function CreateLogForm({
  fieldId,
  onCreated,
}: {
  fieldId:   string
  onCreated: (log: ViaMonthlyLog) => void
}) {
  const [month, setMonth] = useState(NOW.getMonth() + 1)
  const [year,  setYear]  = useState(NOW.getFullYear())
  const create = useCreateViaLog()

  return (
    <div
      className="rounded-xl p-4 flex flex-wrap items-end gap-3"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
    >
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-400)' }}>Mes</label>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-900)' }}
        >
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-400)' }}>Año</label>
        <input
          type="number"
          min={2020}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-900)' }}
        />
      </div>
      <button
        onClick={() => create.mutate({ field_id: fieldId, month, year }, { onSuccess: (log) => onCreated(log) })}
        disabled={create.isPending}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
        style={{ background: 'var(--color-primary)', color: '#fff', opacity: create.isPending ? 0.6 : 1 }}
      >
        {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Crear registro
      </button>
    </div>
  )
}

function StateBadge({ state }: { state: ViaState }) {
  const color = VIA_STATE_COLORS[state]
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `${color}22`, color }}
    >
      {VIA_STATE_LABELS[state]}
    </span>
  )
}

export function SupervisorViasView() {
  const { user }   = useAuthStore()
  const fieldId    = user?.field_id ?? null

  const [subTab,       setSubTab]       = useState<SubTab>('registros')
  const [drillView,    setDrillView]    = useState<DrillView>(null)
  const [showForm,     setShowForm]     = useState(false)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)

  const { data: logsData,    isLoading: loadingLogs    } = useViaLogs(fieldId ? { field_id: fieldId } : undefined)
  const { data: reportsData, isLoading: loadingReports } = useViaReports(fieldId ? { field_id: fieldId } : undefined)
  const deleteLog    = useDeleteViaLog()
  const deleteReport = useDeleteViaReport()

  const logs    = logsData?.data    ?? []
  const reports = reportsData?.data ?? []

  // A log has a report if any report's monthly_log.id matches
  const reportedLogIds = new Set(reports.map((r) => r.monthly_log?.id))

  // ── Drill views ──
  if (drillView?.type === 'log') {
    return (
      <ViaLogDetail
        log={drillView.log}
        onBack={() => setDrillView(null)}
        onReport={(fullLog) => setDrillView({ type: 'form', log: fullLog })}
      />
    )
  }

  if (drillView?.type === 'form') {
    return (
      <ViaReportForm
        log={drillView.log}
        onBack={() => setDrillView({ type: 'log', log: drillView.log })}
        onDone={(reportId) => setDrillView({ type: 'report', reportId })}
      />
    )
  }

  if (drillView?.type === 'report') {
    return (
      <ViaReportDetail
        reportId={drillView.reportId}
        onBack={() => setDrillView(null)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div
          className="flex items-center gap-1 rounded-xl p-1 w-fit"
          style={{ background: 'var(--color-surface-2)' }}
        >
          {(['registros', 'informes'] as SubTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: subTab === t ? 'var(--color-surface-0)' : 'transparent',
                color:      subTab === t ? 'var(--color-text-900)' : 'var(--color-text-400)',
              }}
            >
              {t === 'registros' ? 'Registros' : 'Informes'}
            </button>
          ))}
        </div>

        {subTab === 'registros' && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              background: showForm ? 'var(--color-surface-2)' : 'var(--color-primary)',
              color:      showForm ? 'var(--color-text-700)' : '#fff',
              border:     showForm ? '1px solid var(--color-border)' : 'none',
            }}
          >
            <Plus size={13} /> Nuevo registro
          </button>
        )}
      </div>

      {/* ── REGISTROS TAB ── */}
      {subTab === 'registros' && (
        <div className="flex flex-col gap-3">
          {showForm && fieldId && (
            <CreateLogForm
              fieldId={fieldId}
              onCreated={(log) => {
                setShowForm(false)
                setDrillView({ type: 'log', log })
              }}
            />
          )}

          {loadingLogs ? (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : logs.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 rounded-xl"
              style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
            >
              <Calendar size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin registros</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
                Crea el primer registro mensual con el boton "Nuevo registro".
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const hasReport = reportedLogIds.has(log.id)
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{
                    background: 'var(--color-surface-0)',
                    border:     `1px solid ${hasReport ? '#6ee7b7' : 'var(--color-border)'}`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: hasReport ? '#d1fae5' : 'var(--color-surface-2)' }}
                  >
                    {hasReport
                      ? <FileText size={15} style={{ color: '#065f46' }} />
                      : <Calendar size={16} style={{ color: 'var(--color-text-400)' }} />}
                  </div>
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => {
                      // Load full log detail
                      setDrillView({ type: 'log', log: log as unknown as ViaMonthlyLog })
                    }}
                  >
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
                      {MONTHS[(log.month ?? 1) - 1]} {log.year}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                      {hasReport ? 'Informe generado' : 'Sin informe'}
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(log.id)
                      deleteLog.mutate(log.id, { onSettled: () => setDeletingId(null) })
                    }}
                    disabled={deletingId === log.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity shrink-0"
                    style={{ color: 'var(--color-error, #ef4444)' }}
                  >
                    {deletingId === log.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />}
                  </button>
                  <ChevronRight size={16} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── INFORMES TAB ── */}
      {subTab === 'informes' && (
        <div className="flex flex-col gap-3">
          {loadingReports ? (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : reports.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 rounded-xl"
              style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
            >
              <Map size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin informes</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
                Abre un registro y usa "Crear informe mensual" para generar el primero.
              </p>
            </div>
          ) : (
            reports.map((report) => {
              const stateCounts = (report.items ?? []).reduce<Record<string, number>>((acc, item) => {
                acc[item.state] = (acc[item.state] ?? 0) + 1
                return acc
              }, {})
              return (
                <button
                  key={report.id}
                  onClick={() => setDrillView({ type: 'report', reportId: report.id })}
                  className="flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:opacity-90"
                  style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-surface-2)' }}
                  >
                    <Map size={16} style={{ color: 'var(--color-text-400)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
                      {MONTHS[(report.monthly_log?.month ?? 1) - 1]} {report.monthly_log?.year}
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-400)' }}>
                        {report.type === 'mensual' ? 'Mensual' : 'Urgente'}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {Object.entries(stateCounts).map(([state, count]) => (
                        <StateBadge key={state} state={state as ViaState} />
                      ))}
                      <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                        {report.items?.length ?? 0} via{(report.items?.length ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { Plus, Calendar, FileText, Loader2, ChevronRight, ChevronLeft, Trash2, Map, List, FileDown, Mail, Square, CheckSquare } from 'lucide-react'
import { useAuthStore } from '@/src/stores/auth.store'
import { useField } from '@/src/hooks/reports/use-fields'
import { useViaLogs, useCreateViaLog, useDeleteViaLog } from '@/src/hooks/vias/use-via-logs'
import { useViaReports, useDeleteViaReport } from '@/src/hooks/vias/use-via-reports'
import { ViaLogDetail } from './via-log-detail'
import { ViaReportForm } from './via-report-form'
import { ViaReportDetail } from './via-report-detail'
import { MONTHS, VIA_STATE_COLORS, VIA_STATE_LABELS } from '@/src/types/vias.types'
import type { ViaMonthlyLog, ViaMonthlyLogSummary, ViaState } from '@/src/types/vias.types'

const ViaMap = dynamic(
  () => import('./via-map').then((m) => m.ViaMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-xl"
        style={{ height: 420, background: 'var(--color-surface-1)' }}
      >
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
      </div>
    ),
  },
)

type SubTab = 'registros' | 'informes'

type DrillView =
  | null
  | { type: 'log';    log:      ViaMonthlyLog }
  | { type: 'form';   log:      ViaMonthlyLog }
  | { type: 'report'; reportId: string }

const NOW = new Date()

// Card accent colors by report type
const REPORT_ACCENT = {
  mensual: { border: '#6ee7b7', bg: '#d1fae5', label: '#065f46' },
  urgente: { border: '#fca5a5', bg: '#fee2e2', label: '#991b1b' },
} as const

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
  const { data: fieldData } = useField(fieldId)

  const [subTab,            setSubTab]            = useState<SubTab>('registros')
  const [drillView,         setDrillView]         = useState<DrillView>(null)
  const [showForm,          setShowForm]          = useState(false)
  const [deletingId,        setDeletingId]        = useState<string | null>(null)

  // Informes tab state
  const [filterMonth,       setFilterMonth]       = useState(NOW.getMonth() + 1)
  const [filterYear,        setFilterYear]        = useState(NOW.getFullYear())
  const [selectedReportId,  setSelectedReportId]  = useState<string | null>(null)
  const [rightView,         setRightView]         = useState<'map' | 'list'>('map')
  const [deletingReportId,     setDeletingReportId]     = useState<string | null>(null)
  const [downloadingWord,      setDownloadingWord]      = useState(false)
  // null = all reports selected; Set = only those IDs selected
  const [selectedViaIds,       setSelectedViaIds]       = useState<Set<string> | null>(null)

  // Queries
  const { data: logsData,    isLoading: loadingLogs    } = useViaLogs(fieldId ? { field_id: fieldId } : undefined)
  // Unfiltered reports for registros tab status badges
  const { data: reportsData                            } = useViaReports(fieldId ? { field_id: fieldId } : undefined)
  // Filtered reports for informes tab display
  const { data: filteredData, isLoading: loadingFiltered } = useViaReports(
    fieldId ? { field_id: fieldId, year: filterYear, month: filterMonth } : undefined,
  )

  const deleteLog    = useDeleteViaLog()
  const deleteReport = useDeleteViaReport()

  const logs            = logsData?.data    ?? []
  const reports         = reportsData?.data ?? []
  const filteredReports = filteredData?.data ?? []

  const fieldName = filteredReports[0]?.monthly_log?.field?.name ?? logsData?.data[0]?.field?.name ?? 'Campo'

  async function handleDownloadWord() {
    if (reportsToDownload.length === 0) return
    setDownloadingWord(true)
    try {
      const { generateViaWord } = await import('@/src/lib/generate-via-word')
      const blob = await generateViaWord(reportsToDownload, filterMonth, filterYear, fieldName)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `Informe_Vias_${MONTHS[filterMonth - 1]}_${filterYear}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingWord(false)
    }
  }

  async function handleGmailVia() {
    if (reportsToDownload.length === 0) return
    setDownloadingWord(true)
    try {
      const { downloadViaPdf } = await import('@/src/lib/generate-via-pdf')
      await downloadViaPdf(reportsToDownload, filterMonth, filterYear, fieldName)
      const sub  = encodeURIComponent(`Informe Estado de Vias - ${fieldName} - ${MONTHS[filterMonth - 1]} ${filterYear}`)
      const body = encodeURIComponent(`Adjunto informe de seguimiento al estado de vias de acceso, periodo ${MONTHS[filterMonth - 1]} ${filterYear}. Campo: ${fieldName}.`)
      window.open(`https://mail.google.com/mail/u/0/?view=cm&fs=1&su=${sub}&body=${body}`, '_blank')
    } finally {
      setDownloadingWord(false)
    }
  }

  const reportedLogIds = new Set(reports.map((r) => r.monthly_log?.id))
  const monthlyReportedLogIds = new Set(
    reports.filter((r) => r.type === 'mensual').map((r) => r.monthly_log?.id),
  )

  // Map data for informes tab
  const selectedReport     = filteredReports.find((r) => r.id === selectedReportId) ?? null
  const allMonthPoints     = useMemo(
    () => filteredReports.flatMap((r) => r.map_points ?? []),
    [filteredReports],
  )
  const highlightedItemIds = useMemo(
    () => selectedReport
      ? new Set((selectedReport.map_points ?? []).map((p) => p.item_id!).filter(Boolean))
      : undefined,
    [selectedReport],
  )

  function prevFilterMonth() {
    setSelectedReportId(null)
    setSelectedViaIds(null)
    if (filterMonth === 1) { setFilterMonth(12); setFilterYear((y) => y - 1) }
    else setFilterMonth((m) => m - 1)
  }
  function nextFilterMonth() {
    setSelectedReportId(null)
    setSelectedViaIds(null)
    if (filterMonth === 12) { setFilterMonth(1); setFilterYear((y) => y + 1) }
    else setFilterMonth((m) => m + 1)
  }

  function isViaChecked(id: string) {
    return selectedViaIds === null || selectedViaIds.has(id)
  }

  function toggleViaId(id: string) {
    if (selectedViaIds === null) {
      const next = new Set(filteredReports.map((r) => r.id))
      next.delete(id)
      setSelectedViaIds(next.size > 0 ? next : new Set())
    } else {
      const next = new Set(selectedViaIds)
      next.has(id) ? next.delete(id) : next.add(id)
      setSelectedViaIds(next.size === filteredReports.length ? null : next)
    }
  }

  const reportsToDownload = selectedViaIds === null
    ? filteredReports
    : filteredReports.filter((r) => selectedViaIds.has(r.id))

  const allViaChecked = selectedViaIds === null

  // ── Drill views ──
  if (drillView?.type === 'log') {
    return (
      <ViaLogDetail
        log={drillView.log}
        hasMonthlyReport={monthlyReportedLogIds.has(drillView.log.id)}
        onBack={() => setDrillView(null)}
        onReport={(fullLog) => setDrillView({ type: 'form', log: fullLog })}
      />
    )
  }

  if (drillView?.type === 'form') {
    return (
      <ViaReportForm
        log={drillView.log}
        hasMonthlyReport={monthlyReportedLogIds.has(drillView.log.id)}
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
                Crea el primer registro mensual con el boton &quot;Nuevo registro&quot;.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const hasReport  = reportedLogIds.has(log.id)
              const hasMonthly = monthlyReportedLogIds.has(log.id)
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
                      setDrillView({ type: 'log', log: log as unknown as ViaMonthlyLog })
                    }}
                  >
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
                      {MONTHS[(log.month ?? 1) - 1]} {log.year}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {hasMonthly && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: '#d1fae5', color: '#065f46' }}
                        >
                          Informe mensual
                        </span>
                      )}
                      {!hasReport && (
                        <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin informe</span>
                      )}
                    </div>
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
        <div className="flex flex-col gap-4">
          {/* Month navigator + download */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="flex items-center gap-1 rounded-xl p-1"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <button
                onClick={prevFilterMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-text-600)' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span
                className="px-3 py-1.5 rounded-lg text-sm font-semibold min-w-36 text-center"
                style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
              >
                {MONTHS[filterMonth - 1]} {filterYear}
              </span>
              <button
                onClick={nextFilterMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-text-600)' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {filteredReports.length > 0 && (
              <>
                <button
                  onClick={handleDownloadWord}
                  disabled={downloadingWord || reportsToDownload.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                    opacity: (downloadingWord || reportsToDownload.length === 0) ? 0.5 : 1,
                  }}
                >
                  {downloadingWord
                    ? <Loader2 size={13} className="animate-spin" />
                    : <FileDown size={13} />}
                  {downloadingWord
                    ? 'Generando...'
                    : reportsToDownload.length < filteredReports.length
                      ? `Descargar informe (${reportsToDownload.length})`
                      : 'Descargar informe'}
                </button>

                <button
                  onClick={handleGmailVia}
                  disabled={downloadingWord || reportsToDownload.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{
                    background: 'var(--color-surface-1)',
                    color: 'var(--color-text-700)',
                    border: '1px solid var(--color-border)',
                    opacity: (downloadingWord || reportsToDownload.length === 0) ? 0.5 : 1,
                  }}
                >
                  <Mail size={13} /> Enviar Gmail
                </button>
              </>
            )}
          </div>

          {/* Selection banner - only when multiple reports */}
          {filteredReports.length > 1 && (
            <div
              className="flex items-center gap-3 px-3 py-2 rounded-xl flex-wrap"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
            >
              <span className="text-xs" style={{ color: 'var(--color-text-500)' }}>
                {reportsToDownload.length} de {filteredReports.length} informes seleccionados
              </span>
              <button
                onClick={() => setSelectedViaIds(allViaChecked ? new Set() : null)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)', border: '1px solid var(--color-border)' }}
              >
                {allViaChecked
                  ? <><Square size={11} /> Deseleccionar todos</>
                  : <><CheckSquare size={11} /> Seleccionar todos</>}
              </button>
            </div>
          )}

          {/* Split layout */}
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Left: report list */}
            <div className="w-full sm:w-64 shrink-0 flex flex-col gap-2" style={{ maxHeight: 520, overflowY: 'auto' }}>
              {loadingFiltered ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                </div>
              ) : filteredReports.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12 rounded-xl"
                  style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
                >
                  <Map size={24} className="mb-2" style={{ color: 'var(--color-text-400)' }} />
                  <p className="text-xs text-center px-4" style={{ color: 'var(--color-text-400)' }}>
                    Sin informes para {MONTHS[filterMonth - 1]} {filterYear}
                  </p>
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isSelected = report.id === selectedReportId
                  const accent     = REPORT_ACCENT[report.type]
                  const uniqueStates = [...new Set((report.items ?? []).map((i) => i.state))]
                  return (
                    <div
                      key={report.id}
                      className="rounded-xl p-3 flex flex-col gap-2 cursor-pointer transition-all"
                      style={{
                        background: isSelected ? accent.bg : 'var(--color-surface-0)',
                        border:     `1.5px solid ${isSelected ? accent.border : 'var(--color-border)'}`,
                      }}
                      onClick={() => {
                        const next = report.id === selectedReportId ? null : report.id
                        setSelectedReportId(next)
                        setRightView('map')
                      }}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleViaId(report.id) }}
                            className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all"
                            style={{
                              background: isViaChecked(report.id) ? 'var(--color-primary)' : 'transparent',
                              border: `1.5px solid ${isViaChecked(report.id) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            }}
                          >
                            {isViaChecked(report.id) && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: accent.bg, color: accent.label, border: `1px solid ${accent.border}` }}
                          >
                            {report.type === 'mensual' ? 'Mensual' : 'Urgente'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            title="Ver informe completo"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDrillView({ type: 'report', reportId: report.id })
                            }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-70"
                            style={{ color: 'var(--color-text-400)' }}
                          >
                            <ChevronRight size={13} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingReportId(report.id)
                              deleteReport.mutate(report.id, {
                                onSuccess: () => {
                                  if (selectedReportId === report.id) setSelectedReportId(null)
                                },
                                onSettled: () => setDeletingReportId(null),
                              })
                            }}
                            disabled={deletingReportId === report.id}
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-70"
                            style={{ color: 'var(--color-error, #ef4444)' }}
                          >
                            {deletingReportId === report.id
                              ? <Loader2 size={11} className="animate-spin" />
                              : <Trash2 size={11} />}
                          </button>
                        </div>
                      </div>

                      {/* Via count + state badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--color-text-500)' }}>
                          {report.items_count ?? report.items?.length ?? 0} via{(report.items_count ?? report.items?.length ?? 0) !== 1 ? 's' : ''}
                        </span>
                        {uniqueStates.map((state) => (
                          <StateBadge key={state} state={state} />
                        ))}
                      </div>

                      {/* GPS points count */}
                      <span className="text-[10px]" style={{ color: 'var(--color-text-400)' }}>
                        {report.map_points?.length ?? 0} pts GPS
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Right: map + list toggle */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              {/* Map/List toggle - only when a report is selected */}
              {selectedReport && (
                <div
                  className="flex items-center gap-1 rounded-xl p-1 w-fit"
                  style={{ background: 'var(--color-surface-2)' }}
                >
                  {(['map', 'list'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setRightView(v)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: rightView === v ? 'var(--color-surface-0)' : 'transparent',
                        color:      rightView === v ? 'var(--color-text-900)' : 'var(--color-text-400)',
                      }}
                    >
                      {v === 'map' ? <Map size={12} /> : <List size={12} />}
                      {v === 'map' ? 'Mapa' : 'Lista'}
                    </button>
                  ))}
                </div>
              )}

              {/* Map view */}
              {(rightView === 'map' || !selectedReport) && (
                <div className="flex flex-col gap-3">
                  <ViaMap
                    points={allMonthPoints}
                    centerLat={fieldData?.center_lat}
                    centerLng={fieldData?.center_lng}
                    height="420px"
                    highlightedItemIds={highlightedItemIds}
                  />
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(VIA_STATE_COLORS).map(([state, color]) => (
                      <div key={state} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
                        <span className="text-xs" style={{ color: 'var(--color-text-600)' }}>
                          {VIA_STATE_LABELS[state as ViaState]}
                        </span>
                      </div>
                    ))}
                  </div>
                  {allMonthPoints.length === 0 && (
                    <p className="text-xs text-center" style={{ color: 'var(--color-text-400)' }}>
                      Sin puntos GPS para {MONTHS[filterMonth - 1]} {filterYear}
                    </p>
                  )}
                  {selectedReport && allMonthPoints.length > 0 && (
                    <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                      Puntos resaltados: informe {selectedReport.type === 'mensual' ? 'mensual' : 'urgente'} seleccionado.
                    </p>
                  )}
                </div>
              )}

              {/* List view (selected report items) */}
              {rightView === 'list' && selectedReport && (
                <div className="flex flex-col gap-2">
                  {selectedReport.general_observations && (
                    <div
                      className="rounded-xl p-3"
                      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
                    >
                      <p className="text-xs" style={{ color: 'var(--color-text-700)' }}>
                        {selectedReport.general_observations}
                      </p>
                    </div>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-400)' }}>
                    Vias documentadas ({selectedReport.items?.length ?? 0})
                  </p>
                  {(selectedReport.items ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl p-3 flex items-center gap-3"
                      style={{
                        background: 'var(--color-surface-0)',
                        border:     `1px solid ${VIA_STATE_COLORS[item.state] ?? 'var(--color-border)'}40`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                          {item.via_name}
                        </p>
                        {item.observations && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-400)' }}>
                            {item.observations}
                          </p>
                        )}
                      </div>
                      <StateBadge state={item.state} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

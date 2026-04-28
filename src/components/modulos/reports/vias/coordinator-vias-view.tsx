'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { MapPin, Loader2, ChevronRight, Map, FileText, ChevronLeft } from 'lucide-react'
import { useFields } from '@/src/hooks/reports/use-fields'
import { useViaLogs } from '@/src/hooks/vias/use-via-logs'
import { useViaReports } from '@/src/hooks/vias/use-via-reports'
import { ViaReportDetail } from './via-report-detail'
import { MONTHS, VIA_STATE_COLORS, VIA_STATE_LABELS } from '@/src/types/vias.types'
import type { ViaState } from '@/src/types/vias.types'

const ViaMap = dynamic(
  () => import('./via-map').then((m) => m.ViaMap),
  { ssr: false, loading: () => (
    <div
      className="flex items-center justify-center rounded-xl"
      style={{ height: 400, background: 'var(--color-surface-1)' }}
    >
      <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
    </div>
  )},
)

const CONTRACT_FIELD_ID = '5f96a67e-b392-4c77-95ae-5d80f5c0f05c'
const NOW = new Date()

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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
    >
      <span className="text-2xl font-bold font-display" style={{ color: 'var(--color-text-900)' }}>{value}</span>
      <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{label}</span>
    </div>
  )
}

export function CoordinatorViasView() {
  const [fieldId,   setFieldId]   = useState('')
  const [month,     setMonth]     = useState(NOW.getMonth() + 1)
  const [year,      setYear]      = useState(NOW.getFullYear())
  const [reportId,  setReportId]  = useState<string | null>(null)

  const { data: fieldsData, isLoading: loadingFields } = useFields()
  const fields = (fieldsData?.data ?? []).filter((f) => f.id !== CONTRACT_FIELD_ID)
  const selectedField = fields.find((f) => f.id === fieldId)

  const { data: logsData,    isLoading: loadingLogs    } = useViaLogs(
    fieldId ? { field_id: fieldId, year, month } : undefined,
  )
  const { data: reportsData, isLoading: loadingReports } = useViaReports(
    fieldId ? { field_id: fieldId, year, month } : undefined,
  )

  const logs    = logsData?.data    ?? []
  const reports = reportsData?.data ?? []

  // Collect all map_points from all reports for this month
  const allMapPoints = reports.flatMap((r) => r.map_points ?? [])

  if (reportId) {
    return (
      <ViaReportDetail
        reportId={reportId}
        onBack={() => setReportId(null)}
      />
    )
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else              setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else               setMonth((m) => m + 1)
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
            onChange={(e) => { setFieldId(e.target.value) }}
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

        {/* Month navigator */}
        {fieldId && (
          <div
            className="flex items-center gap-1 rounded-xl p-1"
            style={{ background: 'var(--color-surface-2)' }}
          >
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-600)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span
              className="px-3 py-1.5 rounded-lg text-sm font-semibold min-w-36 text-center"
              style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
            >
              {MONTHS[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-600)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {!fieldId && (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <Map size={30} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
            Selecciona una planta para ver el mapa de vias
          </p>
        </div>
      )}

      {fieldId && (loadingLogs || loadingReports) && (
        <div className="flex justify-center py-12">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      )}

      {fieldId && !loadingLogs && !loadingReports && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Registros del mes" value={logs.length} />
            <StatCard label="Informes del mes"  value={reports.length} />
            <StatCard label="Puntos en mapa"    value={allMapPoints.length} />
          </div>

          {/* Map with all GPS points for the month */}
          {allMapPoints.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-400)' }}>
                Mapa de vias - {MONTHS[month - 1]} {year}
              </h4>
              <ViaMap
                points={allMapPoints}
                centerLat={selectedField?.center_lat}
                centerLng={selectedField?.center_lng}
                height="480px"
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
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-14 rounded-xl"
              style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
            >
              <Map size={26} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
                No hay puntos en el mapa para {MONTHS[month - 1]} {year}.
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
                Los informes con capturas GPS aparecen aqui.
              </p>
            </div>
          )}

          {/* Reports list */}
          {reports.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-400)' }}>
                Informes del mes
              </h4>
              {reports.map((report) => {
                const stateCounts = (report.items ?? []).reduce<Record<string, number>>((acc, item) => {
                  acc[item.state] = (acc[item.state] ?? 0) + 1
                  return acc
                }, {})
                return (
                  <button
                    key={report.id}
                    onClick={() => setReportId(report.id)}
                    className="flex items-center gap-3 p-3 rounded-xl text-left hover:opacity-90 transition-opacity"
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
                        {report.type === 'mensual' ? 'Informe Mensual' : 'Informe Urgente'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {Object.keys(stateCounts).map((state) => (
                          <StateBadge key={state} state={state as ViaState} />
                        ))}
                        <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                          {report.items?.length ?? 0} via{(report.items?.length ?? 0) !== 1 ? 's' : ''}
                          &nbsp;&middot;&nbsp;{report.map_points?.length ?? 0} pts GPS
                        </span>
                      </div>
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

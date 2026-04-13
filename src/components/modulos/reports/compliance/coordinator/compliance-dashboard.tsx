'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, X, BarChart3 } from 'lucide-react'
import { useDeliverablesSummary, useMonthDetail } from '@/src/hooks/compliance/use-deliverables'
import { ScoreCell } from '../shared/score-cell'
import { StatusBadge } from '../shared/status-badge'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import type { ComplianceSummaryRow } from '@/src/types/compliance.types'

const MONTHS = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic',
]

const MONTHS_FULL = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const FORMAT_LABELS: Record<string, string> = {
  taxi:          'Taxi',
  pernoctacion:  'Pernoctacion',
  disponibilidad:'Disponibilidad',
  horas_extra:   'Horas Extra',
  schedule_6x6:  'Horario 6x6',
  schedule_5x2:  'Horario 5x2',
}

interface DrillTarget { fieldId: string; fieldName: string; mes: number; anio: number }

export function ComplianceDashboard() {
  const [anio,  setAnio]  = useState(new Date().getFullYear())
  const [drill, setDrill] = useState<DrillTarget | null>(null)

  const { data: summary, isLoading } = useDeliverablesSummary({ anio })

  // Build lookup: fieldId -> { mes -> row }
  const byField: Record<string, { name: string; months: Record<number, ComplianceSummaryRow> }> = {}
  for (const row of summary ?? []) {
    if (!byField[row.field_id]) {
      byField[row.field_id] = { name: row.field_name, months: {} }
    }
    byField[row.field_id].months[Number(row.mes)] = row
  }

  const fieldIds = Object.keys(byField)

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h4 className="font-display font-semibold text-sm"
              style={{ color: 'var(--color-text-900)' }}>
            Dashboard de Cumplimiento
          </h4>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
            Score mensual por planta
          </p>
        </div>

        {/* Year selector */}
        <div
          className="flex items-center gap-1 rounded-lg p-1"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <button
            onClick={() => setAnio((y) => y - 1)}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-600)' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span
            className="px-4 py-1 rounded-md text-xs font-semibold w-16 text-center"
            style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
          >
            {anio}
          </span>
          <button
            onClick={() => setAnio((y) => y + 1)}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-600)' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
        </div>
      ) : fieldIds.length === 0 ? (
        <div
          className="flex flex-col items-center py-12 rounded-xl"
          style={{ background: 'var(--color-surface-1)', border: '1px dashed var(--color-border)' }}
        >
          <BarChart3 size={24} className="mb-2" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>
            Sin datos de cumplimiento para {anio}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-sm" style={{ minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th
                  className="text-left px-4 py-2.5 text-xs font-medium sticky left-0"
                  style={{
                    color: 'var(--color-text-400)',
                    background: 'var(--color-surface-0)',
                    minWidth: 140,
                  }}
                >
                  Planta
                </th>
                {MONTHS.map((m) => (
                  <th
                    key={m}
                    className="text-center px-2 py-2.5 text-xs font-medium"
                    style={{ color: 'var(--color-text-400)', minWidth: 56 }}
                  >
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fieldIds.map((fid) => {
                const field = byField[fid]
                return (
                  <tr
                    key={fid}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td
                      className="px-4 py-3 text-xs font-medium sticky left-0"
                      style={{
                        color: 'var(--color-text-900)',
                        background: 'var(--color-surface-0)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {field.name}
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const row = field.months[m]
                      return (
                        <td key={m} className="px-1 py-2 text-center">
                          {row ? (
                            <button
                              onClick={() =>
                                setDrill({ fieldId: fid, fieldName: field.name, mes: m, anio })
                              }
                              className="hover:opacity-75 transition-opacity"
                            >
                              <ScoreCell score={row.score} />
                            </button>
                          ) : (
                            <span
                              className="text-xs"
                              style={{ color: 'var(--color-border)' }}
                            >
                              -
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {drill && (
        <MonthDetailModal
          fieldId={drill.fieldId}
          fieldName={drill.fieldName}
          mes={drill.mes}
          anio={drill.anio}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  )
}

// ── Month detail modal ────────────────────────────────────────────────────────
interface MonthDetailModalProps {
  fieldId: string
  fieldName: string
  mes: number
  anio: number
  onClose: () => void
}

function MonthDetailModal({ fieldId, fieldName, mes, anio, onClose }: MonthDetailModalProps) {
  const { data: detail, isLoading } = useMonthDetail(fieldId, anio, mes)

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl overflow-hidden"
        style={{
          background: 'var(--color-surface-0)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 24px 64px rgba(4,24,24,0.3)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h3 className="font-display font-semibold text-base"
                style={{ color: 'var(--color-text-900)' }}>
              {fieldName}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {MONTHS_FULL[mes - 1]} {anio}
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

        {/* Content */}
        <div className="p-6 flex flex-col gap-5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
            </div>
          ) : !detail ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-400)' }}>
              Sin datos para este mes
            </p>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Score',      value: <ScoreCell score={detail.score} size="md" /> },
                  { label: 'A tiempo',   value: <span className="text-sm font-bold" style={{ color: '#15803d' }}>{detail.on_time}</span> },
                  { label: 'Tarde',      value: <span className="text-sm font-bold" style={{ color: '#c2410c' }}>{detail.tarde}</span> },
                  { label: 'Pendientes', value: <span className="text-sm font-bold" style={{ color: '#b45309' }}>{detail.pendiente}</span> },
                  { label: 'No aplica',  value: <span className="text-sm font-bold" style={{ color: 'var(--color-text-400)' }}>{detail.no_aplica}</span> },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="p-3 rounded-lg flex flex-col gap-1"
                    style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
                  >
                    <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{label}</p>
                    {value}
                  </div>
                ))}
              </div>

              {/* Deliverables table */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                      <th className="text-left px-4 py-2.5 text-xs font-medium"
                          style={{ color: 'var(--color-text-400)' }}>Formato</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium"
                          style={{ color: 'var(--color-text-400)' }}>Estado</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium"
                          style={{ color: 'var(--color-text-400)' }}>Vencimiento</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium"
                          style={{ color: 'var(--color-text-400)' }}>Entregado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.deliverables.map((d) => (
                      <tr
                        key={d.id}
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                      >
                        <td className="px-4 py-3 text-xs font-medium"
                            style={{ color: 'var(--color-text-900)' }}>
                          {FORMAT_LABELS[d.format_type] ?? d.format_type}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-4 py-3 text-xs"
                            style={{ color: 'var(--color-text-400)' }}>
                          {d.due_date
                            ? new Date(d.due_date + 'T00:00:00').toLocaleDateString('es-CO', {
                                day: '2-digit', month: 'short',
                              })
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs"
                            style={{ color: 'var(--color-text-400)' }}>
                          {d.submitted_at
                            ? new Date(d.submitted_at).toLocaleDateString('es-CO', {
                                day: '2-digit', month: 'short',
                              })
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Waive reasons */}
              {detail.deliverables.some((d) => d.waive_reason) && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>
                    Motivos de no aplica
                  </p>
                  {detail.deliverables
                    .filter((d) => d.waive_reason)
                    .map((d) => (
                      <div
                        key={d.id}
                        className="px-3 py-2 rounded-lg text-xs"
                        style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
                      >
                        <span className="font-medium" style={{ color: 'var(--color-text-600)' }}>
                          {FORMAT_LABELS[d.format_type]}:{' '}
                        </span>
                        <span style={{ color: 'var(--color-text-400)' }}>{d.waive_reason}</span>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

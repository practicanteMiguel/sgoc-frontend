'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, PackageOpen, CalendarPlus, Eye } from 'lucide-react'
import { useMonthDetail, useGenerateMonth, useMarkViewed } from '@/src/hooks/compliance/use-deliverables'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { StatusBadge } from '../shared/status-badge'
import { ScoreCell } from '../shared/score-cell'
import { TaxiForm } from '../supervisor/formats/taxi-form'
import { PernoctacionForm } from '../supervisor/formats/pernoctacion-form'
import { DisponibilidadForm } from '../supervisor/formats/disponibilidad-form'
import { HorasExtraForm } from '../supervisor/formats/horas-extra-form'
import { ScheduleGrid } from '../supervisor/formats/schedule-grid'
import type { Field } from '@/src/types/reports.types'
import type { Deliverable } from '@/src/types/compliance.types'

const MONTHS = [
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

const NOW = new Date()

interface Props {
  field: Field
  canManage: boolean
}

export function FieldCompliancePanel({ field, canManage }: Props) {
  const [mes,  setMes]  = useState(NOW.getMonth() + 1)
  const [anio, setAnio] = useState(NOW.getFullYear())
  const [viewing, setViewing] = useState<Deliverable | null>(null)

  const { data: detail, isLoading } = useMonthDetail(field.id, anio, mes)
  const generate    = useGenerateMonth()
  const markViewed  = useMarkViewed()

  function prevMonth() {
    if (mes === 1) { setMes(12); setAnio((y) => y - 1) }
    else            setMes((m) => m - 1)
  }

  function nextMonth() {
    if (mes === 12) { setMes(1); setAnio((y) => y + 1) }
    else             setMes((m) => m + 1)
  }

  function renderForm(d: Deliverable) {
    switch (d.format_type) {
      case 'taxi':          return <TaxiForm           deliverable={d} readOnly onClose={() => setViewing(null)} />
      case 'pernoctacion':  return <PernoctacionForm   deliverable={d} readOnly onClose={() => setViewing(null)} />
      case 'disponibilidad':return <DisponibilidadForm deliverable={d} readOnly onClose={() => setViewing(null)} />
      case 'horas_extra':   return <HorasExtraForm     deliverable={d} readOnly onClose={() => setViewing(null)} />
      case 'schedule_6x6':
      case 'schedule_5x2':  return <ScheduleGrid       deliverable={d} readOnly onClose={() => setViewing(null)} />
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h4 className="font-display font-semibold text-sm"
              style={{ color: 'var(--color-text-900)' }}>
            Cumplimiento
          </h4>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
            Entregables del supervisor
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-1 rounded-lg p-1"
            style={{ background: 'var(--color-surface-2)' }}
          >
            <button
              onClick={prevMonth}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-600)' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span
              className="px-3 py-1 rounded-md text-xs font-semibold min-w-32.5 text-center"
              style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
            >
              {MONTHS[mes - 1]} {anio}
            </span>
            <button
              onClick={nextMonth}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-600)' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {canManage && (
            <button
              onClick={() => {
                // due_date = day 5 of the following month
                const nextMes  = mes === 12 ? 1  : mes + 1
                const nextAnio = mes === 12 ? anio + 1 : anio
                const due_date = `${nextAnio}-${String(nextMes).padStart(2, '0')}-05`
                generate.mutate({ field_id: field.id, mes, anio, due_date })
              }}
              disabled={generate.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
              style={{
                background: 'var(--color-secondary)',
                color: '#fff',
                opacity: generate.isPending ? 0.7 : 1,
              }}
            >
              {generate.isPending
                ? <Loader2 size={13} className="animate-spin" />
                : <CalendarPlus size={13} />}
              Generar mes
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
        </div>
      ) : !detail || detail.deliverables.length === 0 ? (
        <div
          className="flex flex-col items-center py-10 rounded-xl"
          style={{ background: 'var(--color-surface-1)', border: '1px dashed var(--color-border)' }}
        >
          <PackageOpen size={24} className="mb-2" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>
            Sin entregables para este mes
          </p>
          {canManage && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              Usa "Generar mes" para crearlos
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
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
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3 text-xs font-medium"
                        style={{ color: 'var(--color-text-900)' }}>
                      {FORMAT_LABELS[d.format_type] ?? d.format_type}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-400)' }}>
                      {d.due_date
                        ? new Date(d.due_date + 'T00:00:00').toLocaleDateString('es-CO', {
                            day: '2-digit', month: 'short',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                          {d.submitted_at
                            ? new Date(d.submitted_at).toLocaleDateString('es-CO', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                              })
                            : '-'}
                        </span>
                        {d.status !== 'no_aplica' && (
                          <button
                            onClick={() => { setViewing(d); markViewed.mutate(d.id) }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-opacity"
                            style={{
                              background: 'var(--color-surface-2)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-600)',
                            }}
                          >
                            <Eye size={11} /> Ver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* View modal */}
      {viewing && (
        <ModalPortal onClose={() => setViewing(null)}>
          <div
            className={`w-full rounded-xl overflow-hidden ${viewing.format_type.startsWith('schedule_') ? '' : 'max-w-6xl'}`}
            style={{
              background: 'var(--color-surface-0)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 24px 64px rgba(4,24,24,0.3)',
              maxHeight: '95vh',
              overflowY: 'auto',
              ...(viewing.format_type.startsWith('schedule_') ? { maxWidth: 'calc(100vw - 32px)' } : {}),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div>
                <h3 className="font-display font-semibold text-base"
                    style={{ color: 'var(--color-text-900)' }}>
                  Ver datos - {FORMAT_LABELS[viewing.format_type] ?? viewing.format_type}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                  {viewing.field.name} - {MONTHS[viewing.mes - 1]} {viewing.anio}
                  {viewing.supervisor && (
                    <> &middot; {viewing.supervisor.first_name} {viewing.supervisor.last_name}</>
                  )}
                </p>
              </div>
              <StatusBadge status={viewing.status} />
            </div>
            <div className="p-6">{renderForm(viewing)}</div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

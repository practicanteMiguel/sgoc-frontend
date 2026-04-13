'use client'

import { useState } from 'react'
import {
  Car, Bed, Clock, CalendarRange, Grid3x3, Loader2,
  ChevronRight, RotateCcw, Ban, Eye,
} from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { StatusBadge } from '../shared/status-badge'
import { TaxiForm } from './formats/taxi-form'
import { PernoctacionForm } from './formats/pernoctacion-form'
import { DisponibilidadForm } from './formats/disponibilidad-form'
import { HorasExtraForm } from './formats/horas-extra-form'
import { ScheduleGrid } from './formats/schedule-grid'
import {
  useWaiveDeliverable,
  useUnwaiveDeliverable,
} from '@/src/hooks/compliance/use-deliverables'
import type { Deliverable, FormatType } from '@/src/types/compliance.types'

const FORMAT_META: Record<
  FormatType,
  { label: string; icon: React.ReactNode; description: string }
> = {
  taxi:          { label: 'Taxi',          icon: <Car size={18} />,         description: 'Registro de trayectos en taxi' },
  pernoctacion:  { label: 'Pernoctacion',  icon: <Bed size={18} />,         description: 'Dias de pernoctacion' },
  horas_extra:   { label: 'Horas Extra',   icon: <Clock size={18} />,       description: 'Registro de horas extras' },
  disponibilidad:{ label: 'Disponibilidad',icon: <CalendarRange size={18} />,description: 'Disponibilidad del personal' },
  schedule_6x6:  { label: 'Horario 6x6',  icon: <Grid3x3 size={18} />,     description: 'Grilla de turnos 6x6' },
  schedule_5x2:  { label: 'Horario 5x2',  icon: <Grid3x3 size={18} />,     description: 'Grilla de turnos 5x2' },
}

interface Props {
  deliverable: Deliverable
}

export function DeliverableCard({ deliverable }: Props) {
  const [openForm,    setOpenForm]    = useState(false)
  const [waiveOpen,   setWaiveOpen]   = useState(false)
  const [waiveReason, setWaiveReason] = useState('')

  const waive   = useWaiveDeliverable()
  const unwaive = useUnwaiveDeliverable()

  const meta      = FORMAT_META[deliverable.format_type]
  const isSchedule= deliverable.format_type.startsWith('schedule_')
  const readOnly  = deliverable.status !== 'pendiente'

  function renderForm() {
    switch (deliverable.format_type) {
      case 'taxi':          return <TaxiForm           deliverable={deliverable} readOnly={readOnly && deliverable.status !== 'pendiente'} onClose={() => setOpenForm(false)} />
      case 'pernoctacion':  return <PernoctacionForm   deliverable={deliverable} readOnly={readOnly && deliverable.status !== 'pendiente'} onClose={() => setOpenForm(false)} />
      case 'disponibilidad':return <DisponibilidadForm deliverable={deliverable} readOnly={readOnly && deliverable.status !== 'pendiente'} onClose={() => setOpenForm(false)} />
      case 'horas_extra':   return <HorasExtraForm     deliverable={deliverable} readOnly={readOnly && deliverable.status !== 'pendiente'} onClose={() => setOpenForm(false)} />
      case 'schedule_6x6':
      case 'schedule_5x2':  return <ScheduleGrid       deliverable={deliverable} onClose={() => setOpenForm(false)} />
    }
  }

  const modalTitle =
    deliverable.status === 'pendiente'
      ? `Cargar datos - ${meta.label}`
      : `Ver datos - ${meta.label}`

  return (
    <>
      <div
        className="p-4 rounded-xl flex flex-col gap-3"
        style={{
          background: 'var(--color-surface-0)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
            >
              {meta.icon}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                {meta.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                {meta.description}
              </p>
            </div>
          </div>
          <StatusBadge status={deliverable.status} />
        </div>

        {/* Due date */}
        {deliverable.due_date && (
          <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
            Vence:{' '}
            <span style={{ color: 'var(--color-text-600)' }}>
              {new Date(deliverable.due_date + 'T00:00:00').toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
          </p>
        )}

        {/* Visto por el coordinador */}
        {deliverable.last_viewed_by && deliverable.last_viewed_at && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-400)' }}>
            <Eye size={11} />
            <span>
              Visto por{' '}
              <span style={{ color: 'var(--color-text-600)', fontWeight: 500 }}>
                {deliverable.last_viewed_by.first_name} {deliverable.last_viewed_by.last_name}
              </span>
              {' - '}
              {new Date(deliverable.last_viewed_at).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* No aplica info */}
        {deliverable.status === 'no_aplica' && deliverable.waive_reason && (
          <div
            className="px-3 py-2 rounded-lg text-xs"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}
          >
            Motivo: {deliverable.waive_reason}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
          {deliverable.status !== 'no_aplica' && (
            <button
              onClick={() => setOpenForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{
                background: 'var(--color-secondary)',
                color: '#fff',
              }}
            >
              {deliverable.status === 'pendiente' ? 'Cargar datos' : 'Ver datos'}
              <ChevronRight size={13} />
            </button>
          )}

          {deliverable.status === 'pendiente' && !isSchedule && (
            <button
              onClick={() => setWaiveOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-600)',
              }}
            >
              <Ban size={13} /> No aplica
            </button>
          )}

          {deliverable.status === 'no_aplica' && (
            <button
              onClick={() => unwaive.mutate(deliverable.id)}
              disabled={unwaive.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-600)',
              }}
            >
              {unwaive.isPending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              Revertir
            </button>
          )}
        </div>
      </div>

      {/* Format modal */}
      {openForm && (
        <ModalPortal onClose={() => setOpenForm(false)}>
          <div
            className={`w-full rounded-xl overflow-hidden ${isSchedule ? '' : 'max-w-6xl'}`}
            style={{
              background: 'var(--color-surface-0)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 24px 64px rgba(4,24,24,0.3)',
              maxHeight: '95vh',
              overflowY: 'auto',
              ...(isSchedule ? { maxWidth: 'calc(100vw - 32px)' } : {}),
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
                  {modalTitle}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                  {deliverable.field.name} - {MONTHS[deliverable.mes - 1]} {deliverable.anio}
                </p>
              </div>
              <StatusBadge status={deliverable.status} />
            </div>
            <div className="p-6">{renderForm()}</div>
          </div>
        </ModalPortal>
      )}

      {/* Waive modal */}
      {waiveOpen && (
        <ModalPortal onClose={() => setWaiveOpen(false)}>
          <div
            className="w-full max-w-sm rounded-xl overflow-hidden"
            style={{
              background: 'var(--color-surface-0)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 24px 64px rgba(4,24,24,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 flex flex-col gap-3">
              <h3 className="font-display font-semibold text-base"
                  style={{ color: 'var(--color-text-900)' }}>
                Marcar como no aplica
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
                Indica el motivo por el cual este formato no aplica para este mes.
              </p>
              <textarea
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                placeholder="Motivo (minimo 10 caracteres)"
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{
                  background: 'var(--color-surface-1)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-900)',
                }}
              />
            </div>
            <div className="flex gap-3 px-6 py-4"
                 style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setWaiveOpen(false)}
                className="flex-1 py-2.5 rounded-lg text-sm"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-600)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (waiveReason.length < 10) return
                  waive.mutate(
                    { id: deliverable.id, reason: waiveReason },
                    { onSuccess: () => { setWaiveOpen(false); setWaiveReason('') } },
                  )
                }}
                disabled={waive.isPending || waiveReason.length < 10}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                style={{
                  background: 'var(--color-primary)',
                  color: '#fff',
                  opacity: waive.isPending || waiveReason.length < 10 ? 0.6 : 1,
                }}
              >
                {waive.isPending && <Loader2 size={14} className="animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  )
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

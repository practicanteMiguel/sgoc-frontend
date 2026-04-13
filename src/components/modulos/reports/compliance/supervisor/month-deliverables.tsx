'use client'

import { useEffect, useState } from 'react'
import { Loader2, PackageOpen, Clock, CheckCircle2, AlertCircle, Circle } from 'lucide-react'
import { useDeliverables } from '@/src/hooks/compliance/use-deliverables'
import { DeliverableCard } from './deliverable-card'
import type { Deliverable } from '@/src/types/compliance.types'

interface TimeLeft {
  expired: boolean
  days: number
  hours: number
  minutes: number
}

function calcTimeLeft(dueDate: string | null): TimeLeft | null {
  if (!dueDate) return null
  const diff = new Date(dueDate + 'T23:59:59').getTime() - Date.now()
  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0 }
  const days    = Math.floor(diff / 86400000)
  const hours   = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return { expired: false, days, hours, minutes }
}

function useCountdown(dueDate: string | null) {
  const [t, setT] = useState<TimeLeft | null>(() => calcTimeLeft(dueDate))
  useEffect(() => {
    setT(calcTimeLeft(dueDate))
    const id = setInterval(() => setT(calcTimeLeft(dueDate)), 60000)
    return () => clearInterval(id)
  }, [dueDate])
  return t
}

function countdownColor(t: TimeLeft | null): string {
  if (!t || t.expired) return '#dc2626'
  if (t.days >= 5) return '#16a34a'
  if (t.days >= 2) return '#d97706'
  return '#dc2626'
}

function SummaryCards({ deliverables }: { deliverables: Deliverable[] }) {
  const total      = deliverables.length
  const entregados = deliverables.filter((d) => d.status === 'entregado' || d.status === 'entregado_tarde').length
  const pendientes = deliverables.filter((d) => d.status === 'pendiente').length
  const noAplica   = deliverables.filter((d) => d.status === 'no_aplica').length
  const tarde      = deliverables.filter((d) => d.status === 'entregado_tarde').length

  const dueDate = deliverables.find((d) => d.due_date)?.due_date ?? null
  const timeLeft = useCountdown(dueDate)
  const color    = countdownColor(timeLeft)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {/* Countdown */}
      <div
        className="col-span-2 sm:col-span-3 lg:col-span-2 p-4 rounded-xl flex items-center gap-4"
        style={{ background: 'var(--color-surface-0)', border: `1px solid ${color}40` }}
      >
        <Clock size={28} style={{ color, flexShrink: 0 }} />
        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-text-400)' }}>
            {dueDate
              ? `Vence el ${new Date(dueDate + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long' })}`
              : 'Sin fecha limite'}
          </p>
          {timeLeft && !timeLeft.expired ? (
            <p className="text-lg font-bold leading-tight" style={{ color }}>
              {timeLeft.days > 0 && <span>{timeLeft.days}d </span>}
              {timeLeft.hours}h {timeLeft.minutes}m
            </p>
          ) : (
            <p className="text-lg font-bold" style={{ color }}>
              {timeLeft?.expired ? 'Vencido' : 'Sin plazo'}
            </p>
          )}
        </div>
      </div>

      {/* Entregados */}
      <div
        className="p-4 rounded-xl flex items-center gap-3"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
      >
        <CheckCircle2 size={22} style={{ color: '#16a34a', flexShrink: 0 }} />
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Entregados</p>
          <p className="text-xl font-bold" style={{ color: '#16a34a' }}>
            {entregados}
            <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-400)' }}>
              / {total - noAplica}
            </span>
          </p>
          {tarde > 0 && (
            <p className="text-xs" style={{ color: '#d97706' }}>{tarde} tarde</p>
          )}
        </div>
      </div>

      {/* Pendientes */}
      <div
        className="p-4 rounded-xl flex items-center gap-3"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
      >
        <AlertCircle size={22} style={{ color: '#d97706', flexShrink: 0 }} />
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Pendientes</p>
          <p className="text-xl font-bold" style={{ color: pendientes > 0 ? '#d97706' : 'var(--color-text-400)' }}>
            {pendientes}
          </p>
        </div>
      </div>

      {/* No aplica */}
      <div
        className="p-4 rounded-xl flex items-center gap-3"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
      >
        <Circle size={22} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>No aplica</p>
          <p className="text-xl font-bold" style={{ color: 'var(--color-text-400)' }}>
            {noAplica}
          </p>
        </div>
      </div>
    </div>
  )
}

interface Props {
  fieldId: string
  mes: number
  anio: number
}

export function MonthDeliverables({ fieldId, mes, anio }: Props) {
  const { data: deliverables, isLoading } = useDeliverables({ field_id: fieldId, mes, anio })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
      </div>
    )
  }

  if (!deliverables || deliverables.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 rounded-xl"
        style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
      >
        <PackageOpen size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
          No hay entregables para este mes
        </p>
        <p className="text-xs mt-1 text-center max-w-xs" style={{ color: 'var(--color-text-400)' }}>
          El encargado aun no ha generado los entregables para este periodo.
        </p>
      </div>
    )
  }

  const ORDER  = ['taxi', 'pernoctacion', 'disponibilidad', 'horas_extra', 'schedule_6x6', 'schedule_5x2']
  const sorted = [...deliverables].sort(
    (a, b) => ORDER.indexOf(a.format_type) - ORDER.indexOf(b.format_type),
  )

  return (
    <>
      <SummaryCards deliverables={sorted} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
        {sorted.map((d) => (
          <DeliverableCard key={d.id} deliverable={d} />
        ))}
      </div>
    </>
  )
}

'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { useAuthStore } from '@/src/stores/auth.store'
import { useField } from '@/src/hooks/reports/use-fields'
import { MonthDeliverables } from './month-deliverables'

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const NOW = new Date()

export function SupervisorComplianceView() {
  const { user }  = useAuthStore()
  const fieldId   = user?.field_id ?? null

  const { data: field } = useField(fieldId)

  const [mes,  setMes]  = useState(NOW.getMonth() + 1) // 1-12
  const [anio, setAnio] = useState(NOW.getFullYear())

  function prevMonth() {
    if (mes === 1) { setMes(12); setAnio((y) => y - 1) }
    else            setMes((m) => m - 1)
  }

  function nextMonth() {
    if (mes === 12) { setMes(1); setAnio((y) => y + 1) }
    else             setMes((m) => m + 1)
  }

  return (
    <div className="max-w-8xl p-6 sm:p-10 mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2
            className="font-display text-xl font-semibold"
            style={{ color: 'var(--color-secundary)' }}
          >
            Cumplimiento mensual
          </h2>
          {field && (
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin size={13} style={{ color: 'var(--color-text-400)' }} />
              <span className="text-sm" style={{ color: 'var(--color-text-400)' }}>
                {field.name} - {field.location}
              </span>
            </div>
          )}
        </div>

        {/* Month navigator */}
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
            className="px-4 py-1.5 rounded-lg text-sm font-semibold min-w-[160px] text-center"
            style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
          >
            {MONTHS[mes - 1]} {anio}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-600)' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Deliverables */}
      {fieldId ? (
        <MonthDeliverables fieldId={fieldId} mes={mes} anio={anio} />
      ) : (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <MapPin size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
            Sin planta asignada
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
            Contacta al administrador para que te asigne una planta.
          </p>
        </div>
      )}
    </div>
  )
}

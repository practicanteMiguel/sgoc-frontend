'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Loader2, Save, Lock, Wand2, History, BarChart2 } from 'lucide-react'
import {
  useSchedules,
  useSchedule,
  useCreateSchedule,
  useUpdateScheduleDays,
  useCloseSchedule,
} from '@/src/hooks/compliance/use-schedules'
import { useSubmitDeliverable } from '@/src/hooks/compliance/use-deliverables'
import { useEmployees } from '@/src/hooks/reports/use-employees'
import type { Deliverable, ScheduleTipo, Turno } from '@/src/types/compliance.types'
import {
  TURNO_COLORS, TURNO_LABELS, ALL_TURNOS, MONTH_NAMES,
  daysInMonth, padDate, getColombianHolidays, getWeekGroups,
  defaultTurno, build6x6Grid,
} from '@/src/lib/utils'
import { ScheduleTable } from './schedule-table'
import { HoursTable } from './hours-table'
import { OvertimeTable } from './overtime-table'

interface Props {
  deliverable: Deliverable
  readOnly?: boolean
  onClose: () => void
}

export function ScheduleGrid({ deliverable, readOnly = false, onClose }: Props) {
  const tipo: ScheduleTipo =
    deliverable.format_type === 'schedule_6x6' ? '6x6' : '5x2'

  const { data: schedulesList, isLoading: listLoading } = useSchedules({
    field_id: deliverable.field.id,
    mes:      deliverable.mes,
    anio:     deliverable.anio,
    tipo,
  })

  const existingId = schedulesList?.[0]?.id ?? null
  const isClosed   = schedulesList?.[0]?.estado === 'cerrado'

  const { data: scheduleDetail, isLoading: detailLoading } = useSchedule(existingId)
  const { data: empData, isLoading: empLoading }           = useEmployees({ field_id: deliverable.field.id })
  const fieldEmployees = (empData?.data ?? []).filter((e) => e.schedules.includes(tipo)).reverse()

  const prevMes  = deliverable.mes === 1 ? 12 : deliverable.mes - 1
  const prevAnio = deliverable.mes === 1 ? deliverable.anio - 1 : deliverable.anio
  const { data: prevScheduleList } = useSchedules(
    tipo === '6x6' ? { field_id: deliverable.field.id, mes: prevMes, anio: prevAnio, tipo: '6x6' } : {},
  )
  const prevScheduleId = prevScheduleList?.[0]?.id ?? null
  const { data: prevScheduleDetail } = useSchedule(tipo === '6x6' ? prevScheduleId : null)

  const [grid, setGrid]           = useState<Record<string, Record<string, Turno>>>({})
  const [showPrev, setShowPrev]   = useState(false)
  const [showHours, setShowHours] = useState(false)
  const [fillPending, setFillPending] = useState<string | null>(null)
  const fillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const create     = useCreateSchedule()
  const updateDays = useUpdateScheduleDays()
  const close      = useCloseSchedule()
  const submitDel  = useSubmitDeliverable()

  useEffect(() => {
    if (!scheduleDetail?.employees) return
    const next: Record<string, Record<string, Turno>> = {}
    for (const emp of scheduleDetail.employees) {
      next[emp.employee.id] = {}
      for (const day of emp.days) next[emp.employee.id][day.fecha] = day.turno
    }
    setGrid(next)
  }, [scheduleDetail])

  const totalDays  = daysInMonth(deliverable.anio, deliverable.mes)
  const dayNums    = Array.from({ length: totalDays }, (_, i) => i + 1)
  const holidays   = useMemo(() => getColombianHolidays(deliverable.anio), [deliverable.anio])
  const weekGroups = useMemo(
    () => getWeekGroups(deliverable.anio, deliverable.mes, totalDays),
    [deliverable.anio, deliverable.mes, totalDays],
  )

  function setCell(empId: string, fecha: string, turno: Turno) {
    setGrid((prev) => ({ ...prev, [empId]: { ...(prev[empId] ?? {}), [fecha]: turno } }))
  }

  function insertAt(empId: string, insertIdx: number) {
    setGrid((prev) => {
      const empGrid = { ...(prev[empId] ?? {}) }
      const fechas  = dayNums.map((d) => padDate(deliverable.anio, deliverable.mes, d))
      for (let i = fechas.length - 1; i > insertIdx; i--) {
        empGrid[fechas[i]] = empGrid[fechas[i - 1]] ?? defaultTurno(tipo, deliverable.anio, deliverable.mes, Number(fechas[i - 1].split('-')[2]))
      }
      empGrid[fechas[insertIdx]] = 'S'
      return { ...prev, [empId]: empGrid }
    })
  }

  function shiftToEnd(empId: string, fecha: string) {
    setGrid((prev) => {
      const empGrid = { ...(prev[empId] ?? {}) }
      const fechas  = dayNums.map((d) => padDate(deliverable.anio, deliverable.mes, d))
      const idx     = fechas.indexOf(fecha)
      if (idx === -1) return prev
      const removed = empGrid[fecha] ?? defaultTurno(tipo, deliverable.anio, deliverable.mes, Number(fecha.split('-')[2]))
      for (let i = idx; i < fechas.length - 1; i++) {
        empGrid[fechas[i]] = empGrid[fechas[i + 1]] ?? defaultTurno(tipo, deliverable.anio, deliverable.mes, Number(fechas[i + 1].split('-')[2]))
      }
      empGrid[fechas[fechas.length - 1]] = removed
      return { ...prev, [empId]: empGrid }
    })
  }

  function fillRowFrom(empId: string, fromDay: number, turno: Turno) {
    setGrid((prev) => {
      const empGrid = { ...(prev[empId] ?? {}) }
      for (const d of dayNums) {
        if (d >= fromDay) empGrid[padDate(deliverable.anio, deliverable.mes, d)] = turno
      }
      return { ...prev, [empId]: empGrid }
    })
  }

  function armFill(empId: string, fecha: string, day: number, turno: Turno) {
    const key = `${empId}||${fecha}`
    if (fillPending === key) {
      if (fillTimerRef.current) clearTimeout(fillTimerRef.current)
      fillTimerRef.current = null
      setFillPending(null)
      fillRowFrom(empId, day, turno)
    } else {
      if (fillTimerRef.current) clearTimeout(fillTimerRef.current)
      setFillPending(key)
      fillTimerRef.current = setTimeout(() => {
        setFillPending(null)
        fillTimerRef.current = null
      }, 2000)
    }
  }

  const handleAutoFill6x6 = useCallback(() => {
    if (fieldEmployees.length === 0) return
    const prevMap: Record<string, Turno[]> = {}
    if (prevScheduleDetail?.employees) {
      for (const e of prevScheduleDetail.employees) {
        prevMap[e.employee.id] = [...e.days]
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
          .map((d) => d.turno)
      }
    }
    setGrid(build6x6Grid(deliverable.anio, deliverable.mes, fieldEmployees, prevMap))
  }, [fieldEmployees, prevScheduleDetail, deliverable.anio, deliverable.mes])

  async function handleSave() {
    if (!existingId || fieldEmployees.length === 0) return
    const days: Array<{ employee_id: string; fecha: string; turno: Turno }> = []
    for (const emp of fieldEmployees) {
      for (const d of dayNums) {
        const fecha = padDate(deliverable.anio, deliverable.mes, d)
        days.push({ employee_id: emp.id, fecha, turno: grid[emp.id]?.[fecha] ?? defaultTurno(tipo, deliverable.anio, deliverable.mes, d) })
      }
    }
    await updateDays.mutateAsync({ id: existingId, days })
  }

  async function handleCloseAndSubmit() {
    if (!existingId) return
    await handleSave()
    await close.mutateAsync(existingId)
    await submitDel.mutateAsync(deliverable.id)
    onClose()
  }

  const busy = create.isPending || updateDays.isPending || close.isPending || submitDel.isPending

  // Build prev month emp map for schedule table
  const prevEmpMap: Record<string, Record<string, Turno>> = {}
  if (prevScheduleDetail?.employees) {
    for (const e of prevScheduleDetail.employees) {
      prevEmpMap[e.employee.id] = {}
      for (const d of e.days) prevEmpMap[e.employee.id][d.fecha] = d.turno
    }
  }

  if (listLoading || detailLoading || empLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
      </div>
    )
  }

  if (!existingId) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
          No existe un horario {tipo} para este mes. Crealo para empezar.
        </p>
        <button
          onClick={() => create.mutateAsync({ field_id: deliverable.field.id, mes: deliverable.mes, anio: deliverable.anio, tipo })}
          disabled={busy}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          Crear horario {tipo}
        </button>
        <button onClick={onClose} className="text-sm" style={{ color: 'var(--color-text-400)' }}>
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {isClosed && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(202,138,4,0.1)', color: '#b45309' }}>
          <Lock size={13} /> Horario cerrado - solo lectura
        </div>
      )}

      {fieldEmployees.length === 0 && (
        <div className="px-4 py-3 rounded-lg text-xs" style={{ background: 'rgba(202,138,4,0.1)', color: '#b45309' }}>
          No hay empleados con horario {tipo} asignado en esta planta. Verifica la configuracion de los empleados.
        </div>
      )}

      {tipo === '6x6' && (
        <div className="flex items-center gap-3 flex-wrap">
          {!isClosed && !readOnly && fieldEmployees.length > 0 && (
            <button
              onClick={handleAutoFill6x6}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-secondary)', color: '#fff' }}
            >
              <Wand2 size={13} />
              Generar patron 6x6
            </button>
          )}
          {prevScheduleId && (
            <button
              onClick={() => setShowPrev((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
            >
              <History size={13} />
              {showPrev ? 'Ocultar mes anterior' : `Ver ${MONTH_NAMES[prevMes - 1]} ${prevAnio}`}
            </button>
          )}
          {fieldEmployees.length > 0 && (
            <button
              onClick={() => setShowHours((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ background: showHours ? 'var(--color-primary)' : 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: showHours ? '#fff' : 'var(--color-text-600)' }}
            >
              <BarChart2 size={13} />
              {showHours ? 'Ocultar horas' : 'Ver horas semanales'}
            </button>
          )}
          {!isClosed && !readOnly && (
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
              {prevScheduleDetail
                ? `Continua desde ${MONTH_NAMES[prevMes - 1]} ${prevAnio}`
                : 'Sin mes anterior - posiciones iniciales por cuadrilla'}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-400)' }}>
        <span className="flex items-center gap-1">
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: 'rgba(239,68,68,0.25)', border: '1px solid #ef4444' }} />
          Festivo
        </span>
        <span className="flex items-center gap-1">
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: 'rgba(99,102,241,0.15)', border: '1px solid #818cf8' }} />
          Domingo
        </span>
      </div>

      <ScheduleTable
        fieldEmployees={fieldEmployees}
        dayNums={dayNums}
        totalDays={totalDays}
        weekGroups={weekGroups}
        holidays={holidays}
        grid={grid}
        tipo={tipo}
        isClosed={isClosed}
        readOnly={readOnly}
        year={deliverable.anio}
        month={deliverable.mes}
        fillPending={fillPending}
        onSetCell={setCell}
        onInsertAt={insertAt}
        onShiftToEnd={shiftToEnd}
        onArmFill={armFill}
        showPrev={showPrev}
        prevYear={prevAnio}
        prevMonth={prevMes}
        prevEmpMap={prevEmpMap}
        prevMonthName={`${MONTH_NAMES[prevMes - 1]} ${prevAnio}`}
      />

      {showHours && tipo === '6x6' && fieldEmployees.length > 0 && (
        <>
          <HoursTable
            fieldEmployees={fieldEmployees}
            weekGroups={weekGroups}
            grid={grid}
            holidays={holidays}
            year={deliverable.anio}
            month={deliverable.mes}
            tipo={tipo}
          />
          <OvertimeTable
            fieldEmployees={fieldEmployees}
            weekGroups={weekGroups}
            grid={grid}
            holidays={holidays}
            year={deliverable.anio}
            month={deliverable.mes}
            tipo={tipo}
          />
        </>
      )}

      {/* Conventions legend */}
      <div className="rounded-lg p-3" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-600)' }}>Convenciones</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
          {ALL_TURNOS.map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: TURNO_COLORS[t].bg, color: TURNO_COLORS[t].color, borderRadius: 4, fontSize: 10, fontWeight: 700, minWidth: 36, height: 20, padding: '0 4px' }}>
                {t}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-500)', whiteSpace: 'nowrap' }}>
                {TURNO_LABELS[t]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
        >
          {isClosed || readOnly ? 'Cerrar' : 'Cancelar'}
        </button>
        {!isClosed && !readOnly && (
          <>
            <button
              onClick={handleSave}
              disabled={busy || fieldEmployees.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', color: 'var(--color-text-900)', opacity: busy || fieldEmployees.length === 0 ? 0.6 : 1 }}
            >
              {updateDays.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar
            </button>
            {deliverable.status === 'pendiente' && (
              <button
                onClick={handleCloseAndSubmit}
                disabled={busy || fieldEmployees.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--color-primary)', color: '#fff', opacity: busy || fieldEmployees.length === 0 ? 0.6 : 1 }}
              >
                {(close.isPending || submitDel.isPending) ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                Cerrar y entregar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

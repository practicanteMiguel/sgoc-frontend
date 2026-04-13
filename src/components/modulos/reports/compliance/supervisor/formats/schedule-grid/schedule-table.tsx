import { Fragment } from 'react'
import { ChevronLeft, ChevronsRight, ChevronRight, AlignJustify, Check, History } from 'lucide-react'
import type { ScheduleTipo, Turno } from '@/src/types/compliance.types'
import type { Employee } from '@/src/types/reports.types'
import { TURNO_COLORS, ALL_TURNOS, DAY_ABBR, padDate, dayBg, defaultTurno, getColombianHolidays, daysInMonth } from '@/src/lib/utils'

interface ScheduleTableProps {
  fieldEmployees: Employee[]
  dayNums: number[]
  totalDays: number
  weekGroups: { week: number; days: number[] }[]
  holidays: Set<string>
  grid: Record<string, Record<string, Turno>>
  tipo: ScheduleTipo
  isClosed: boolean
  readOnly: boolean
  year: number
  month: number
  fillPending: string | null
  onSetCell: (empId: string, fecha: string, turno: Turno) => void
  onInsertAt: (empId: string, idx: number) => void
  onShiftToEnd: (empId: string, fecha: string) => void
  onArmFill: (empId: string, fecha: string, day: number, turno: Turno) => void
  showPrev: boolean
  prevYear?: number
  prevMonth?: number
  prevEmpMap?: Record<string, Record<string, Turno>>
  prevMonthName?: string
}

export function ScheduleTable({
  fieldEmployees, dayNums, totalDays, weekGroups, holidays,
  grid, tipo, isClosed, readOnly, year, month, fillPending,
  onSetCell, onInsertAt, onShiftToEnd, onArmFill,
  showPrev, prevYear, prevMonth, prevEmpMap, prevMonthName,
}: ScheduleTableProps) {
  return (
    <>
      {/* Previous month read-only grid */}
      {showPrev && prevYear && prevMonth && prevEmpMap && (() => {
        const prevTotal   = daysInMonth(prevYear, prevMonth)
        const prevDayNums = Array.from({ length: prevTotal }, (_, i) => i + 1)
        const prevHols    = getColombianHolidays(prevYear)
        return (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
          >
            <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <History size={13} style={{ color: 'var(--color-text-400)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-600)' }}>
                {prevMonthName} (referencia)
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: Math.max(600, prevTotal * 52 + 220) }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th
                      className="text-left py-2 px-3 text-xs font-medium sticky left-0 z-10"
                      style={{ color: 'var(--color-text-400)', background: 'var(--color-surface-1)', minWidth: 200, borderRight: '1px solid var(--color-border)' }}
                    >
                      Empleado
                    </th>
                    {prevDayNums.map((d) => {
                      const fecha = padDate(prevYear, prevMonth, d)
                      const dow   = new Date(prevYear, prevMonth - 1, d).getDay()
                      const bg    = dayBg(fecha, dow, prevHols)
                      return (
                        <th
                          key={d}
                          className="text-center py-1 px-0 text-xs font-bold"
                          style={{ minWidth: 44, color: prevHols.has(fecha) ? '#dc2626' : dow === 0 ? '#6366f1' : 'var(--color-text-400)', background: bg ?? 'var(--color-surface-1)' }}
                        >
                          {d}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {fieldEmployees.map((emp) => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td
                        className="py-1 px-3 sticky left-0 z-10 text-xs"
                        style={{ background: 'var(--color-surface-1)', whiteSpace: 'nowrap', borderRight: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
                      >
                        {emp.first_name} {emp.last_name}
                      </td>
                      {prevDayNums.map((d) => {
                        const fecha  = padDate(prevYear, prevMonth, d)
                        const dow    = new Date(prevYear, prevMonth - 1, d).getDay()
                        const turno  = prevEmpMap[emp.id]?.[fecha] ?? 'S'
                        const colors = TURNO_COLORS[turno]
                        const colBg  = dayBg(fecha, dow, prevHols)
                        return (
                          <td key={d} className="py-1 px-0.5 text-center" style={{ background: colBg }}>
                            <span
                              className="inline-flex items-center justify-center rounded text-xs font-bold"
                              style={{ width: 38, height: 26, background: colors.bg, color: colors.color }}
                            >
                              {turno}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Current month schedule table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: Math.max(600, totalDays * 52 + 220) }}>
          <thead>
            {tipo === '6x6' && (
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th
                  rowSpan={3}
                  className="text-left py-2 px-3 text-xs font-medium sticky left-0 z-10"
                  style={{ color: 'var(--color-text-400)', background: 'var(--color-surface-0)', minWidth: 200, verticalAlign: 'middle', borderRight: '1px solid var(--color-border)' }}
                >
                  Empleado
                </th>
                {weekGroups.map((wg) => (
                  <th
                    key={wg.week}
                    colSpan={wg.days.length}
                    className="text-center py-1 text-xs font-semibold"
                    style={{ color: 'var(--color-text-600)', borderLeft: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
                  >
                    Sem {wg.week}
                  </th>
                ))}
              </tr>
            )}
            <tr>
              {tipo === '5x2' && (
                <th
                  rowSpan={2}
                  className="text-left py-2 px-3 text-xs font-medium sticky left-0 z-10"
                  style={{ color: 'var(--color-text-400)', background: 'var(--color-surface-0)', minWidth: 200, verticalAlign: 'middle', borderRight: '1px solid var(--color-border)' }}
                >
                  Empleado
                </th>
              )}
              {dayNums.map((d) => {
                const fecha = padDate(year, month, d)
                const dow   = new Date(year, month - 1, d).getDay()
                const bg    = dayBg(fecha, dow, holidays)
                return (
                  <th
                    key={d}
                    className="text-center py-1 px-0 text-xs font-medium"
                    style={{ color: 'var(--color-text-600)', minWidth: 48, background: bg ?? 'var(--color-surface-0)' }}
                  >
                    {d}
                  </th>
                )
              })}
            </tr>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              {dayNums.map((d) => {
                const fecha = padDate(year, month, d)
                const dow   = new Date(year, month - 1, d).getDay()
                const bg    = dayBg(fecha, dow, holidays)
                return (
                  <th
                    key={d}
                    className="text-center pb-1 px-0 text-xs font-bold"
                    style={{
                      color: holidays.has(fecha) ? '#dc2626' : dow === 0 ? '#6366f1' : 'var(--color-text-400)',
                      background: bg ?? 'var(--color-surface-0)',
                    }}
                  >
                    {DAY_ABBR[dow]}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {fieldEmployees.map((emp) => (
              <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td
                  className="py-2 px-3 sticky left-0 z-10"
                  style={{ background: 'var(--color-surface-0)', whiteSpace: 'nowrap', borderRight: '1px solid var(--color-border)' }}
                >
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-900)' }}>
                    {emp.first_name} {emp.last_name}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--color-text-400)' }}>
                    CC {emp.identification_number} &middot; {emp.position}
                  </p>
                </td>
                {dayNums.map((d) => {
                  const fecha  = padDate(year, month, d)
                  const dow    = new Date(year, month - 1, d).getDay()
                  const turno  = grid[emp.id]?.[fecha] ?? defaultTurno(tipo, year, month, d)
                  const colors = TURNO_COLORS[turno]
                  const colBg  = dayBg(fecha, dow, holidays)
                  return (
                    <td key={d} className="py-1 px-0.5 text-center" style={{ background: colBg }}>
                      {isClosed || readOnly ? (
                        <span
                          className="inline-flex items-center justify-center rounded text-xs font-bold"
                          style={{ width: 40, height: 28, background: colors.bg, color: colors.color }}
                        >
                          {turno}
                        </span>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <select
                            value={turno}
                            onChange={(e) => onSetCell(emp.id, fecha, e.target.value as Turno)}
                            className="rounded text-xs font-bold text-center"
                            style={{ width: 46, height: 26, background: colors.bg, color: colors.color, border: 'none', cursor: 'pointer' }}
                          >
                            {ALL_TURNOS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          <div className="flex" style={{ width: 46, gap: 1 }}>
                            {([
                              { icon: <ChevronLeft size={9} />,   title: 'Insertar S antes', action: () => onInsertAt(emp.id, dayNums.indexOf(d)) },
                              { icon: <ChevronsRight size={9} />, title: 'Mover al final',   action: () => onShiftToEnd(emp.id, fecha) },
                              { icon: <ChevronRight size={9} />,  title: 'Insertar S despues', action: () => onInsertAt(emp.id, dayNums.indexOf(d) + 1) },
                            ] as const).map((btn, bi) => (
                              <button
                                key={bi}
                                onClick={btn.action}
                                title={btn.title}
                                style={{
                                  flex: 1, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                                  borderRadius: 2, cursor: 'pointer', color: 'var(--color-text-400)', padding: 0,
                                }}
                              >
                                {btn.icon}
                              </button>
                            ))}
                          </div>
                          {(() => {
                            const fillKey = `${emp.id}||${fecha}`
                            const armed   = fillPending === fillKey
                            return (
                              <button
                                onClick={() => onArmFill(emp.id, fecha, d, turno)}
                                title={armed ? `Confirmar: rellenar ${turno} desde dia ${d} hasta fin de mes` : `Rellenar ${turno} desde aqui hasta fin de mes`}
                                style={{
                                  width: 46, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: armed ? '#f59e0b' : colors.bg,
                                  border: armed ? '1px solid #d97706' : '1px solid var(--color-border)',
                                  borderRadius: 2, cursor: 'pointer',
                                  color: armed ? '#fff' : colors.color,
                                  padding: 0, opacity: armed ? 1 : 0.75,
                                  transition: 'background 0.15s, border-color 0.15s',
                                }}
                              >
                                {armed ? <Check size={8} /> : <AlignJustify size={8} />}
                              </button>
                            )
                          })()}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {fieldEmployees.length === 0 && (
              <tr>
                <td colSpan={totalDays + 1} className="py-8 text-center text-sm" style={{ color: 'var(--color-text-400)' }}>
                  -
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

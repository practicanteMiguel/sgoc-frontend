import { Fragment } from 'react'
import { BarChart2 } from 'lucide-react'
import type { ScheduleTipo, Turno } from '@/src/types/compliance.types'
import type { Employee } from '@/src/types/reports.types'
import { calcWeekHours } from '@/src/lib/utils'

interface OvertimeTableProps {
  fieldEmployees: Employee[]
  weekGroups: { week: number; days: number[] }[]
  grid: Record<string, Record<string, Turno>>
  holidays: Set<string>
  year: number
  month: number
  tipo: ScheduleTipo
}

const thBase: React.CSSProperties = {
  padding: '4px 6px', fontSize: 10, fontWeight: 600,
  color: 'var(--color-text-400)', textAlign: 'right', whiteSpace: 'nowrap',
  background: 'var(--color-surface-1)',
  borderBottom: '1px solid var(--color-border)',
}
const tdBase: React.CSSProperties = {
  padding: '3px 6px', fontSize: 11, textAlign: 'right',
  borderBottom: '1px solid var(--color-border)',
}

export function OvertimeTable({ fieldEmployees, weekGroups, grid, holidays, year, month, tipo }: OvertimeTableProps) {
  // Compute weekly totals per employee per week
  const weeklyTotals = weekGroups.map((wg) =>
    Object.fromEntries(
      fieldEmployees.map((emp) => [
        emp.id,
        calcWeekHours(emp.id, wg.days, grid, holidays, year, month, tipo).total,
      ]),
    ),
  )

  // Sliding windows of 3 consecutive weeks
  const overtimeGroups: Array<{ label: string; empData: Record<string, { avg: number; ot: number }> }> = []
  for (let i = 0; i <= weekGroups.length - 3; i++) {
    const empData: Record<string, { avg: number; ot: number }> = {}
    for (const emp of fieldEmployees) {
      const sum = weeklyTotals[i][emp.id] + weeklyTotals[i + 1][emp.id] + weeklyTotals[i + 2][emp.id]
      const avg = +(sum / 21).toFixed(2)
      empData[emp.id] = { avg, ot: avg > 7 ? +(avg - 7).toFixed(2) : 0 }
    }
    const w1 = weekGroups[i].week
    const w2 = weekGroups[i + 1].week
    const w3 = weekGroups[i + 2].week
    overtimeGroups.push({ label: `Semana ${w1}-${w2}-${w3}`, empData })
  }

  if (overtimeGroups.length === 0) return null

  const otTotals: Record<string, number> = {}
  for (const emp of fieldEmployees) {
    otTotals[emp.id] = +(overtimeGroups.reduce((s, g) => s + g.empData[emp.id].ot, 0)).toFixed(2)
  }
  const grandOT = +(fieldEmployees.reduce((s, emp) => s + otTotals[emp.id], 0)).toFixed(2)

  const stickyEmpTh: React.CSSProperties = {
    ...thBase, textAlign: 'left', position: 'sticky', left: 0, zIndex: 2,
    minWidth: 180, borderRight: '1px solid var(--color-border)',
  }
  const stickyEmpTd: React.CSSProperties = {
    ...tdBase, textAlign: 'left', position: 'sticky', left: 0, zIndex: 1,
    fontWeight: 500, whiteSpace: 'nowrap',
    background: 'var(--color-surface-0)',
    borderRight: '1px solid var(--color-border)',
    color: 'var(--color-text-700)',
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      <div
        className="px-4 py-2 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
      >
        <BarChart2 size={13} style={{ color: '#f59e0b' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-600)' }}>Horas extra</span>
        <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>— grupos de 3 semanas / 21</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={stickyEmpTh}>Empleado</th>
              {overtimeGroups.map((g) => (
                <th key={g.label} colSpan={2} style={{ ...thBase, textAlign: 'center', borderLeft: '1px solid var(--color-border)', color: '#f59e0b', fontSize: 10 }}>
                  {g.label}
                </th>
              ))}
              <th rowSpan={2} style={{ ...thBase, textAlign: 'center', minWidth: 80, borderLeft: '2px solid #f59e0b', background: 'rgba(245,158,11,0.08)', color: '#d97706', fontWeight: 700 }}>
                Total HE
              </th>
            </tr>
            <tr>
              {overtimeGroups.map((g) => (
                <Fragment key={g.label}>
                  <th style={{ ...thBase, borderLeft: '1px solid var(--color-border)', color: 'var(--color-text-400)', fontWeight: 400 }}>Prom</th>
                  <th style={{ ...thBase, color: '#f59e0b', fontWeight: 600 }}>HE</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {fieldEmployees.map((emp) => (
              <tr key={emp.id}>
                <td style={stickyEmpTd}>{emp.first_name} {emp.last_name}</td>
                {overtimeGroups.map((g) => {
                  const { avg, ot } = g.empData[emp.id]
                  return (
                    <Fragment key={g.label}>
                      <td style={{ ...tdBase, borderLeft: '1px solid var(--color-border)', color: 'var(--color-text-500)', fontWeight: 400 }}>
                        {avg > 0 ? avg.toFixed(2) : '-'}
                      </td>
                      <td style={{ ...tdBase, color: ot > 0 ? '#d97706' : 'var(--color-text-300)', fontWeight: ot > 0 ? 600 : 400 }}>
                        {ot > 0 ? ot.toFixed(2) : '-'}
                      </td>
                    </Fragment>
                  )
                })}
                <td style={{ ...tdBase, borderLeft: '2px solid #f59e0b', background: 'rgba(245,158,11,0.08)', fontWeight: 700, color: otTotals[emp.id] > 0 ? '#d97706' : 'var(--color-text-300)', textAlign: 'center' }}>
                  {otTotals[emp.id] > 0 ? (
                    <div style={{ lineHeight: 1.3 }}>
                      <div>{otTotals[emp.id].toFixed(2)} h</div>
                      <div style={{ fontSize: 9, opacity: 0.8 }}>{Math.round(otTotals[emp.id] * 60)} min</div>
                    </div>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--color-border)' }}>
              <td style={{ ...stickyEmpTd, fontWeight: 700, fontSize: 10, color: 'var(--color-text-500)', background: 'var(--color-surface-1)' }}>
                TOTAL
              </td>
              {overtimeGroups.map((g) => {
                const avgSum = +(fieldEmployees.reduce((s, emp) => s + g.empData[emp.id].avg, 0)).toFixed(2)
                const otSum  = +(fieldEmployees.reduce((s, emp) => s + g.empData[emp.id].ot,  0)).toFixed(2)
                return (
                  <Fragment key={g.label}>
                    <td style={{ ...tdBase, borderLeft: '1px solid var(--color-border)', background: 'var(--color-surface-1)', fontWeight: 700, color: 'var(--color-text-500)' }}>
                      {avgSum > 0 ? avgSum.toFixed(2) : '-'}
                    </td>
                    <td style={{ ...tdBase, background: 'var(--color-surface-1)', fontWeight: 700, color: otSum > 0 ? '#d97706' : 'var(--color-text-300)' }}>
                      {otSum > 0 ? otSum.toFixed(2) : '-'}
                    </td>
                  </Fragment>
                )
              })}
              <td style={{ ...tdBase, borderLeft: '2px solid #f59e0b', background: 'rgba(245,158,11,0.18)', fontWeight: 800, fontSize: 12, color: grandOT > 0 ? '#d97706' : 'var(--color-text-300)', textAlign: 'center' }}>
                {grandOT > 0 ? (
                  <div style={{ lineHeight: 1.3 }}>
                    <div>{grandOT.toFixed(2)} h</div>
                    <div style={{ fontSize: 9, opacity: 0.8 }}>{Math.round(grandOT * 60)} min</div>
                  </div>
                ) : '-'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

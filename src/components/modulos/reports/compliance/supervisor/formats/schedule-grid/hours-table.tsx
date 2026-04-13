import { Fragment } from 'react'
import { BarChart2 } from 'lucide-react'
import type { ScheduleTipo, Turno } from '@/src/types/compliance.types'
import type { Employee } from '@/src/types/reports.types'
import { calcWeekHours, sumWH, ZERO_WH, type WeekHours } from '@/src/lib/utils'

interface HoursTableProps {
  fieldEmployees: Employee[]
  weekGroups: { week: number; days: number[] }[]
  grid: Record<string, Record<string, Turno>>
  holidays: Set<string>
  year: number
  month: number
  tipo: ScheduleTipo
}

const WH_COLS: Array<{ key: keyof Omit<WeekHours, 'total'>; label: string }> = [
  { key: 'D',    label: 'D'     },
  { key: 'N',    label: 'N'     },
  { key: 'DLD',  label: 'DLD'   },
  { key: 'DLN',  label: 'DLN'   },
  { key: 'DN',   label: 'DN'    },
  { key: 'DD',   label: 'DD'    },
  { key: 'DNOC', label: 'D.NOC' },
]
const COLS_PER_WEEK = WH_COLS.length + 1

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
const tealCell: React.CSSProperties = {
  ...tdBase, fontWeight: 700, background: 'rgba(20,184,166,0.1)', color: '#0d9488',
}
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

export function HoursTable({ fieldEmployees, weekGroups, grid, holidays, year, month, tipo }: HoursTableProps) {
  const grandTotals: Record<string, WeekHours> = {}
  for (const emp of fieldEmployees) grandTotals[emp.id] = { ...ZERO_WH }
  const weekTotals: WeekHours[] = []

  const allWeekData = weekGroups.map((wg) => {
    const rows = fieldEmployees.map((emp) => ({
      emp,
      wh: calcWeekHours(emp.id, wg.days, grid, holidays, year, month, tipo),
    }))
    for (const { emp, wh } of rows) grandTotals[emp.id] = sumWH(grandTotals[emp.id], wh)
    const weekTotal = rows.reduce<WeekHours>((acc, { wh }) => sumWH(acc, wh), { ...ZERO_WH })
    weekTotals.push(weekTotal)
    return { wg, rows, weekTotal }
  })

  const grandColTotal = fieldEmployees.reduce<WeekHours>(
    (acc, emp) => sumWH(acc, grandTotals[emp.id]),
    { ...ZERO_WH },
  )

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      <div
        className="px-4 py-2 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
      >
        <BarChart2 size={13} style={{ color: 'var(--color-text-400)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-600)' }}>Horas semanales</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={stickyEmpTh}>Empleado</th>
              {allWeekData.map(({ wg }) => (
                <th
                  key={wg.week}
                  colSpan={COLS_PER_WEEK}
                  style={{ ...thBase, textAlign: 'center', borderLeft: '1px solid var(--color-border)', color: 'var(--color-text-600)', fontSize: 10 }}
                >
                  Sem {wg.week} <span style={{ fontWeight: 400 }}>({wg.days[0]}-{wg.days[wg.days.length - 1]})</span>
                </th>
              ))}
              <th
                colSpan={COLS_PER_WEEK}
                style={{ ...thBase, textAlign: 'center', borderLeft: '2px solid #0d9488', color: '#0d9488', background: 'rgba(20,184,166,0.08)', fontSize: 10 }}
              >
                Total mes
              </th>
            </tr>
            <tr>
              {allWeekData.map(({ wg }) => (
                <Fragment key={wg.week}>
                  {WH_COLS.map((c) => (
                    <th key={`${wg.week}-${c.key}`} style={{ ...thBase, borderLeft: c.key === 'D' ? '1px solid var(--color-border)' : undefined }}>
                      {c.label}
                    </th>
                  ))}
                  <th style={{ ...thBase, color: '#0d9488' }}>H</th>
                </Fragment>
              ))}
              {WH_COLS.map((c) => (
                <th key={`tot-${c.key}`} style={{ ...thBase, borderLeft: c.key === 'D' ? '2px solid #0d9488' : undefined, background: 'rgba(20,184,166,0.08)', color: 'var(--color-text-400)' }}>
                  {c.label}
                </th>
              ))}
              <th style={{ ...thBase, background: 'rgba(20,184,166,0.08)', color: '#0d9488', fontWeight: 700 }}>H</th>
            </tr>
          </thead>
          <tbody>
            {fieldEmployees.map((emp) => (
              <tr key={emp.id}>
                <td style={stickyEmpTd}>{emp.first_name} {emp.last_name}</td>
                {allWeekData.map(({ wg, rows }) => {
                  const wh = rows.find((r) => r.emp.id === emp.id)!.wh
                  return (
                    <Fragment key={wg.week}>
                      {WH_COLS.map((c) => (
                        <td key={`${wg.week}-${c.key}`} style={{ ...tdBase, borderLeft: c.key === 'D' ? '1px solid var(--color-border)' : undefined, color: wh[c.key] > 0 ? 'var(--color-text-900)' : 'var(--color-text-300)' }}>
                          {wh[c.key] || '-'}
                        </td>
                      ))}
                      <td style={tealCell}>{wh.total || '-'}</td>
                    </Fragment>
                  )
                })}
                {(() => {
                  const wh = grandTotals[emp.id]
                  return (
                    <Fragment key="gt">
                      {WH_COLS.map((c) => (
                        <td key={`gt-${c.key}`} style={{ ...tdBase, borderLeft: c.key === 'D' ? '2px solid #0d9488' : undefined, background: 'rgba(20,184,166,0.05)', color: wh[c.key] > 0 ? 'var(--color-text-900)' : 'var(--color-text-300)', fontWeight: 600 }}>
                          {wh[c.key] || '-'}
                        </td>
                      ))}
                      <td style={{ ...tealCell, fontSize: 12 }}>{wh.total || '-'}</td>
                    </Fragment>
                  )
                })()}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--color-border)' }}>
              <td style={{ ...stickyEmpTd, fontWeight: 700, fontSize: 10, color: 'var(--color-text-500)', background: 'var(--color-surface-1)' }}>
                TOTAL
              </td>
              {allWeekData.map(({ wg }, wi) => {
                const wt = weekTotals[wi]
                return (
                  <Fragment key={wg.week}>
                    {WH_COLS.map((c) => (
                      <td key={`wt-${wg.week}-${c.key}`} style={{ ...tdBase, borderLeft: c.key === 'D' ? '1px solid var(--color-border)' : undefined, fontWeight: 700, color: 'var(--color-text-600)', background: 'var(--color-surface-1)' }}>
                        {wt[c.key] || '-'}
                      </td>
                    ))}
                    <td style={{ ...tealCell, background: 'rgba(20,184,166,0.18)', fontWeight: 700 }}>{wt.total || '-'}</td>
                  </Fragment>
                )
              })}
              {WH_COLS.map((c) => (
                <td key={`gct-${c.key}`} style={{ ...tdBase, borderLeft: c.key === 'D' ? '2px solid #0d9488' : undefined, background: 'rgba(20,184,166,0.1)', fontWeight: 700, color: 'var(--color-text-700)' }}>
                  {grandColTotal[c.key] || '-'}
                </td>
              ))}
              <td style={{ ...tealCell, background: 'rgba(20,184,166,0.25)', fontSize: 13, fontWeight: 800 }}>
                {grandColTotal.total || '-'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

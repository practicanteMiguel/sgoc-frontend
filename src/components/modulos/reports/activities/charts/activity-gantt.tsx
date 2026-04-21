'use client'

import { useMemo } from 'react'
import type { Activity } from '@/src/types/activities.types'

interface ActivityForm {
  requirement:         string
  additional_resource: string
  progress:            string
  is_scheduled:        boolean
}
type ActivityForms = Record<string, ActivityForm>

interface Props {
  activities: Activity[]
  forms:      ActivityForms
  weekNumber: number
}

const BASE_MS   = Date.UTC(2025, 11, 29)
const DAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

function getWeekDates(weekNumber: number): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const ms = BASE_MS + ((weekNumber - 1) * 7 + i) * 86400000
    return new Date(ms).toISOString().slice(0, 10)
  })
}

function fmtShort(d: string) {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`
}

function parseProgress(val: string | null | undefined): number {
  const n = parseFloat(val ?? '0')
  return isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
}

function progressColor(p: number) {
  return p >= 75 ? '#10b981' : p >= 40 ? '#f59e0b' : '#ef4444'
}

export function ActivityGanttChart({ activities, forms, weekNumber }: Props) {
  const weekDates = useMemo(() => getWeekDates(weekNumber), [weekNumber])

  const rows = useMemo(() =>
    activities
      .map((act) => {
        const start = act.start_date
        const end   = act.end_date ?? act.start_date
        let si = -1, ei = -1
        for (let i = 0; i < 7; i++) {
          if (weekDates[i] >= start && weekDates[i] <= end) {
            if (si === -1) si = i
            ei = i
          }
        }
        if (si === -1) return null
        const progress = parseProgress(forms[act.id]?.progress ?? act.progress)
        return { id: act.id, description: act.description, si, ei, progress }
      })
      .filter(Boolean) as { id: string; description: string; si: number; ei: number; progress: number }[]
  , [activities, forms, weekDates])

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-400)' }}>
        Cronograma de actividades
      </p>
      <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--color-border)' }}>
        <div style={{ minWidth: 480 }}>
          {/* Header */}
          <div className="grid" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
            <div
              className="px-2 py-2 text-[10px] font-semibold text-center"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}
            >
              #
            </div>
            {weekDates.map((d, i) => (
              <div
                key={d}
                className="py-2 text-center"
                style={{ background: 'var(--color-surface-2)', borderLeft: '1px solid var(--color-border)' }}
              >
                <p className="text-[10px] font-semibold" style={{ color: 'var(--color-text-700)' }}>
                  {DAY_LABELS[i]}
                </p>
                <p className="text-[9px]" style={{ color: 'var(--color-text-400)' }}>
                  {fmtShort(d)}
                </p>
              </div>
            ))}
          </div>

          {/* Activity rows */}
          {rows.map((row, rowIdx) => {
            const color    = progressColor(row.progress)
            const spanCols = row.ei - row.si + 1

            return (
              <div
                key={row.id}
                className="grid items-center"
                style={{
                  gridTemplateColumns: '40px repeat(7, 1fr)',
                  borderTop:  '1px solid var(--color-border)',
                  background: rowIdx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)',
                  minHeight:  38,
                }}
              >
                {/* Item number */}
                <div
                  className="text-[11px] font-bold text-center"
                  style={{ color: 'var(--color-text-400)' }}
                  title={row.description}
                >
                  {rowIdx + 1}
                </div>

                {/* Empty cells before bar */}
                {Array.from({ length: row.si }, (_, i) => (
                  <div
                    key={`pre-${i}`}
                    style={{ borderLeft: '1px solid var(--color-border)', alignSelf: 'stretch' }}
                  />
                ))}

                {/* Bar spanning days */}
                <div
                  style={{
                    gridColumn: `span ${spanCols}`,
                    borderLeft: '1px solid var(--color-border)',
                    padding:    '7px 4px',
                  }}
                >
                  <div
                    style={{
                      position:     'relative',
                      background:   '#1e3a5f',
                      borderRadius: 4,
                      height:       22,
                      overflow:     'hidden',
                    }}
                  >
                    {/* Progress fill */}
                    <div
                      style={{
                        position:   'absolute',
                        left: 0, top: 0, bottom: 0,
                        width:      `${row.progress}%`,
                        background: color,
                        opacity:    0.85,
                      }}
                    />
                    {/* Label */}
                    <span
                      style={{
                        position:  'absolute',
                        right:     6,
                        top:       '50%',
                        transform: 'translateY(-50%)',
                        fontSize:  9,
                        fontWeight: 'bold',
                        color:     'white',
                        zIndex:    1,
                      }}
                    >
                      {row.progress}%
                    </span>
                  </div>
                </div>

                {/* Empty cells after bar */}
                {Array.from({ length: 6 - row.ei }, (_, i) => (
                  <div
                    key={`post-${i}`}
                    style={{ borderLeft: '1px solid var(--color-border)', alignSelf: 'stretch' }}
                  />
                ))}
              </div>
            )
          })}

          {rows.length === 0 && (
            <div
              className="py-6 text-center text-xs"
              style={{ color: 'var(--color-text-400)', borderTop: '1px solid var(--color-border)' }}
            >
              Sin actividades en esta semana
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

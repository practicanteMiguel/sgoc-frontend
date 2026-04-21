'use client'

import { useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { Activity } from '@/src/types/activities.types'

interface ActivityForm {
  requirement: string
  additional_resource: string
  progress: string
  is_scheduled: boolean
}
type ActivityForms = Record<string, ActivityForm>

interface Props {
  activities: Activity[]
  forms:      ActivityForms
  weekNumber: number
}

const DAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

const BASE_MS = Date.UTC(2025, 11, 29)

function getWeekDates(weekNumber: number): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const ms = BASE_MS + ((weekNumber - 1) * 7 + i) * 86400000
    return new Date(ms).toISOString().slice(0, 10)
  })
}

function daysBetween(start: string, end: string): number {
  const s = Date.UTC(+start.slice(0,4), +start.slice(5,7)-1, +start.slice(8,10))
  const e = Date.UTC(+end.slice(0,4),   +end.slice(5,7)-1,   +end.slice(8,10))
  return Math.round((e - s) / 86400000) + 1
}

function parseProgress(val: string | null | undefined): number {
  const n = parseFloat(val ?? '0')
  return isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs flex flex-col gap-1.5"
      style={{
        background: 'var(--color-surface-0)',
        border:     '1px solid var(--color-border)',
        boxShadow:  '0 4px 16px rgba(4,24,24,0.2)',
      }}
    >
      <p className="font-semibold" style={{ color: 'var(--color-text-700)' }}>{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm" style={{ background: '#334155' }} />
        <span style={{ color: 'var(--color-text-400)' }}>Planeadas:</span>
        <span className="font-semibold" style={{ color: 'var(--color-text-900)' }}>{d.planeadas}</span>
        {d.multiday > 0 && (
          <span className="text-[9px]" style={{ color: '#f59e0b' }}>({d.multiday} multidía)</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm" style={{ background: '#10b981' }} />
        <span style={{ color: 'var(--color-text-400)' }}>Ejecutadas:</span>
        <span className="font-semibold" style={{ color: 'var(--color-text-900)' }}>{d.ejecutadas}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 border-t-2 shrink-0" style={{ borderColor: '#0ea5e9' }} />
        <span style={{ color: 'var(--color-text-400)' }}>Proyectado acum.:</span>
        <span className="font-semibold" style={{ color: '#0ea5e9' }}>{d.projPct}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 border-t-2 border-dashed shrink-0" style={{ borderColor: '#10b981' }} />
        <span style={{ color: 'var(--color-text-400)' }}>Ejecutado acum.:</span>
        <span className="font-semibold" style={{ color: '#10b981' }}>{d.cumulExec}%</span>
      </div>
    </div>
  )
}

function CustomXTick({ x, y, payload, chartData }: any) {
  const d = (chartData as any[]).find((item) => item.day === payload.value)
  const hasMultiday = d?.multiday > 0
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={13} textAnchor="middle" fontSize={11} fill="var(--color-text-400)">
        {payload.value}
      </text>
      <text x={-8} y={0} dy={25} textAnchor="middle" fontSize={9} fontWeight="600" fill="#334155">
        {d?.planeadas ?? 0}
      </text>
      <text x={8} y={0} dy={25} textAnchor="middle" fontSize={9} fontWeight="600" fill="#10b981">
        {d?.ejecutadas ?? 0}
      </text>
      {hasMultiday && (
        <text x={0} y={0} dy={37} textAnchor="middle" fontSize={8} fill="#f59e0b">
          ↔{d.multiday}
        </text>
      )}
    </g>
  )
}

export function ReportWeeklyChart({ activities, forms, weekNumber }: Props) {
  const rawData = useMemo(() => {
    const dates    = getWeekDates(weekNumber)
    const total    = activities.length
    const weight   = total > 0 ? 100 / total : 0

    return dates.map((dateStr, i) => {
      let planeadas  = 0
      let ejecutadas = 0
      let multiday   = 0
      let dailyProj  = 0
      let dailyExec  = 0

      for (const act of activities) {
        const start    = act.start_date
        const end      = act.end_date ?? act.start_date
        if (dateStr >= start && dateStr <= end) {
          planeadas++
          const duration   = daysBetween(start, end)
          const dailyW     = weight / duration
          if (start !== end) multiday++
          dailyProj += dailyW
          const p = parseProgress(forms[act.id]?.progress ?? act.progress)
          if (p > 75) {
            ejecutadas++
            dailyExec += dailyW * (p / 100)
          }
        }
      }

      return { day: DAY_LABELS[i], date: dateStr, planeadas, ejecutadas, multiday, dailyProj, dailyExec }
    })
  }, [activities, forms, weekNumber])

  const data = useMemo(() => {
    let cumProj = 0
    let cumExec = 0
    return rawData.map((d) => {
      cumProj += d.dailyProj
      cumExec += d.dailyExec
      return {
        ...d,
        projPct:  Math.round(cumProj),
        cumulExec: Math.round(cumExec),
      }
    })
  }, [rawData])

  const hasMultiday = rawData.some((d) => d.multiday > 0)
  const maxBar      = Math.max(...rawData.map((d) => d.planeadas), 1)

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-400)' }}
        >
          Cumplimiento de la semana
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { bg: '#334155', label: 'Planeadas',       bar: true  },
            { bg: '#10b981', label: 'Ejecutadas',      bar: true  },
            { bg: '#0ea5e9', label: 'Proyectado',      bar: false, dashed: false },
            { bg: '#10b981', label: 'Ejecutado acum.', bar: false, dashed: true  },
          ].map(({ bg, label, bar, dashed }) => (
            <div key={label} className="flex items-center gap-1">
              {bar
                ? <span className="w-3 h-2.5 rounded-sm shrink-0" style={{ background: bg }} />
                : <span
                    className="w-4 shrink-0"
                    style={{
                      borderTop:   `2px ${dashed ? 'dashed' : 'solid'} ${bg}`,
                      display:     'inline-block',
                    }}
                  />
              }
              <span className="text-[9px]" style={{ color: 'var(--color-text-400)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart
          data={data}
          margin={{ top: 22, right: 38, bottom: hasMultiday ? 52 : 40, left: -28 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            interval={0}
            tick={(props) => <CustomXTick {...props} chartData={data} />}
          />
          <YAxis
            yAxisId="bars"
            tick={{ fontSize: 10, fill: 'var(--color-text-400)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            domain={[0, Math.ceil(maxBar * 1.6) || 4]}
          />
          <YAxis
            yAxisId="pct"
            orientation="right"
            tick={{ fontSize: 10, fill: 'var(--color-text-400)' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            width={36}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />

          <Bar yAxisId="bars" dataKey="planeadas"  fill="#334155" radius={[3, 3, 0, 0]} maxBarSize={20} />
          <Bar yAxisId="bars" dataKey="ejecutadas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} />

          {/* Projected cumulative - solid blue */}
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="projPct"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={{ fill: '#0ea5e9', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            label={{
              position:  'top',
              fontSize:  9,
              fill:      '#0ea5e9',
              dy:        -4,
              formatter: (v: any) => (v > 0 ? `${v}%` : ''),
            }}
          />

          {/* Executed cumulative - dashed green */}
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="cumulExec"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ fill: '#10b981', r: 2.5, strokeWidth: 0, opacity: 0.8 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            label={{
              position:  'bottom',
              fontSize:  9,
              fill:      '#10b981',
              dy:        6,
              formatter: (v: any) => (v > 0 ? `${v}%` : ''),
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {hasMultiday && (
        <p className="text-[9px] leading-tight" style={{ color: 'var(--color-text-400)' }}>
          ↔ Actividades que abarcan multiples dias (su peso se distribuye proporcionalmente)
        </p>
      )}
    </div>
  )
}

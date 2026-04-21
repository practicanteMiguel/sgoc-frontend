'use client'

import { useMemo } from 'react'
import { PieChart, Pie } from 'recharts'
import { ReportWeeklyChart } from './report-weekly-chart'
import { ActivityGanttChart } from './activity-gantt'
import type { Activity } from '@/src/types/activities.types'

interface ActivityForm {
  requirement:        string
  additional_resource: string
  progress:           string
  is_scheduled:       boolean
}
type ActivityForms = Record<string, ActivityForm>

interface Props {
  activities: Activity[]
  forms:      ActivityForms
  weekNumber: number
}

function parseProgress(val: string | null | undefined): number {
  const n = parseFloat(val ?? '0')
  return isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
}

export function ReportSummaryStats({ activities, forms, weekNumber }: Props) {
  const { planeadas, ejecutadas, rendimiento } = useMemo(() => {
    const total = activities.length
    if (total === 0) return { planeadas: 0, ejecutadas: 0, rendimiento: 0 }

    let executedSum   = 0
    let executedCount = 0
    for (const act of activities) {
      const p = parseProgress(forms[act.id]?.progress ?? act.progress)
      if (p > 75) {
        executedSum   += p
        executedCount += 1
      }
    }

    const rend = executedCount > 0 ? (executedSum / (total * 100)) * 100 : 0
    return { planeadas: total, ejecutadas: executedCount, rendimiento: Math.round(rend) }
  }, [activities, forms])

  const color     = rendimiento >= 80 ? '#10b981' : rendimiento >= 50 ? '#f59e0b' : '#ef4444'
  const chartData = [
    { value: rendimiento,                    fill: color },
    { value: Math.max(0, 100 - rendimiento), fill: 'var(--color-surface-2)' },
  ]

  return (
    <div
      className="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-4"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
    >
      {/* Left column: stat cards + donut */}
      <div className="flex flex-col gap-3">
        {/* Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3 flex flex-col gap-1"
            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
          >
            <span className="text-2xl font-bold font-display" style={{ color: 'var(--color-text-900)' }}>
              {planeadas}
            </span>
            <span className="text-xs leading-tight" style={{ color: 'var(--color-text-400)' }}>
              Actividades<br />Planeadas
            </span>
          </div>
          <div
            className="rounded-xl p-3 flex flex-col gap-1"
            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
          >
            <span className="text-2xl font-bold font-display" style={{ color }}>
              {ejecutadas}
            </span>
            <span className="text-xs leading-tight" style={{ color: 'var(--color-text-400)' }}>
              Actividades<br />Ejecutadas
            </span>
          </div>
        </div>

        {/* Donut */}
        <div className="flex items-center justify-center py-1">
          <div className="relative" style={{ width: 110, height: 110 }}>
            <PieChart width={110} height={110}>
              <Pie
                data={chartData}
                cx={50}
                cy={50}
                innerRadius={36}
                outerRadius={50}
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
                dataKey="value"
                isAnimationActive={false}
              />
            </PieChart>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ pointerEvents: 'none' }}
            >
              <span className="text-lg font-bold font-display" style={{ color, lineHeight: 1 }}>
                {rendimiento}%
              </span>
              <span className="text-[9px] font-medium mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                rendimiento
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right column: weekly bar chart */}
      <div className="sm:col-span-3">
        <ReportWeeklyChart
          activities={activities}
          forms={forms}
          weekNumber={weekNumber}
        />
      </div>

      {/* Gantt - full width */}
      <div className="sm:col-span-4">
        <ActivityGanttChart
          activities={activities}
          forms={forms}
          weekNumber={weekNumber}
        />
      </div>
    </div>
  )
}

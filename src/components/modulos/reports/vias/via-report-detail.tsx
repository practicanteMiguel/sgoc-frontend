'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { ArrowLeft, Trash2, Loader2, Map, List, FileText } from 'lucide-react'
import { useViaReport } from '@/src/hooks/vias/use-via-reports'
import { useDeleteViaReport } from '@/src/hooks/vias/use-via-reports'
import { VIA_STATE_COLORS, VIA_STATE_LABELS, MONTHS } from '@/src/types/vias.types'
import type { ViaReport } from '@/src/types/vias.types'

const ViaMap = dynamic(
  () => import('./via-map').then((m) => m.ViaMap),
  { ssr: false, loading: () => (
    <div
      className="flex items-center justify-center rounded-xl"
      style={{ height: 400, background: 'var(--color-surface-1)' }}
    >
      <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
    </div>
  )},
)

type View = 'map' | 'list'

interface Props {
  reportId: string
  onBack:   () => void
}

function StateBadge({ state }: { state: string }) {
  const color = VIA_STATE_COLORS[state as keyof typeof VIA_STATE_COLORS] ?? '#888'
  const label = VIA_STATE_LABELS[state as keyof typeof VIA_STATE_LABELS] ?? state
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  )
}

export function ViaReportDetail({ reportId, onBack }: Props) {
  const { data: report, isLoading } = useViaReport(reportId)
  const deleteReport = useDeleteViaReport()
  const [view,     setView]     = useState<View>('map')
  const [deleting, setDeleting] = useState(false)

  function handleDelete() {
    if (!report) return
    setDeleting(true)
    deleteReport.mutate(report.id, {
      onSuccess: () => onBack(),
      onSettled: () => setDeleting(false),
    })
  }

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
    </div>
  )

  if (!report) return null

  const mapPoints    = report.map_points ?? []
  const hasMapPoints = mapPoints.length > 0

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
        >
          <ArrowLeft size={16} style={{ color: 'var(--color-text-600)' }} />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
            Informe {report.type === 'mensual' ? 'Mensual' : 'Urgente'}
          </h3>
          <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
            {MONTHS[(report.monthly_log?.month ?? 1) - 1]} {report.monthly_log?.year} &middot; {report.monthly_log?.field?.name}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-error, #ef4444)', border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>

      {/* General observations */}
      {report.general_observations && (
        <div
          className="rounded-xl p-4 flex gap-3"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
        >
          <FileText size={15} style={{ color: 'var(--color-text-400)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-sm" style={{ color: 'var(--color-text-700)' }}>{report.general_observations}</p>
        </div>
      )}

      {/* View toggle */}
      {hasMapPoints && (
        <div
          className="flex items-center gap-1 rounded-xl p-1 w-fit"
          style={{ background: 'var(--color-surface-2)' }}
        >
          {(['map', 'list'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: view === v ? 'var(--color-surface-0)' : 'transparent',
                color:      view === v ? 'var(--color-text-900)' : 'var(--color-text-400)',
              }}
            >
              {v === 'map' ? <Map size={12} /> : <List size={12} />}
              {v === 'map' ? 'Mapa' : 'Lista'}
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      {view === 'map' && hasMapPoints && (
        <div>
          <ViaMap
            points={mapPoints}
            height="420px"
          />
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(VIA_STATE_COLORS).map(([state, color]) => (
              <div key={state} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
                <span className="text-xs" style={{ color: 'var(--color-text-600)' }}>
                  {VIA_STATE_LABELS[state as keyof typeof VIA_STATE_LABELS]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No GPS points message */}
      {view === 'map' && !hasMapPoints && (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <Map size={26} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
            No hay puntos GPS en este informe.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
            Los items sin captura asignada no aparecen en el mapa.
          </p>
        </div>
      )}

      {/* Items list */}
      {(view === 'list' || !hasMapPoints) && (
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-400)' }}>
            Vias documentadas ({report.items?.length ?? 0})
          </h4>
          {(report.items ?? []).map((item) => (
            <div
              key={item.id}
              className="rounded-xl p-4 flex gap-4"
              style={{ background: 'var(--color-surface-0)', border: `1px solid ${VIA_STATE_COLORS[item.state] ?? 'var(--color-border)'}40` }}
            >
              {item.capture_group?.images?.[0]?.url && (
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                  <img src={item.capture_group.images[0].url} alt={item.via_name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
                    {item.via_name}
                  </p>
                  <StateBadge state={item.state} />
                </div>
                {item.observations && (
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{item.observations}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

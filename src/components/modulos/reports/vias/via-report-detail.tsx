'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, Trash2, Loader2, FileText } from 'lucide-react'
import { useViaReport } from '@/src/hooks/vias/use-via-reports'
import { useDeleteViaReport } from '@/src/hooks/vias/use-via-reports'
import { VIA_STATE_COLORS, VIA_STATE_LABELS, MONTHS } from '@/src/types/vias.types'

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

      {/* Items list */}
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
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 relative">
                <Image src={item.capture_group.images[0].url} alt={item.via_name} fill className="object-cover" unoptimized />
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
    </div>
  )
}

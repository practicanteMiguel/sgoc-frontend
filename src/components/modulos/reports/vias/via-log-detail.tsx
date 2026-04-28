'use client'

import { useState } from 'react'
import { ArrowLeft, Copy, CheckCircle2, MapPin, RefreshCw, Loader2, Image as ImageIcon, Plus, X } from 'lucide-react'
import { useViaLog } from '@/src/hooks/vias/use-via-logs'
import { MONTHS } from '@/src/types/vias.types'
import type { ViaCaptureGroup, ViaMonthlyLog } from '@/src/types/vias.types'

const APP_BASE = typeof window !== 'undefined' ? window.location.origin : ''

interface Props {
  log:      ViaMonthlyLog
  onBack:   () => void
  onReport: (log: ViaMonthlyLog) => void
}

function GroupCard({ group }: { group: ViaCaptureGroup }) {
  const [open,      setOpen]      = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const count = group.images.length
  const thumb = group.images[0]?.url

  if (!thumb) return null

  function openAt(idx: number) { setActiveIdx(idx); setOpen(true) }

  return (
    <>
      <button
        onClick={() => openAt(0)}
        className="relative rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        style={{ aspectRatio: '1', background: 'var(--color-surface-1)' }}
      >
        <img src={thumb} alt={group.via_name ?? ''} className="w-full h-full object-cover" />

        {count > 1 && (
          <div
            className="absolute top-1.5 right-1.5 rounded-md px-1.5 py-0.5 flex items-center gap-1"
            style={{ background: 'rgba(0,0,0,0.65)' }}
          >
            <ImageIcon size={8} className="text-white" />
            <span className="text-[9px] font-semibold text-white">{count}</span>
          </div>
        )}

        <div
          className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex flex-col gap-0.5"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
        >
          {group.via_name && (
            <span className="text-[10px] font-semibold text-white truncate">{group.via_name}</span>
          )}
          <div className="flex items-center gap-1">
            <MapPin size={8} className="text-emerald-400 shrink-0" />
            <span className="text-[9px] text-gray-300">
              {Number(group.lat).toFixed(4)}, {Number(group.lng).toFixed(4)}
            </span>
          </div>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
            style={{ background: 'var(--color-surface-0)', maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-4 pt-4 pb-3 shrink-0">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
                  {group.via_name ?? 'Sin nombre'}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={9} style={{ color: 'var(--color-text-400)' }} />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-400)' }}>
                    {Number(group.lat).toFixed(5)}, {Number(group.lng).toFixed(5)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {group.taken_by && (
                    <span className="text-[10px]" style={{ color: 'var(--color-text-500)' }}>
                      {group.taken_by.name}
                    </span>
                  )}
                  {group.captured_at && (
                    <span className="text-[10px]" style={{ color: 'var(--color-text-400)' }}>
                      {new Date(group.captured_at).toLocaleDateString('es-CO')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 shrink-0"
                style={{ color: 'var(--color-text-400)', background: 'var(--color-surface-2)' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Main image */}
            <div className="shrink-0 mx-4 rounded-xl overflow-hidden" style={{ aspectRatio: '4/3', background: 'var(--color-surface-2)' }}>
              <img
                src={group.images[activeIdx]?.url}
                alt={group.images[activeIdx]?.original_name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Counter */}
            <p className="text-[10px] text-center mt-2 shrink-0" style={{ color: 'var(--color-text-400)' }}>
              {activeIdx + 1} / {count}
            </p>

            {/* Thumbnails */}
            {count > 1 && (
              <div className="flex gap-2 px-4 py-2 overflow-x-auto shrink-0">
                {group.images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveIdx(idx)}
                    className="shrink-0 rounded-lg overflow-hidden transition-all"
                    style={{
                      width: 48,
                      height: 48,
                      outline: activeIdx === idx ? '2px solid var(--color-primary)' : '2px solid transparent',
                      outlineOffset: 2,
                      opacity: activeIdx === idx ? 1 : 0.55,
                    }}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Comment */}
            {group.comment && (
              <div
                className="mx-4 mb-4 mt-2 px-3 py-2.5 rounded-xl shrink-0"
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-xs" style={{ color: 'var(--color-text-600)' }}>{group.comment}</p>
              </div>
            )}

            {!group.comment && <div className="pb-4" />}
          </div>
        </div>
      )}
    </>
  )
}

export function ViaLogDetail({ log: initialLog, onBack, onReport }: Props) {
  const [copied, setCopied] = useState(false)
  const { data: log, isLoading, refetch, isFetching } = useViaLog(initialLog.id)
  const current       = log ?? initialLog
  const captureGroups = current.capture_groups ?? []
  const totalImages   = captureGroups.reduce((s, g) => s + g.images.length, 0)

  function copyLink() {
    const url = `${APP_BASE}/via-vault/${current.vault_token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-900)' }}>
              {MONTHS[(current.month ?? 1) - 1]} {current.year}
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
              {current.field?.name} &middot; {captureGroups.length} grupo{captureGroups.length !== 1 ? 's' : ''} &middot; {totalImages} foto{totalImages !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
          >
            {isFetching
              ? <Loader2 size={13} className="animate-spin" />
              : <RefreshCw size={13} />}
          </button>

          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: copied ? '#d1fae5' : 'var(--color-surface-2)',
              color:      copied ? '#065f46'  : 'var(--color-text-700)',
              border:     '1px solid var(--color-border)',
            }}
          >
            {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            {copied ? 'Copiado' : 'Boveda'}
          </button>

          <button
            onClick={() => onReport(current)}
            disabled={captureGroups.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              background: 'var(--color-primary)',
              color:      '#fff',
              opacity:    captureGroups.length === 0 ? 0.4 : 1,
            }}
          >
            <Plus size={13} /> Crear informe
          </button>
        </div>
      </div>

      {/* Capture groups */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-400)' }}>
            Grupos de capturas ({captureGroups.length})
          </h4>
          {isLoading && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />}
        </div>

        {captureGroups.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-14 rounded-xl"
            style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
          >
            <ImageIcon size={26} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin capturas</p>
            <p className="text-xs mt-1 text-center px-8" style={{ color: 'var(--color-text-400)' }}>
              Comparte el enlace boveda para que los trabajadores suban fotos con GPS.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {captureGroups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

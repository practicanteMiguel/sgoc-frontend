'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, Trash2, Loader2, MapPin, Image as ImageIcon, Check, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { useCreateViaReport, useViaReports, useViaReport } from '@/src/hooks/vias/use-via-reports'
import type { CreateViaReportItem } from '@/src/hooks/vias/use-via-reports'
import type { ViaCaptureGroup, ViaMonthlyLog, ViaState, ViaReportType } from '@/src/types/vias.types'
import { VIA_STATE_LABELS, VIA_STATE_COLORS, MONTHS } from '@/src/types/vias.types'
import { ModalPortal } from '@/src/components/ui/modal-portal'

const STATES_BY_TYPE: Record<ViaReportType, ViaState[]> = {
  mensual: ['bueno', 'regular', 'malo'],
  urgente: ['critico'],
}

interface ItemDraft {
  key:              number
  capture_group_id: string | null
  capture_thumb:    string | null
  via_name:         string
  state:            ViaState
  observations:     string
}

let keyCounter = 0
function newItem(): ItemDraft {
  return {
    key:              keyCounter++,
    capture_group_id: null,
    capture_thumb:    null,
    via_name:         '',
    state:            'bueno',
    observations:     '',
  }
}

interface Props {
  log:               ViaMonthlyLog
  hasMonthlyReport?: boolean
  onBack:            () => void
  onDone:            (reportId: string) => void
}

export function ViaReportForm({ log, hasMonthlyReport = false, onBack, onDone }: Props) {
  const [type,           setType]           = useState<ViaReportType>(hasMonthlyReport ? 'urgente' : 'mensual')
  const [generalObs,     setGeneralObs]     = useState('')
  const [items,          setItems]          = useState<ItemDraft[]>([
    { ...newItem(), state: hasMonthlyReport ? 'critico' : 'bueno' },
  ])
  const [capturePanel,   setCapturePanel]   = useState<number | null>(null)
  const [previewGroup,   setPreviewGroup]   = useState<ViaCaptureGroup | null>(null)
  const [previewIdx,     setPreviewIdx]     = useState(0)
  const [previewItemKey, setPreviewItemKey] = useState<number | null>(null)
  const createReport = useCreateViaReport()

  // Fetch already-used capture groups from existing reports for this period
  const { data: periodReportsData } = useViaReports({
    field_id: log.field.id,
    year:     log.year,
    month:    log.month,
  })
  const mensualReportId = (periodReportsData?.data ?? [])
    .find((r) => r.monthly_log?.id === log.id && r.type === 'mensual')
    ?.id ?? null
  const { data: mensualDetail } = useViaReport(mensualReportId)
  const usedGroupIds = new Set(
    (mensualDetail?.items ?? [])
      .map((item) => item.capture_group?.id)
      .filter((id): id is string => id != null),
  )

  const groups = log.capture_groups ?? []

  function changeType(t: ViaReportType) {
    setType(t)
    const defaultState: ViaState = t === 'urgente' ? 'critico' : 'bueno'
    setItems((prev) => prev.map((i) => ({ ...i, state: defaultState })))
  }

  function updateItem(key: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((i) => i.key === key ? { ...i, ...patch } : i))
  }

  function assignGroup(itemKey: number, group: ViaCaptureGroup) {
    const current = items.find((i) => i.key === itemKey)
    updateItem(itemKey, {
      capture_group_id: group.id,
      capture_thumb:    group.images[0]?.url ?? null,
      via_name:         group.via_name ?? current?.via_name ?? '',
      observations:     group.comment  ?? current?.observations ?? '',
    })
    setCapturePanel(null)
  }

  function handleSubmit() {
    const payload: CreateViaReportItem[] = items
      .filter((i) => i.via_name.trim())
      .map((i) => ({
        ...(i.capture_group_id ? { capture_group_id: i.capture_group_id } : {}),
        via_name:     i.via_name.trim(),
        state:        i.state,
        observations: i.observations.trim() || undefined,
      }))

    if (payload.length === 0) return

    createReport.mutate(
      {
        monthly_log_id:       log.id,
        type,
        general_observations: generalObs.trim() || undefined,
        items:                payload,
      },
      { onSuccess: (report) => onDone(report.id) },
    )
  }

  const availableStates = STATES_BY_TYPE[type]

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
              Nuevo informe de vias
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
              {MONTHS[(log.month ?? 1) - 1]} {log.year} &middot; {log.field?.name}
            </p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={createReport.isPending || items.every((i) => !i.via_name.trim())}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
          style={{
            background: 'var(--color-primary)',
            color:      '#fff',
            opacity:    (createReport.isPending || items.every((i) => !i.via_name.trim())) ? 0.5 : 1,
          }}
        >
          {createReport.isPending && <Loader2 size={13} className="animate-spin" />}
          {createReport.isPending ? 'Creando...' : 'Crear informe'}
        </button>
      </div>

      {/* Report type */}
      <div
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text-700)' }}>Tipo de informe</p>
          {hasMonthlyReport && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: '#d1fae5', color: '#065f46' }}
            >
              Ya tiene informe mensual
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(['mensual', 'urgente'] as ViaReportType[]).map((t) => {
            if (t === 'mensual' && hasMonthlyReport) return null
            return (
              <button
                key={t}
                onClick={() => changeType(t)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: type === t ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color:      type === t ? '#fff'                  : 'var(--color-text-600)',
                }}
              >
                {t === 'mensual' ? 'Mensual' : 'Urgente'}
              </button>
            )
          })}
        </div>
      </div>

      {/* General observations */}
      <div
        className="rounded-xl p-4 flex flex-col gap-2"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
      >
        <label className="text-xs font-semibold" style={{ color: 'var(--color-text-700)' }}>
          Observaciones generales (opcional)
        </label>
        <textarea
          value={generalObs}
          onChange={(e) => setGeneralObs(e.target.value)}
          rows={3}
          placeholder="Estado general de las vias del mes..."
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-900)' }}
        />
      </div>

      {/* Items */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-400)' }}>
            Vias ({items.length})
          </p>
          <button
            onClick={() => setItems((prev) => [...prev, { ...newItem(), state: type === 'urgente' ? 'critico' : 'bueno' }])}

            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={12} /> Agregar via
          </button>
        </div>

        {items.map((item, idx) => (
          <div
            key={item.key}
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-400)' }}>Via {idx + 1}</span>
              {items.length > 1 && (
                <button
                  onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70"
                  style={{ color: 'var(--color-error, #ef4444)' }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* Capture group selector */}
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-600)' }}>
                Grupo de fotos (opcional)
              </p>
              {item.capture_thumb ? (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
                    <img src={item.capture_thumb} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text-700)' }}>Grupo asignado</span>
                    <button
                      onClick={() => updateItem(item.key, { capture_group_id: null, capture_thumb: null })}
                      className="text-xs underline text-left"
                      style={{ color: 'var(--color-error, #ef4444)' }}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCapturePanel(capturePanel === item.key ? null : item.key)}
                  disabled={groups.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                  style={{
                    background: 'var(--color-surface-1)',
                    border:     '1.5px dashed var(--color-border)',
                    color:      groups.length === 0 ? 'var(--color-text-400)' : 'var(--color-text-700)',
                    opacity:    groups.length === 0 ? 0.5 : 1,
                  }}
                >
                  <ImageIcon size={12} />
                  {groups.length === 0 ? 'Sin grupos en boveda' : 'Seleccionar de boveda'}
                </button>
              )}

              {/* Group picker */}
              {capturePanel === item.key && groups.length > 0 && (
                <div
                  className="mt-2 rounded-xl p-3 flex flex-col gap-2"
                  style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-600)' }}>
                      {groups.length} grupo{groups.length !== 1 ? 's' : ''}
                    </span>
                    <button onClick={() => setCapturePanel(null)}>
                      <X size={13} style={{ color: 'var(--color-text-400)' }} />
                    </button>
                  </div>

                  {groups.map((group) => {
                    const inDraft  = items.some((i) => i.key !== item.key && i.capture_group_id === group.id)
                    const inReport = usedGroupIds.has(group.id)
                    const disabled = inDraft || inReport
                    return (
                      <div
                        key={group.id}
                        className="flex items-center gap-3 rounded-lg p-2"
                        style={{ opacity: disabled ? 0.4 : 1 }}
                      >
                        {/* Thumbnail - click to preview */}
                        <button
                          onClick={() => {
                            setPreviewGroup(group)
                            setPreviewIdx(0)
                            setPreviewItemKey(item.key)
                          }}
                          className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative group/thumb"
                        >
                          <img src={group.images[0]?.url ?? ''} alt="" className="w-full h-full object-cover" />
                          <div
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            style={{ background: 'rgba(0,0,0,0.45)' }}
                          >
                            <Eye size={12} className="text-white" />
                          </div>
                        </button>

                        {/* Info - click to assign */}
                        <button
                          onClick={() => !disabled && assignGroup(item.key, group)}
                          disabled={disabled}
                          className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                        >
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                            {group.via_name ?? 'Sin nombre'}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin size={8} style={{ color: 'var(--color-text-400)' }} />
                            <span className="text-[9px] font-mono" style={{ color: 'var(--color-text-400)' }}>
                              {Number(group.lat).toFixed(4)}, {Number(group.lng).toFixed(4)}
                            </span>
                            <span className="text-[9px] ml-1" style={{ color: 'var(--color-text-400)' }}>
                              &middot; {group.images.length} foto{group.images.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </button>

                        {inDraft  && <span className="text-[9px] font-semibold shrink-0" style={{ color: 'var(--color-text-400)' }}>En uso</span>}
                        {inReport && <span className="text-[9px] font-semibold shrink-0" style={{ color: 'var(--color-text-400)' }}>Usado</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Via name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-600)' }}>
                Nombre de la via *
              </label>
              <input
                type="text"
                value={item.via_name}
                onChange={(e) => updateItem(item.key, { via_name: e.target.value })}
                placeholder="Ej: Via de acceso principal"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-900)' }}
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-600)' }}>
                Estado
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {availableStates.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateItem(item.key, { state: s })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: item.state === s ? VIA_STATE_COLORS[s] : 'var(--color-surface-1)',
                      color:      item.state === s ? '#fff'               : 'var(--color-text-600)',
                      border:     item.state === s ? 'none'               : '1px solid var(--color-border)',
                    }}
                  >
                    {item.state === s && <Check size={10} />}
                    {VIA_STATE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-600)' }}>
                Observaciones (opcional)
              </label>
              <input
                type="text"
                value={item.observations}
                onChange={(e) => updateItem(item.key, { observations: e.target.value })}
                placeholder="Detalles del estado de esta via..."
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-900)' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Group preview lightbox */}
      {previewGroup && (
        <ModalPortal onClose={() => setPreviewGroup(null)}>
          <div
            className="w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
            style={{ background: 'var(--color-surface-0)', maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-4 pt-4 pb-3 shrink-0">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
                  {previewGroup.via_name ?? 'Sin nombre'}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={9} style={{ color: 'var(--color-text-400)' }} />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-400)' }}>
                    {Number(previewGroup.lat).toFixed(5)}, {Number(previewGroup.lng).toFixed(5)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewGroup(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 shrink-0"
                style={{ color: 'var(--color-text-400)', background: 'var(--color-surface-2)' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Main image with nav arrows */}
            <div className="relative shrink-0 mx-4 rounded-xl overflow-hidden" style={{ aspectRatio: '4/3', background: 'var(--color-surface-2)' }}>
              <img
                src={previewGroup.images[previewIdx]?.url}
                alt=""
                className="w-full h-full object-cover"
              />
              {previewGroup.images.length > 1 && (
                <>
                  <button
                    onClick={() => setPreviewIdx((i) => (i - 1 + previewGroup.images.length) % previewGroup.images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPreviewIdx((i) => (i + 1) % previewGroup.images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </>
              )}
            </div>

            <p className="text-[10px] text-center mt-2 shrink-0" style={{ color: 'var(--color-text-400)' }}>
              {previewIdx + 1} / {previewGroup.images.length}
            </p>

            {/* Thumbnails */}
            {previewGroup.images.length > 1 && (
              <div className="flex gap-2 px-4 py-2 overflow-x-auto shrink-0">
                {previewGroup.images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setPreviewIdx(idx)}
                    className="shrink-0 rounded-lg overflow-hidden transition-all"
                    style={{
                      width: 48, height: 48,
                      outline:       previewIdx === idx ? '2px solid var(--color-primary)' : '2px solid transparent',
                      outlineOffset: 2,
                      opacity:       previewIdx === idx ? 1 : 0.55,
                    }}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Comment */}
            {previewGroup.comment && (
              <div
                className="mx-4 mt-2 px-3 py-2.5 rounded-xl shrink-0"
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-xs" style={{ color: 'var(--color-text-600)' }}>{previewGroup.comment}</p>
              </div>
            )}

            {/* Select button */}
            <div className="px-4 py-4 shrink-0">
              <button
                onClick={() => {
                  if (previewItemKey != null) assignGroup(previewItemKey, previewGroup)
                  setPreviewGroup(null)
                }}
                disabled={
                  previewItemKey == null ||
                  (usedGroupIds.has(previewGroup.id)) ||
                  items.some((i) => i.key !== previewItemKey && i.capture_group_id === previewGroup.id)
                }
                className="w-full py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: 'var(--color-primary)',
                  color: '#fff',
                  opacity: (
                    previewItemKey == null ||
                    (usedGroupIds.has(previewGroup.id)) ||
                    items.some((i) => i.key !== previewItemKey && i.capture_group_id === previewGroup.id)
                  ) ? 0.4 : 1,
                }}
              >
                Seleccionar grupo
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

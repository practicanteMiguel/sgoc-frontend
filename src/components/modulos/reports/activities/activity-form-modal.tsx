'use client'

import { useState, useRef, useMemo } from 'react'
import { X, Loader2, ImagePlus, Trash2, CheckCircle2, Images, Database, Eye } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useAddActivity, useUpdateActivity, useLog } from '@/src/hooks/activities/use-logbook'
import { useLogVault } from '@/src/hooks/activities/use-vault'
import type { Activity, VaultImage } from '@/src/types/activities.types'

interface Props {
  logId:    string
  activity?: Activity | null
  onClose:  () => void
}

type SlotKey = 'image_before' | 'image_during' | 'image_after'

const IMAGE_FIELDS: { key: SlotKey; label: string }[] = [
  { key: 'image_before', label: 'Antes'   },
  { key: 'image_during', label: 'Durante' },
  { key: 'image_after',  label: 'Despues' },
]
const SLOTS: SlotKey[] = ['image_before', 'image_during', 'image_after']
const VAULT_KEY: Record<SlotKey, string> = {
  image_before: 'vault_before',
  image_during: 'vault_during',
  image_after:  'vault_after',
}

const EMPTY_PREVIEWS = { image_before: null, image_during: null, image_after: null } as Record<SlotKey, string | null>
const EMPTY_FILES    = { image_before: null, image_during: null, image_after: null } as Record<SlotKey, File | null>
const EMPTY_VAULT    = { image_before: null, image_during: null, image_after: null } as Record<SlotKey, VaultImage | null>

function fmt(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function ActivityFormModal({ logId, activity, onClose }: Props) {
  const isEdit = !!activity

  const [description, setDescription] = useState(activity?.description ?? '')
  const [startDate,   setStartDate]   = useState(activity?.start_date   ?? '')
  const [endDate,     setEndDate]     = useState(activity?.end_date      ?? '')
  const [notes,       setNotes]       = useState(activity?.notes         ?? '')
  const [previews,    setPreviews]    = useState<Record<SlotKey, string | null>>({
    image_before: activity?.image_before ?? null,
    image_during: activity?.image_during ?? null,
    image_after:  activity?.image_after  ?? null,
  })
  const [vaultSlot,    setVaultSlot]    = useState<SlotKey | null>(null) // which slot is picking from vault
  const [vaultPanel,   setVaultPanel]   = useState(false)
  const [vaultAssigned, setVaultAssigned] = useState<Record<SlotKey, VaultImage | null>>({ ...EMPTY_VAULT })

  const files      = useRef<Record<SlotKey, File | null>>({ ...EMPTY_FILES })
  const dragSlot   = useRef<SlotKey | null>(null)
  const multiInput = useRef<HTMLInputElement>(null)

  const [created,  setCreated]  = useState<Activity[]>([])
  const [dragOver, setDragOver] = useState<SlotKey | null>(null)

  const addActivity    = useAddActivity()
  const updateActivity = useUpdateActivity()
  const isPending      = addActivity.isPending || updateActivity.isPending

  const { data: vaultImages = [], isLoading: loadingVault } = useLogVault(logId)
  const { data: log } = useLog(logId)
  const assignedVaultIds = new Set(
    SLOTS.map((s) => vaultAssigned[s]?.id).filter(Boolean) as string[]
  )

  const usedVaultUrls = useMemo(() => {
    const vaultUrlSet = new Set(vaultImages.map((v) => v.url))
    const urls = new Set<string>()
    for (const act of log?.activities ?? []) {
      if (isEdit && act.id === activity!.id) continue
      for (const k of SLOTS) {
        const url = act[k]
        if (url && vaultUrlSet.has(url)) urls.add(url)
      }
    }
    return urls
  }, [log, vaultImages, isEdit, activity])

  // ── Slot helpers ───────────────────────────────────────────────────────────

  function setSlot(key: SlotKey, file: File | null, previewUrl: string | null) {
    files.current[key] = file
    setPreviews((p) => ({ ...p, [key]: previewUrl }))
    // clear vault if setting a file
    if (file) setVaultAssigned((v) => ({ ...v, [key]: null }))
  }

  function handleFile(key: SlotKey, file: File | null) {
    if (file) {
      setSlot(key, file, URL.createObjectURL(file))
    } else {
      setSlot(key, null, activity ? (activity[key] ?? null) : null)
    }
  }

  function handleVaultPick(img: VaultImage) {
    if (!vaultSlot) return
    const current = vaultSlot
    files.current[current] = null
    setPreviews((p) => ({ ...p, [current]: null }))
    const newAssigned = { ...vaultAssigned, [current]: img }
    setVaultAssigned(newAssigned)

    const nextSlot = SLOTS.find(
      (s) => s !== current && !newAssigned[s] && !previews[s] && !files.current[s]
    )
    if (nextSlot) {
      setVaultSlot(nextSlot)
    } else {
      setVaultSlot(null)
      setVaultPanel(false)
    }
  }

  function clearSlot(key: SlotKey) {
    files.current[key] = null
    setPreviews((p) => ({ ...p, [key]: activity ? (activity[key] ?? null) : null }))
    setVaultAssigned((v) => ({ ...v, [key]: null }))
  }

  function openVaultFor(key: SlotKey) {
    setVaultSlot(key)
    setVaultPanel(true)
  }

  function handleMultiSelect(selectedFiles: FileList) {
    const picked = Array.from(selectedFiles).slice(0, 3)
    const emptySlots = SLOTS.filter((s) => !previews[s] && !files.current[s] && !vaultAssigned[s])
    const targetSlots = emptySlots.length >= picked.length ? emptySlots : SLOTS
    picked.forEach((file, i) => {
      const slot = targetSlots[i]
      if (slot) setSlot(slot, file, URL.createObjectURL(file))
    })
  }

  function handleDragStart(key: SlotKey) { dragSlot.current = key }
  function handleDrop(targetKey: SlotKey) {
    const sourceKey = dragSlot.current
    setDragOver(null)
    dragSlot.current = null
    if (!sourceKey || sourceKey === targetKey) return
    // only swap file slots
    if (vaultAssigned[sourceKey] || vaultAssigned[targetKey]) return

    const srcFile    = files.current[sourceKey]
    const tgtFile    = files.current[targetKey]
    const srcPreview = previews[sourceKey]
    const tgtPreview = previews[targetKey]
    files.current[sourceKey] = tgtFile
    files.current[targetKey] = srcFile
    setPreviews((p) => ({ ...p, [sourceKey]: tgtPreview, [targetKey]: srcPreview }))
  }

  function resetForm() {
    setDescription('')
    setStartDate('')
    setEndDate('')
    setNotes('')
    setPreviews({ ...EMPTY_PREVIEWS })
    setVaultAssigned({ ...EMPTY_VAULT })
    files.current = { ...EMPTY_FILES }
  }

  function handleSubmit() {
    if (!description.trim() || !startDate || !endDate) return
    const fd = new FormData()
    fd.append('description', description.trim())
    fd.append('start_date',  startDate)
    fd.append('end_date',    endDate)
    if (notes.trim()) fd.append('notes', notes.trim())

    for (const slot of SLOTS) {
      const vault = vaultAssigned[slot]
      const file  = files.current[slot]
      if (vault)      fd.append(VAULT_KEY[slot], vault.id)
      else if (file)  fd.append(slot, file)
    }

    if (isEdit) {
      updateActivity.mutate({ logId, activityId: activity!.id, data: fd }, { onSuccess: onClose })
    } else {
      addActivity.mutate({ logId, data: fd }, {
        onSuccess: (newActivity) => {
          setCreated((prev) => [...prev, newActivity])
          resetForm()
        },
      })
    }
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="flex items-start gap-3"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '92vh' }}
      >
        {/* ── Form modal ──────────────────────────────────────────────────── */}
        <div
          className="rounded-xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--color-surface-0)',
            border:     '1px solid var(--color-border)',
            boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
            maxHeight:  '92vh',
            width:      '512px',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div>
              <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-secundary)' }}>
                {isEdit ? 'Editar actividad' : 'Agregar actividades'}
              </h3>
              {!isEdit && created.length > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                  {created.length} actividad{created.length !== 1 ? 'es' : ''} agregada{created.length !== 1 ? 's' : ''} en esta sesion
                </p>
              )}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-all" style={{ color: 'var(--color-text-400)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

            {/* Session list */}
            {!isEdit && created.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                  <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-700)' }}>Agregadas esta sesion</span>
                </div>
                <div className="divide-y overflow-y-auto pb-4" style={{ ['--tw-divide-color' as any]: 'var(--color-border)', maxHeight: 140 }}>
                  {created.map((act, i) => (
                    <div key={act.id} className="flex items-start gap-3 px-3 py-2.5">
                      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{act.description}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                          {fmt(act.start_date)}{act.end_date !== act.start_date && ` - ${fmt(act.end_date)}`}
                          {act.notes && ` · ${act.notes}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-400)' }}>
                Descripcion <span style={{ color: 'var(--color-error, #ef4444)' }}>*</span>
              </label>
              <textarea
                autoFocus rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe la actividad realizada..."
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-900)' }}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Fecha inicio', value: startDate, set: setStartDate },
                { label: 'Fecha fin',    value: endDate,   set: setEndDate   },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-400)' }}>
                    {label} <span style={{ color: 'var(--color-error, #ef4444)' }}>*</span>
                  </label>
                  <input type="date" value={value} onChange={(e) => set(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-900)' }}
                  />
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-400)' }}>
                Notas / Observaciones
              </label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones adicionales..."
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-900)' }}
              />
            </div>

            {/* Images */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>
                  Imagenes de evidencia
                </label>
                <button type="button" onClick={() => multiInput.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium hover:opacity-70 transition-opacity"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
                >
                  <Images size={12} /> Cargar las 3
                </button>
                <input ref={multiInput} type="file" accept="image/*" multiple className="sr-only"
                  onChange={(e) => { if (e.target.files?.length) handleMultiSelect(e.target.files); e.target.value = '' }}
                />
              </div>
              <p className="text-[10px] mb-2.5" style={{ color: 'var(--color-text-400)' }}>
                Arrastra entre slots para reordenar &middot; usa Boveda para asignar fotos del equipo
              </p>

              <div className="grid grid-cols-3 gap-3">
                {IMAGE_FIELDS.map(({ key, label }) => {
                  const vault       = vaultAssigned[key]
                  const filePreview = previews[key]
                  const displayUrl  = vault?.url ?? filePreview
                  const isTarget    = dragOver === key
                  const isPickTarget = vaultSlot === key && vaultPanel

                  return (
                    <div key={key} className="flex flex-col gap-1.5">
                      <span className="text-xs text-center" style={{ color: isPickTarget ? 'var(--color-primary)' : 'var(--color-text-400)' }}>
                        {label}
                      </span>
                      <div
                        className="relative rounded-lg overflow-hidden group flex items-center justify-center"
                        draggable={!!filePreview && !vault}
                        onDragStart={() => handleDragStart(key)}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(key) }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={() => handleDrop(key)}
                        style={{
                          aspectRatio: '4/3',
                          background:  isPickTarget ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'var(--color-surface-1)',
                          border:      `1.5px ${isTarget || isPickTarget ? 'solid' : 'dashed'} ${isTarget || isPickTarget ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          cursor:      displayUrl && !vault ? 'grab' : 'default',
                          transition:  'border-color 0.15s',
                        }}
                      >
                        {displayUrl ? (
                          <>
                            <img src={displayUrl} alt={label} className="absolute inset-0 w-full h-full object-cover" />
                            {vault && (
                              <div className="absolute top-1 left-1 bg-black/60 rounded px-1 py-0.5">
                                <span className="text-[9px] font-semibold text-white">BOVEDA</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button type="button" onClick={() => clearSlot(key)}
                                className="w-7 h-7 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                            <label className="flex items-center justify-center cursor-pointer w-full h-full absolute inset-0">
                              <input type="file" accept="image/*" className="sr-only"
                                onChange={(e) => { const f = e.target.files?.[0] ?? null; handleFile(key, f); e.target.value = '' }}
                              />
                            </label>
                            <ImagePlus size={18} style={{ color: 'var(--color-text-400)' }} />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openVaultFor(key) }}
                              className="relative z-10 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-opacity hover:opacity-70"
                              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
                            >
                              <Database size={9} /> Boveda
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
            >
              {!isEdit && created.length > 0 ? 'Listo' : 'Cancelar'}
            </button>
            <button onClick={handleSubmit} disabled={!description.trim() || !startDate || !endDate || isPending}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
              style={{ background: 'var(--color-primary)', color: '#fff', opacity: (!description.trim() || !startDate || !endDate || isPending) ? 0.6 : 1 }}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Agregar actividad')}
            </button>
          </div>
        </div>

        {/* ── Vault side panel ────────────────────────────────────────────── */}
        {vaultPanel && (
          <div
            className="rounded-xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--color-surface-0)',
              border:     '1px solid var(--color-border)',
              boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
              width:      '300px',
              maxHeight:  '92vh',
            }}
          >
            {/* Vault header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <Database size={13} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text-700)' }}>Boveda de imagenes</p>
                  {vaultSlot && (
                    <p className="text-[10px]" style={{ color: 'var(--color-primary)' }}>
                      Asignando para: {IMAGE_FIELDS.find((f) => f.key === vaultSlot)?.label}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setVaultPanel(false); setVaultSlot(null) }}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-text-400)' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Vault body */}
            <div className="flex-1 overflow-y-auto p-3">
              {loadingVault ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                </div>
              ) : vaultImages.length === 0 ? (
                <div className="py-10 text-center px-3">
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                    No hay imagenes en la boveda.<br />
                    Pide al equipo que suba fotos desde el enlace de la boveda.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {vaultImages.map((img: VaultImage) => {
                    const used = usedVaultUrls.has(img.url) || assignedVaultIds.has(img.id)
                    return (
                      <div key={img.id} className="flex flex-col gap-1" style={{ opacity: used ? 0.45 : 1 }}>
                        <div
                          className={`relative rounded-lg overflow-hidden${used ? '' : ' group'}`}
                          style={{ aspectRatio: '4/3', cursor: !used && vaultSlot ? 'pointer' : 'default' }}
                          onClick={() => !used && vaultSlot && handleVaultPick(img)}
                        >
                          <img src={img.url} alt={img.original_name} className="w-full h-full object-cover" />
                          {used ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[9px] font-semibold text-white bg-black/60 rounded px-1.5 py-0.5">En uso</span>
                            </div>
                          ) : (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); window.open(img.url, '_blank') }}
                                className="w-7 h-7 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.9)' }}
                                title="Ver imagen completa"
                              >
                                <Eye size={13} style={{ color: '#1a3a3a' }} />
                              </button>
                              {vaultSlot && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleVaultPick(img) }}
                                  className="px-2 py-1 rounded-full text-[10px] font-semibold"
                                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                                >
                                  Usar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] truncate px-0.5 leading-tight" style={{ color: 'var(--color-text-400)' }}>
                          {img.original_name}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  )
}

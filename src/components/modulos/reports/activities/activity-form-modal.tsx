'use client'

import { useState, useRef } from 'react'
import { X, Loader2, ImagePlus, Trash2, CheckCircle2, Images } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useAddActivity, useUpdateActivity } from '@/src/hooks/activities/use-logbook'
import type { Activity } from '@/src/types/activities.types'

interface Props {
  logId:    string
  activity?: Activity | null
  onClose:  () => void
}

type SlotKey = 'image_before' | 'image_during' | 'image_after'

interface ImageField {
  key:   SlotKey
  label: string
}

const IMAGE_FIELDS: ImageField[] = [
  { key: 'image_before', label: 'Antes'   },
  { key: 'image_during', label: 'Durante' },
  { key: 'image_after',  label: 'Despues' },
]

const SLOTS: SlotKey[] = ['image_before', 'image_during', 'image_after']

function fmt(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

const EMPTY_PREVIEWS = { image_before: null, image_during: null, image_after: null } as Record<SlotKey, string | null>
const EMPTY_FILES    = { image_before: null, image_during: null, image_after: null } as Record<SlotKey, File | null>

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
  const files      = useRef<Record<SlotKey, File | null>>({ ...EMPTY_FILES })
  const dragSlot   = useRef<SlotKey | null>(null)
  const multiInput = useRef<HTMLInputElement>(null)

  const [created,   setCreated]   = useState<Activity[]>([])
  const [dragOver,  setDragOver]  = useState<SlotKey | null>(null)

  const addActivity    = useAddActivity()
  const updateActivity = useUpdateActivity()
  const isPending      = addActivity.isPending || updateActivity.isPending

  function setSlot(key: SlotKey, file: File | null, previewUrl: string | null) {
    files.current[key] = file
    setPreviews((p) => ({ ...p, [key]: previewUrl }))
  }

  function handleFile(key: SlotKey, file: File | null) {
    if (file) {
      setSlot(key, file, URL.createObjectURL(file))
    } else {
      setSlot(key, null, activity ? (activity[key] ?? null) : null)
    }
  }

  // Distribute multiple selected files into empty slots, then fill in order
  function handleMultiSelect(selectedFiles: FileList) {
    const picked = Array.from(selectedFiles).slice(0, 3)
    // Find slots that are empty first, then fill all in order
    const emptySlots = SLOTS.filter((s) => !previews[s] && !files.current[s])
    const targetSlots = emptySlots.length >= picked.length ? emptySlots : SLOTS

    picked.forEach((file, i) => {
      const slot = targetSlots[i]
      if (slot) setSlot(slot, file, URL.createObjectURL(file))
    })
  }

  // Drag-and-drop swap between slots
  function handleDragStart(key: SlotKey) {
    dragSlot.current = key
  }

  function handleDrop(targetKey: SlotKey) {
    const sourceKey = dragSlot.current
    setDragOver(null)
    dragSlot.current = null
    if (!sourceKey || sourceKey === targetKey) return

    // Swap files and previews
    const srcFile    = files.current[sourceKey]
    const tgtFile    = files.current[targetKey]
    const srcPreview = previews[sourceKey]
    const tgtPreview = previews[targetKey]

    files.current[sourceKey] = tgtFile
    files.current[targetKey] = srcFile
    setPreviews((p) => ({
      ...p,
      [sourceKey]: tgtPreview,
      [targetKey]: srcPreview,
    }))
  }

  function resetForm() {
    setDescription('')
    setStartDate('')
    setEndDate('')
    setNotes('')
    setPreviews({ ...EMPTY_PREVIEWS })
    files.current = { ...EMPTY_FILES }
  }

  function handleSubmit() {
    if (!description.trim() || !startDate || !endDate) return

    const fd = new FormData()
    fd.append('description', description.trim())
    fd.append('start_date',  startDate)
    fd.append('end_date',    endDate)
    if (notes.trim()) fd.append('notes', notes.trim())
    if (files.current.image_before) fd.append('image_before', files.current.image_before)
    if (files.current.image_during) fd.append('image_during', files.current.image_during)
    if (files.current.image_after)  fd.append('image_after',  files.current.image_after)

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
        className="w-full max-w-lg rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
          maxHeight:  '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
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
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-all"
            style={{ color: 'var(--color-text-400)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

          {/* Preview table of activities added this session */}
          {!isEdit && created.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <div
                className="px-3 py-2 flex items-center gap-2"
                style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}
              >
                <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text-700)' }}>
                  Agregadas esta sesion
                </span>
              </div>
              <div className="divide-y overflow-y-auto pb-4" style={{ ['--tw-divide-color' as any]: 'var(--color-border)', maxHeight: 140 }}>
                {created.map((act, i) => (
                  <div key={act.id} className="flex items-start gap-3 px-3 py-2.5">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                        {act.description}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                        {fmt(act.start_date)}
                        {act.end_date !== act.start_date && ` - ${fmt(act.end_date)}`}
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
              autoFocus
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la actividad realizada..."
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={{
                background: 'var(--color-surface-1)',
                border:     '1.5px solid var(--color-border)',
                color:      'var(--color-text-900)',
              }}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-400)' }}>
                Fecha inicio <span style={{ color: 'var(--color-error, #ef4444)' }}>*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  background: 'var(--color-surface-1)',
                  border:     '1.5px solid var(--color-border)',
                  color:      'var(--color-text-900)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-400)' }}>
                Fecha fin <span style={{ color: 'var(--color-error, #ef4444)' }}>*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  background: 'var(--color-surface-1)',
                  border:     '1.5px solid var(--color-border)',
                  color:      'var(--color-text-900)',
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-400)' }}>
              Notas / Observaciones
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones adicionales..."
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={{
                background: 'var(--color-surface-1)',
                border:     '1.5px solid var(--color-border)',
                color:      'var(--color-text-900)',
              }}
            />
          </div>

          {/* Images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>
                Imagenes de evidencia
              </label>
              <button
                type="button"
                onClick={() => multiInput.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium hover:opacity-70 transition-opacity"
                style={{
                  background: 'var(--color-surface-2)',
                  border:     '1px solid var(--color-border)',
                  color:      'var(--color-text-600)',
                }}
              >
                <Images size={12} />
                Cargar las 3
              </button>
              <input
                ref={multiInput}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) handleMultiSelect(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>
            <p className="text-[10px] mb-2.5" style={{ color: 'var(--color-text-400)' }}>
              Arrastra las imagenes entre los slots para reordenarlas
            </p>
            <div className="grid grid-cols-3 gap-3">
              {IMAGE_FIELDS.map(({ key, label }) => {
                const preview   = previews[key]
                const isTarget  = dragOver === key
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <span className="text-xs text-center" style={{ color: 'var(--color-text-400)' }}>
                      {label}
                    </span>
                    <div
                      className="relative rounded-lg overflow-hidden group flex items-center justify-center"
                      draggable={!!preview}
                      onDragStart={() => handleDragStart(key)}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(key) }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => handleDrop(key)}
                      style={{
                        aspectRatio: '4/3',
                        background:  'var(--color-surface-1)',
                        border:      `1.5px ${isTarget ? 'solid' : 'dashed'} ${isTarget ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        cursor:      preview ? 'grab' : 'default',
                        transition:  'border-color 0.15s',
                      }}
                    >
                      {preview ? (
                        <>
                          <img src={preview} alt={label} className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleFile(key, null)}
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                          <ImagePlus size={20} style={{ color: 'var(--color-text-400)' }} />
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null
                              handleFile(key, f)
                              e.target.value = ''
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
            style={{
              background: 'var(--color-surface-2)',
              border:     '1px solid var(--color-border)',
              color:      'var(--color-text-600)',
            }}
          >
            {!isEdit && created.length > 0 ? 'Listo' : 'Cancelar'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || !startDate || !endDate || isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: 'var(--color-primary)',
              color:      '#fff',
              opacity:    (!description.trim() || !startDate || !endDate || isPending) ? 0.6 : 1,
            }}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Agregar actividad')}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

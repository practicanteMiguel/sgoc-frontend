import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { useUploadEvidences } from '@/src/hooks/compliance/use-evidences'
import type { EvidenceCategory } from '@/src/types/compliance.types'

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const CATEGORIES: { value: EvidenceCategory; label: string }[] = [
  { value: 'ausentismo',  label: 'Ausentismo'        },
  { value: 'ley_50',      label: 'Ley 50'            },
  { value: 'dia_familia', label: 'Dia de la Familia' },
  { value: 'horas_extra', label: 'Horas Extra'       },
  { value: 'cronograma',  label: 'Cronograma'        },
  { value: 'general',     label: 'General'           },
]

const NOW = new Date()
const YEARS = Array.from({ length: 4 }, (_, i) => NOW.getFullYear() - 1 + i)

interface Props {
  fieldId: string
  defaultAnio?: number
  defaultMes?: number
  onSuccess?: () => void
}

export function EvidenceUploader({ fieldId, defaultAnio, defaultMes, onSuccess }: Props) {
  const [files, setFiles]       = useState<File[]>([])
  const [anio, setAnio]         = useState<number | ''>(defaultAnio ?? '')
  const [mes, setMes]           = useState<number | ''>(defaultMes ?? '')
  const [category, setCategory] = useState<EvidenceCategory | ''>('')
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const upload   = useUploadEvidences()

  function handleFiles(list: FileList | null) {
    if (!list) return
    const incoming = Array.from(list)
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      return [...prev, ...incoming.filter((f) => !existing.has(f.name))]
    })
  }

  async function handleSubmit() {
    if (files.length === 0) return
    setProgress(0)
    try {
      await upload.mutateAsync({
        files,
        field_id: fieldId,
        anio: anio !== '' ? anio : undefined,
        mes:  mes  !== '' ? mes  : undefined,
        category: category !== '' ? category : undefined,
        onUploadProgress: setProgress,
      })
      setFiles([])
      onSuccess?.()
    } catch {
      setProgress(0)
    }
  }

  const destino = [
    'Planta',
    anio !== '' ? String(anio) : null,
    mes  !== '' ? `${String(mes).padStart(2, '0')} - ${MONTHS[Number(mes) - 1]}` : null,
    category !== '' ? (CATEGORIES.find((c) => c.value === category)?.label ?? null) : null,
  ].filter(Boolean).join(' / ')

  return (
    <div
      className="rounded-xl flex flex-col gap-3 p-4"
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      {/* Drop zone */}
      <div
        className="rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer py-6 px-4"
        style={{ border: '2px dashed var(--color-border)', background: 'var(--color-surface-0)' }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      >
        <Upload size={18} style={{ color: 'var(--color-text-400)' }} />
        <p className="text-xs text-center" style={{ color: 'var(--color-text-400)' }}>
          Arrastra archivos aqui o{' '}
          <span style={{ color: 'var(--color-secondary)' }}>seleccionalos</span>
          <br />
          <span style={{ fontSize: 10 }}>Max 20 archivos - 20 MB c/u</span>
        </p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div className="flex flex-col gap-1">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
            >
              <span className="text-xs truncate" style={{ color: 'var(--color-text-700)', maxWidth: '85%' }}>{f.name}</span>
              <button
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                style={{ color: 'var(--color-text-400)', flexShrink: 0 }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selectors row */}
      <div className="flex flex-wrap gap-2">
        <select
          value={anio}
          onChange={(e) => { setAnio(e.target.value ? Number(e.target.value) : ''); setMes(''); setCategory('') }}
          className="rounded-lg px-3 py-1.5 text-xs"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
        >
          <option value="">Año (opcional)</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        {anio !== '' && (
          <select
            value={mes}
            onChange={(e) => { setMes(e.target.value ? Number(e.target.value) : ''); setCategory('') }}
            className="rounded-lg px-3 py-1.5 text-xs"
            style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
          >
            <option value="">Mes (opcional)</option>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        )}

        {mes !== '' && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as EvidenceCategory | '')}
            className="rounded-lg px-3 py-1.5 text-xs"
            style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
          >
            <option value="">Categoria (opcional)</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        )}
      </div>

      {/* Destination path preview */}
      <p className="text-xs" style={{ color: 'var(--color-text-400)', fontFamily: 'monospace' }}>
        Destino: {destino}
      </p>

      {/* Submit / Progress */}
      {upload.isPending ? (
        <div className="flex flex-col gap-2 px-1">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--color-text-600)' }}>
              Subiendo {files.length} archivo{files.length !== 1 ? 's' : ''}...
            </span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-secondary)' }}>
              {progress}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${progress}%`, background: 'var(--color-secondary)' }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={files.length === 0}
          className="flex items-center justify-center gap-2 rounded-xl py-2 px-4 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--color-secondary)', color: '#fff' }}
        >
          <Upload size={13} />
          Subir {files.length > 0 ? `${files.length} archivo${files.length !== 1 ? 's' : ''}` : 'archivos'}
        </button>
      )}
    </div>
  )
}

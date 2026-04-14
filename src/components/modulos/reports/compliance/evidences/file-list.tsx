import { Loader2, ExternalLink, Trash2, FolderOpen, Folder } from 'lucide-react'
import { useEvidences, useDeleteEvidence } from '@/src/hooks/compliance/use-evidences'
import type { Evidence, EvidenceCategory } from '@/src/types/compliance.types'

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  ausentismo:  'Ausentismo',
  ley_50:      'Ley 50',
  dia_familia: 'Dia de la Familia',
  horas_extra: 'Horas Extra',
  cronograma:  'Cronograma',
  general:     'General',
}

// ── Extension styles ──────────────────────────────────────────────
function extStyle(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf')
    return { border: '#fca5a5', icon: '#dc2626', badge: '#fee2e2', label: 'PDF' }
  if (['doc', 'docx'].includes(ext))
    return { border: '#93c5fd', icon: '#2563eb', badge: '#dbeafe', label: ext.toUpperCase() }
  if (['xls', 'xlsx', 'csv'].includes(ext))
    return { border: '#86efac', icon: '#16a34a', badge: '#dcfce7', label: ext.toUpperCase() }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext))
    return { border: '#d1d5db', icon: '#6b7280', badge: '#f3f4f6', label: ext.toUpperCase() }
  if (['ppt', 'pptx'].includes(ext))
    return { border: '#fdba74', icon: '#ea580c', badge: '#ffedd5', label: ext.toUpperCase() }
  if (['zip', 'rar', '7z'].includes(ext))
    return { border: '#d8b4fe', icon: '#9333ea', badge: '#f3e8ff', label: ext.toUpperCase() }
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext))
    return { border: '#a5b4fc', icon: '#4f46e5', badge: '#e0e7ff', label: ext.toUpperCase() }
  return { border: 'var(--color-border)', icon: 'var(--color-text-400)', badge: 'var(--color-surface-2)', label: ext.toUpperCase() || 'FILE' }
}

// ── Level detection ───────────────────────────────────────────────
function splitLevel(
  evidences: Evidence[],
  anio?: number,
  mes?: number,
  category?: EvidenceCategory,
) {
  if (!anio) {
    // Root level: files with no year, + year folders
    const files   = evidences.filter((e) => e.anio === null)
    const years   = [...new Set(evidences.filter((e) => e.anio !== null).map((e) => e.anio as number))].sort((a, b) => a - b)
    return { files, years, months: [] as number[], categories: [] as EvidenceCategory[] }
  }
  if (!mes) {
    // Year level: files with no month, + month folders
    const files   = evidences.filter((e) => e.mes === null)
    const months  = [...new Set(evidences.filter((e) => e.mes !== null).map((e) => e.mes as number))].sort((a, b) => a - b)
    return { files, years: [] as number[], months, categories: [] as EvidenceCategory[] }
  }
  if (!category) {
    // Month level: files with no category, + category folders
    const files      = evidences.filter((e) => e.category === null)
    const categories = [...new Set(evidences.filter((e) => e.category !== null).map((e) => e.category as EvidenceCategory))]
    return { files, years: [] as number[], months: [] as number[], categories }
  }
  // Category level: all files, no folders
  return { files: evidences, years: [] as number[], months: [] as number[], categories: [] as EvidenceCategory[] }
}

// ── Sub-item counts ───────────────────────────────────────────────
function countForYear(evidences: Evidence[], y: number)                    { return evidences.filter((e) => e.anio === y).length }
function countForMonth(evidences: Evidence[], m: number)                   { return evidences.filter((e) => e.mes === m).length }
function countForCat(evidences: Evidence[], cat: EvidenceCategory)         { return evidences.filter((e) => e.category === cat).length }

// ── Props ─────────────────────────────────────────────────────────
interface Props {
  fieldId?: string
  anio?: number
  mes?: number
  category?: EvidenceCategory
  canDelete?: boolean
  onSelectAnio?:     (y: number) => void
  onSelectMes?:      (m: number) => void
  onSelectCategory?: (c: EvidenceCategory) => void
}

export function EvidenceFileList({
  fieldId, anio, mes, category, canDelete,
  onSelectAnio, onSelectMes, onSelectCategory,
}: Props) {
  const { data: evidences, isLoading } = useEvidences({ field_id: fieldId, anio, mes, category })
  const del = useDeleteEvidence()

  if (!fieldId) return null

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
      </div>
    )
  }

  if (!evidences || evidences.length === 0) {
    return (
      <div
        className="flex flex-col items-center py-10 rounded-xl"
        style={{ background: 'var(--color-surface-1)', border: '1px dashed var(--color-border)' }}
      >
        <FolderOpen size={20} className="mb-2" style={{ color: 'var(--color-text-400)' }} />
        <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin evidencias para este filtro</p>
      </div>
    )
  }

  const { files, years, months, categories } = splitLevel(evidences, anio, mes, category)

  const hasContent = files.length + years.length + months.length + categories.length > 0

  if (!hasContent) {
    return (
      <div
        className="flex flex-col items-center py-10 rounded-xl"
        style={{ background: 'var(--color-surface-1)', border: '1px dashed var(--color-border)' }}
      >
        <FolderOpen size={20} className="mb-2" style={{ color: 'var(--color-text-400)' }} />
        <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin evidencias para este filtro</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

      {/* ── Year folders ── */}
      {years.map((y) => (
        <button
          key={y}
          onClick={() => onSelectAnio?.(y)}
          className="flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:opacity-75"
          style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
        >
          <Folder size={28} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>{y}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {countForYear(evidences, y)} elemento{countForYear(evidences, y) !== 1 ? 's' : ''}
            </p>
          </div>
        </button>
      ))}

      {/* ── Month folders ── */}
      {months.map((m) => (
        <button
          key={m}
          onClick={() => onSelectMes?.(m)}
          className="flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:opacity-75"
          style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
        >
          <Folder size={28} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>{MONTH_NAMES[m - 1]}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {countForMonth(evidences, m)} elemento{countForMonth(evidences, m) !== 1 ? 's' : ''}
            </p>
          </div>
        </button>
      ))}

      {/* ── Category folders ── */}
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelectCategory?.(cat)}
          className="flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:opacity-75"
          style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
        >
          <Folder size={28} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>{CATEGORY_LABELS[cat]}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {countForCat(evidences, cat)} elemento{countForCat(evidences, cat) !== 1 ? 's' : ''}
            </p>
          </div>
        </button>
      ))}

      {/* ── File cards ── */}
      {files.map((ev) => {
        const s = extStyle(ev.file_name)
        const dateLabel =
          ev.anio && ev.mes
            ? `${MONTH_NAMES[ev.mes - 1]} ${ev.anio}`
            : ev.anio ? String(ev.anio) : null

        return (
          <div
            key={ev.id}
            className="flex flex-col rounded-xl overflow-hidden"
            style={{ border: `1px solid ${s.border}` }}
          >
            {/* Color strip + extension badge */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ background: s.badge }}
            >
              <span
                className="text-xs font-bold tracking-wide"
                style={{ color: s.icon }}
              >
                {s.label}
              </span>
              <div className="flex items-center gap-1">
                <a
                  href={ev.drive_web_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 rounded flex items-center justify-center hover:opacity-70 transition-opacity"
                  style={{ color: s.icon }}
                  title="Abrir en Drive"
                >
                  <ExternalLink size={12} />
                </a>
                {canDelete && (
                  <button
                    onClick={() => del.mutate(ev.id)}
                    disabled={del.isPending}
                    className="w-6 h-6 rounded flex items-center justify-center hover:opacity-70 transition-opacity disabled:opacity-40"
                    style={{ color: '#dc2626' }}
                    title="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* File info */}
            <div className="px-3 py-2.5" style={{ background: 'var(--color-surface-0)' }}>
              <p
                className="text-xs font-medium truncate mb-1"
                style={{ color: 'var(--color-text-900)' }}
                title={ev.file_name}
              >
                {ev.file_name}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-400)' }}>
                {[
                  dateLabel,
                  ev.category ? CATEGORY_LABELS[ev.category] : null,
                  `${ev.uploaded_by.first_name} ${ev.uploaded_by.last_name}`,
                  new Date(ev.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

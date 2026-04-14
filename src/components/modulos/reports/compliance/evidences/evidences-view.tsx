'use client'

import { useState } from 'react'
import { Plus, ChevronUp, ChevronLeft } from 'lucide-react'
import { EvidenceUploader } from './uploader'
import { EvidenceFileList } from './file-list'
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
  canDelete?: boolean
}

export function EvidencesView({ fieldId, defaultAnio, defaultMes, canDelete = false }: Props) {
  const [showUploader, setShowUploader] = useState(false)
  const [filterAnio, setFilterAnio]     = useState<number | undefined>(defaultAnio)
  const [filterMes, setFilterMes]       = useState<number | undefined>(defaultMes)
  const [filterCat, setFilterCat]       = useState<EvidenceCategory | undefined>()

  function goBack() {
    if (filterCat !== undefined)          { setFilterCat(undefined); return }
    if (filterMes !== undefined)          { setFilterMes(undefined); setFilterCat(undefined); return }
    if (filterAnio !== undefined)         { setFilterAnio(undefined); setFilterMes(undefined); setFilterCat(undefined) }
  }

  const canGoBack = filterAnio !== undefined

  return (
    <div className="flex flex-col gap-4">
      {/* Filters + upload button row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {canGoBack && (
            <button
              onClick={goBack}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
              title="Volver atras"
            >
              <ChevronLeft size={14} />
            </button>
          )}
          <select
            value={filterAnio ?? ''}
            onChange={(e) => {
              setFilterAnio(e.target.value ? Number(e.target.value) : undefined)
              setFilterMes(undefined)
              setFilterCat(undefined)
            }}
            className="rounded-lg px-3 py-1.5 text-xs"
            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
          >
            <option value="">Todos los años</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          {filterAnio !== undefined && (
            <select
              value={filterMes ?? ''}
              onChange={(e) => {
                setFilterMes(e.target.value ? Number(e.target.value) : undefined)
                setFilterCat(undefined)
              }}
              className="rounded-lg px-3 py-1.5 text-xs"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
            >
              <option value="">Todos los meses</option>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          )}

          {filterMes !== undefined && (
            <select
              value={filterCat ?? ''}
              onChange={(e) => setFilterCat((e.target.value as EvidenceCategory) || undefined)}
              className="rounded-lg px-3 py-1.5 text-xs"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
            >
              <option value="">Todas las categorias</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          )}
        </div>

        <button
          onClick={() => setShowUploader((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{
            background: showUploader ? 'var(--color-surface-2)' : 'var(--color-secondary)',
            color: showUploader ? 'var(--color-text-600)' : '#fff',
          }}
        >
          {showUploader ? <ChevronUp size={13} /> : <Plus size={13} />}
          {showUploader ? 'Cancelar' : 'Subir archivos'}
        </button>
      </div>

      {/* Uploader (collapsible) */}
      {showUploader && (
        <EvidenceUploader
          fieldId={fieldId}
          defaultAnio={filterAnio ?? defaultAnio}
          defaultMes={filterMes ?? defaultMes}
          onSuccess={() => setShowUploader(false)}
        />
      )}

      {/* File list */}
      <EvidenceFileList
        fieldId={fieldId}
        anio={filterAnio}
        mes={filterMes}
        category={filterCat}
        canDelete={canDelete}
        onSelectAnio={(y) => { setFilterAnio(y); setFilterMes(undefined); setFilterCat(undefined) }}
        onSelectMes={(m) => { setFilterMes(m); setFilterCat(undefined) }}
        onSelectCategory={(c) => setFilterCat(c)}
      />
    </div>
  )
}

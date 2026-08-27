'use client'

import { useState } from 'react'
import { Search, Loader2, Plus, Trash2, ChevronLeft, ChevronRight, Wrench } from 'lucide-react'
import { useHerramientas, useDeleteHerramienta } from '@/src/hooks/herramientas/use-herramientas'
import { useDebouncedValue } from '@/src/hooks/use-debounced-value'
import { usePermissions } from '@/src/hooks/auth/use-permissions'
import { formatCOP } from '@/src/lib/utils'
import { HerramientaModal } from './herramienta-modal'
import { CATEGORIAS_HERRAMIENTA, CATEGORIA_HERRAMIENTA_LABELS } from '@/src/types/herramientas.types'
import type { Herramienta, CategoriaHerramienta } from '@/src/types/herramientas.types'

export function HerramientasTab() {
  const { canCreate, canEdit, canDelete } = usePermissions('tools')

  const [categoria,    setCategoria]    = useState<CategoriaHerramienta | ''>('')
  const [search,       setSearch]       = useState('')
  const [activoFilter, setActivoFilter] = useState<boolean | undefined>(undefined)
  const [page,         setPage]         = useState(1)
  const [showNuevo,    setShowNuevo]    = useState(false)
  const [editItem,     setEditItem]     = useState<Herramienta | null>(null)

  function resetPage() { setPage(1) }

  // El texto tipeado se debounce antes de ir al backend: sin esto, cada
  // tecla dispara un GET nuevo y con busquedas largas se agota el limite
  // de peticiones por minuto.
  const debouncedSearch = useDebouncedValue(search, 400)

  const { data, isLoading } = useHerramientas({
    categoria: categoria || undefined,
    search:    debouncedSearch || undefined,
    activo:    activoFilter,
    page,
  })
  const eliminar = useDeleteHerramienta()

  const herramientas = data?.data  ?? []
  const total        = data?.total ?? 0
  const pages        = data?.pages ?? 1

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-400)' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage() }}
            placeholder="Buscar por descripcion..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
          />
        </div>

        <select
          value={categoria}
          onChange={(e) => { setCategoria(e.target.value as CategoriaHerramienta | ''); resetPage() }}
          className="px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', minWidth: 160 }}
        >
          <option value="">Todas las categorias</option>
          {CATEGORIAS_HERRAMIENTA.map((c) => <option key={c} value={c}>{CATEGORIA_HERRAMIENTA_LABELS[c]}</option>)}
        </select>

        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          {([undefined, true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => { setActivoFilter(val); resetPage() }}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={
                activoFilter === val
                  ? { background: 'var(--color-surface-0)', color: 'var(--color-primary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                  : { color: 'var(--color-text-400)' }
              }
            >
              {val === undefined ? 'Todos' : val ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>

        {canCreate && (
          <button
            onClick={() => setShowNuevo(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={15} /> Nueva herramienta
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : herramientas.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <Wrench size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
            {search.trim() ? 'Sin resultados' : 'Sin herramientas en el catalogo'}
          </p>
          {!search.trim() && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>Agrega la primera herramienta al catalogo</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Codigo', 'Categoria', 'Descripcion', 'Marca/Modelo', 'Unidad', 'Valor Unitario', 'Estado', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--color-text-400)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {herramientas.map((h) => (
                  <tr
                    key={h.id}
                    className={canEdit ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
                    style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}
                    onClick={() => canEdit && setEditItem(h)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--color-text-600)' }}>{h.codigo}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}>
                        {CATEGORIA_HERRAMIENTA_LABELS[h.categoria]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium max-w-64 truncate" style={{ color: 'var(--color-text-900)' }}>{h.descripcion}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-600)' }}>{h.marca_modelo || '-'}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{h.unidad}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-right whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>
                      {h.valor_unitario != null ? formatCOP(h.valor_unitario) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={h.activo
                          ? { background: '#16a34a22', color: '#16a34a' }
                          : { background: '#6b728022', color: '#6b7280' }}>
                        {h.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm('Eliminar esta herramienta?')) eliminar.mutate(h.id) }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                          title="Eliminar"
                          style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{total} herramienta{total !== 1 ? 's' : ''}</span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-600)', opacity: page === 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-600)' }}>{page} / {pages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-600)', opacity: page === pages ? 0.4 : 1 }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showNuevo && <HerramientaModal onClose={() => setShowNuevo(false)} />}
      {editItem  && <HerramientaModal item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}

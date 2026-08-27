'use client'

import { useState } from 'react'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useCreateHerramienta, useUpdateHerramienta } from '@/src/hooks/herramientas/use-herramientas'
import { CATEGORIAS_HERRAMIENTA, CATEGORIA_HERRAMIENTA_LABELS } from '@/src/types/herramientas.types'
import type { Herramienta, CategoriaHerramienta } from '@/src/types/herramientas.types'

const INP: React.CSSProperties = {
  border:       '1.5px solid var(--color-border)',
  background:   'var(--color-surface-0)',
  color:        'var(--color-text-900)',
  borderRadius: 8,
  padding:      '6px 10px',
  fontSize:     12,
  outline:      'none',
  width:        '100%',
}

export function HerramientaModal({ item, onClose }: { item?: Herramienta; onClose: () => void }) {
  const crear  = useCreateHerramienta()
  const editar = useUpdateHerramienta()
  const isEdit = !!item

  const [categoria,    setCategoria]    = useState<CategoriaHerramienta>(item?.categoria ?? 'MANUAL')
  const [descripcion,  setDescripcion]  = useState(item?.descripcion ?? '')
  const [marcaModelo,  setMarcaModelo]  = useState(item?.marca_modelo ?? '')
  const [unidad,       setUnidad]       = useState(item?.unidad ?? 'UND')
  const [valor,        setValor]        = useState(item?.valor_unitario != null ? String(item.valor_unitario) : '')
  const [activo,       setActivo]       = useState(item?.activo ?? true)

  const isPending = crear.isPending || editar.isPending

  function submit() {
    if (!descripcion.trim()) return
    const payload = {
      categoria,
      descripcion:    descripcion.trim(),
      marca_modelo:   marcaModelo.trim() || null,
      unidad:         unidad.trim() || 'UND',
      valor_unitario: valor ? parseFloat(valor) : null,
    }
    if (isEdit) {
      editar.mutate({ id: item!.id, ...payload, activo }, { onSuccess: onClose })
    } else {
      crear.mutate(payload, { onSuccess: onClose })
    }
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
            {isEdit ? 'Editar herramienta' : 'Nueva herramienta'}
          </p>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {isEdit && (
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Codigo</label>
                <input value={item!.codigo} disabled style={{ ...INP, opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
            )}
            <div className={isEdit ? '' : 'col-span-2'}>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Categoria *</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaHerramienta)} style={{ ...INP, appearance: 'none' as const }}>
                {CATEGORIAS_HERRAMIENTA.map(c => (
                  <option key={c} value={c}>{CATEGORIA_HERRAMIENTA_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Descripcion *</label>
              <input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej. Llave de tubo 14 pulgadas" style={INP} />
            </div>
            <div className="col-span-2">
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Marca / Modelo</label>
              <input value={marcaModelo} onChange={e => setMarcaModelo(e.target.value)} placeholder="Opcional" style={INP} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Unidad</label>
              <input value={unidad} onChange={e => setUnidad(e.target.value)} placeholder="UND" style={INP} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Valor unitario</label>
              <input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0" min="0" style={INP} />
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <div
                onClick={() => setActivo(v => !v)}
                className="w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer"
                style={{ background: activo ? 'var(--color-primary)' : 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                  style={{ background: '#fff', transform: activo ? 'translateX(16px)' : 'translateX(2px)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-700)' }}>
                {activo ? 'Activo' : 'Inactivo'}
              </span>
            </label>
          )}
        </div>

        <div className="px-5 py-4 flex gap-3 justify-end shrink-0"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={isPending || !descripcion.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: 'var(--color-primary)', color: '#fff', opacity: isPending || !descripcion.trim() ? 0.6 : 1 }}>
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {isPending ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear herramienta')}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

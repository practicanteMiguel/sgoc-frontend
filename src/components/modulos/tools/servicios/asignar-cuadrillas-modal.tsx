'use client'

import { useState } from 'react'
import { X, Loader2, Search, CheckCircle2, Users } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useFields } from '@/src/hooks/reports/use-fields'
import { useCuadrillasDisponibles, useAsignarCuadrillas } from '@/src/hooks/servicios/use-servicios'
import type { Servicio } from '@/src/types/servicios.types'

const INP: React.CSSProperties = {
  border:       '1.5px solid var(--color-border)',
  background:   'var(--color-surface-0)',
  color:        'var(--color-text-900)',
  borderRadius: 8,
  padding:      '6px 10px 6px 30px',
  fontSize:     12,
  outline:      'none',
  width:        '100%',
}

export function AsignarCuadrillasModal({ servicio, onClose }: { servicio: Servicio; onClose: () => void }) {
  const [fieldId, setFieldId] = useState('')
  const [search,  setSearch]  = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: fieldsData }      = useFields()
  const { data: cuadrillas = [], isLoading } = useCuadrillasDisponibles(fieldId || undefined)
  const asignar = useAsignarCuadrillas()

  const fields = fieldsData?.data ?? []

  const filtered = cuadrillas
    .filter(c => c.servicio_id !== servicio.id)
    .filter(c => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return c.name.toLowerCase().includes(q) || c.field.name.toLowerCase().includes(q)
    })

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function submit() {
    if (selected.size === 0) return
    asignar.mutate({ servicioId: servicio.id, crewIds: Array.from(selected) }, { onSuccess: onClose })
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Asignar cuadrillas</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{servicio.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 flex gap-2 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-400)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cuadrilla..." style={INP} />
          </div>
          <select
            value={fieldId}
            onChange={e => setFieldId(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
            style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', minWidth: 140 }}
          >
            <option value="">Todos los campos</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-1.5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Users size={24} style={{ color: 'var(--color-text-400)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>No hay cuadrillas disponibles</p>
            </div>
          ) : (
            filtered.map(c => {
              const isSelected = selected.has(c.id)
              const yaEnOtro    = c.servicio_id && c.servicio
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className="flex items-center gap-3 p-3 rounded-lg text-left transition-all w-full"
                  style={{
                    background: isSelected ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'var(--color-surface-1)',
                    border:     `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{c.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>
                      {c.field.name}
                      {yaEnOtro && (
                        <span style={{ color: '#d97706' }}> &middot; ya en {c.servicio!.nombre}</span>
                      )}
                    </p>
                  </div>
                  {isSelected && <CheckCircle2 size={16} className="shrink-0" style={{ color: 'var(--color-primary)' }} />}
                </button>
              )
            })
          )}
        </div>

        <div className="px-5 py-4 flex gap-3 justify-end shrink-0"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={asignar.isPending || selected.size === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: 'var(--color-primary)', color: '#fff', opacity: asignar.isPending || selected.size === 0 ? 0.6 : 1 }}>
            {asignar.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {asignar.isPending ? 'Asignando...' : `Asignar ${selected.size || ''} cuadrilla${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

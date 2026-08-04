'use client'

import { useState } from 'react'
import { Loader2, Search, Ruler, X, CheckCircle2 } from 'lucide-react'
import { useMyDotacionSpace, useDotacionEmpleadosByToken } from '@/src/hooks/dotaciones/use-dotaciones'
import { useTallasEmpleado, useUpsertTallaEmpleado } from '@/src/hooks/dotaciones/use-indumentaria'
import type { EmpleadoRepo } from '@/src/types/dotaciones.types'
import type { TallaCategoria } from '@/src/types/indumentaria.types'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { TallaPicker, inferTipoTalla, type TipoTalla } from './entrega-shared'

function EditarTallasModal({ empleado, onClose }: { empleado: EmpleadoRepo; onClose: () => void }) {
  const { data: rows = [], isLoading } = useTallasEmpleado(empleado.id)
  const upsert = useUpsertTallaEmpleado()
  const [draft, setDraft] = useState<Record<string, { tipoTalla: TipoTalla; talla: string }>>({})

  function valorActual(categoria: TallaCategoria, tallaGuardada: string | null) {
    return draft[categoria] ?? { tipoTalla: inferTipoTalla(tallaGuardada ?? ''), talla: tallaGuardada ?? '' }
  }

  function setValor(categoria: TallaCategoria, next: { tipoTalla: TipoTalla; talla: string }) {
    setDraft(prev => ({ ...prev, [categoria]: next }))
  }

  function guardar(categoria: TallaCategoria) {
    const valor = draft[categoria]
    if (!valor) return
    upsert.mutate({ empleadoId: empleado.id, categoria, talla: valor.talla || null })
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
              {empleado.first_name} {empleado.last_name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{empleado.position}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : (
            rows.map(row => {
              const valor = valorActual(row.categoria, row.talla)
              return (
                <div key={row.categoria} className="rounded-xl p-3 flex items-center gap-2 flex-wrap"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                  <span className="text-sm font-medium flex-1 min-w-24" style={{ color: 'var(--color-text-900)' }}>{row.label}</span>
                  <TallaPicker
                    tipoTalla={valor.tipoTalla}
                    talla={valor.talla}
                    onChangeTipo={t => setValor(row.categoria, { tipoTalla: t, talla: '' })}
                    onChangeTalla={v => setValor(row.categoria, { ...valor, talla: v })}
                  />
                  <button
                    onClick={() => guardar(row.categoria)}
                    disabled={upsert.isPending || !draft[row.categoria]}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
                    style={{ background: '#1a3a3a', color: '#fff', opacity: !draft[row.categoria] ? 0.5 : 1 }}
                  >
                    <CheckCircle2 size={12} /> Guardar
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

export function TallasEmpleadosTab() {
  const { data: space } = useMyDotacionSpace()
  const { data: empleados = [], isLoading } = useDotacionEmpleadosByToken(space?.vault_token ?? null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<EmpleadoRepo | null>(null)

  const filtrados = empleados.filter(e =>
    !search.trim() || `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-fit">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-400)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar empleado..."
          className="pl-8 pr-3 py-2 text-xs rounded-lg outline-none"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', minWidth: 220 }}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-14">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface-1)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-700)' }}>Sin empleados para mostrar</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map(emp => (
            <div key={emp.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>{emp.first_name} {emp.last_name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{emp.position}</p>
              </div>
              <button
                onClick={() => setSelected(emp)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
              >
                <Ruler size={13} /> Tallas
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && <EditarTallasModal empleado={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { X, Loader2, AlertTriangle, PackagePlus, CheckCircle2 } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useHerramientas } from '@/src/hooks/herramientas/use-herramientas'
import { useCrearSolicitudHerramienta } from '@/src/hooks/servicios/use-solicitudes-herramienta'
import type { TipoSolicitudHerramienta, HerramientaCampoResumen } from '@/src/types/solicitudes-herramienta.types'

const INP: React.CSSProperties = {
  border:       '1.5px solid var(--color-border)',
  background:   'var(--color-surface-0)',
  color:        'var(--color-text-900)',
  borderRadius: 8,
  padding:      '8px 10px',
  fontSize:     13,
  outline:      'none',
  width:        '100%',
}

export function SolicitarHerramientaModal({ crewId, crewName, herramientasCrew, onClose }: {
  crewId: string; crewName: string; herramientasCrew: HerramientaCampoResumen[]; onClose: () => void
}) {
  const [tipo, setTipo]                 = useState<TipoSolicitudHerramienta>('DANO')
  const [herramientaId, setHerramientaId] = useState('')
  const [motivo, setMotivo]             = useState('')

  // Para reportar dano, solo se puede elegir entre lo que la cuadrilla
  // realmente tiene; para pedir una nueva, se busca en todo el catalogo.
  const { data: catalogo, isLoading: cargandoCatalogo } = useHerramientas({ activo: true, limit: 500 })
  const crear = useCrearSolicitudHerramienta()

  const opcionesDano  = herramientasCrew
  const opcionesNueva = useMemo(() => catalogo?.data ?? [], [catalogo])

  function cambiarTipo(t: TipoSolicitudHerramienta) {
    setTipo(t)
    setHerramientaId('')
  }

  const puedeEnviar = !!herramientaId && motivo.trim().length > 0

  function submit() {
    if (!puedeEnviar) return
    crear.mutate(
      { crew_id: crewId, herramienta_id: herramientaId, tipo, motivo: motivo.trim() },
      { onSuccess: onClose },
    )
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Reportar / Solicitar herramienta</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{crewName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 flex flex-col gap-3">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
            <button
              onClick={() => cambiarTipo('DANO')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all"
              style={tipo === 'DANO' ? { background: 'var(--color-surface-0)', color: '#ef4444', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' } : { color: 'var(--color-text-400)' }}
            >
              <AlertTriangle size={13} /> Se dañó
            </button>
            <button
              onClick={() => cambiarTipo('NUEVA')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all"
              style={tipo === 'NUEVA' ? { background: 'var(--color-surface-0)', color: 'var(--color-primary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' } : { color: 'var(--color-text-400)' }}
            >
              <PackagePlus size={13} /> Necesito una nueva
            </button>
          </div>

          {tipo === 'DANO' ? (
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>¿Cuál herramienta se dañó?</label>
              {opcionesDano.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Esta cuadrilla no tiene herramientas registradas para reportar.</p>
              ) : (
                <select value={herramientaId} onChange={e => setHerramientaId(e.target.value)} style={{ ...INP, appearance: 'none' as const }}>
                  <option value="">Seleccionar herramienta...</option>
                  {opcionesDano.map(h => (
                    <option key={h.herramienta.id} value={h.herramienta.id}>
                      {h.herramienta.descripcion} (tiene {h.cantidad})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>¿Qué herramienta necesitas?</label>
              {cargandoCatalogo ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                </div>
              ) : (
                <select value={herramientaId} onChange={e => setHerramientaId(e.target.value)} style={{ ...INP, appearance: 'none' as const }}>
                  <option value="">Seleccionar herramienta...</option>
                  {opcionesNueva.map(h => (
                    <option key={h.id} value={h.id}>{h.descripcion} ({h.codigo})</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>
              {tipo === 'DANO' ? '¿Qué le pasó?' : '¿Por qué la necesitan?'}
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              placeholder={tipo === 'DANO' ? 'Ej. Se partió el mango, ya no sirve...' : 'Ej. No tenemos esta herramienta y la necesitamos para...'}
              style={{ ...INP, resize: 'none' as const }}
            />
          </div>
        </div>

        <div className="px-5 py-4 flex gap-3 justify-end shrink-0" style={{ background: 'var(--color-surface-1)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium shrink-0"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={!puedeEnviar || crear.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity shrink-0"
            style={{ background: 'var(--color-primary)', color: '#fff', opacity: (!puedeEnviar || crear.isPending) ? 0.6 : 1 }}>
            {crear.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {crear.isPending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

'use client'

import { useState } from 'react'
import { X, Loader2, Wrench, AlertTriangle } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useStockCrew, useRegistrarRetiro } from '@/src/hooks/servicios/use-entregas-herramientas'

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

function hoy() { return new Date().toISOString().split('T')[0] }

export function RetirarHerramientaModal({ servicioId, crewId, onClose }: {
  servicioId: string; crewId: string; onClose: () => void
}) {
  const { data: stock = [], isLoading } = useStockCrew(servicioId, crewId)
  const retirar = useRegistrarRetiro()

  const [herramientaId, setHerramientaId] = useState('')
  const [cantidad, setCantidad]           = useState('1')
  const [fecha, setFecha]                 = useState(hoy())
  const [motivo, setMotivo]               = useState('')

  const seleccionada = stock.find(s => s.herramienta.id === herramientaId) ?? null
  const cantidadNum  = parseInt(cantidad, 10) || 0
  const disponible   = seleccionada?.cantidad ?? 0
  const puedeEnviar  = !!herramientaId && cantidadNum > 0 && cantidadNum <= disponible

  function submit() {
    if (!puedeEnviar) return
    retirar.mutate(
      { servicioId, crewId, herramienta_id: herramientaId, cantidad: cantidadNum, fecha, motivo: motivo.trim() || undefined },
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
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Sacar de funcionamiento</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : stock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Wrench size={22} style={{ color: 'var(--color-text-400)' }} />
              <p className="text-sm text-center" style={{ color: 'var(--color-text-400)' }}>Esta cuadrilla no tiene herramientas entregadas actualmente</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Herramienta a sacar de funcionamiento</label>
                <select value={herramientaId} onChange={e => setHerramientaId(e.target.value)} style={{ ...INP, appearance: 'none' as const }}>
                  <option value="">Seleccionar herramienta...</option>
                  {stock.map(s => (
                    <option key={s.herramienta.id} value={s.herramienta.id}>
                      {s.herramienta.codigo} &middot; {s.herramienta.descripcion} (tiene {s.cantidad})
                    </option>
                  ))}
                </select>
              </div>

              {seleccionada && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Cantidad (máx. {disponible})</label>
                    <input
                      type="number" min={1} max={disponible} value={cantidad}
                      onChange={e => setCantidad(e.target.value)}
                      style={INP}
                    />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Fecha</label>
                    <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={INP} />
                  </div>
                </div>
              )}

              {seleccionada && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Motivo (opcional)</label>
                  <textarea
                    value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
                    placeholder="Ej. Se dañó, se perdió..."
                    style={{ ...INP, resize: 'none' as const }}
                  />
                </div>
              )}

              {seleccionada && (
                <div className="rounded-lg p-2.5 flex items-start gap-2" style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}>
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: '#b45309' }} />
                  <p className="text-xs" style={{ color: '#92400e' }}>
                    Esto resta de lo que tiene entregado esta cuadrilla; si la herramienta es exigida por contrato, quedará faltando hasta que se le entregue un reemplazo.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-4 flex gap-3 justify-end shrink-0"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={!puedeEnviar || retirar.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: 'var(--color-danger)', color: '#fff', opacity: (!puedeEnviar || retirar.isPending) ? 0.6 : 1 }}>
            {retirar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
            {retirar.isPending ? 'Guardando...' : 'Sacar de funcionamiento'}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

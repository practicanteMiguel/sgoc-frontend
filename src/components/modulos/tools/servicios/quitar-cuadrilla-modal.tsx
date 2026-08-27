'use client'

import { Loader2, UserMinus, AlertTriangle } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useQuitarCuadrilla } from '@/src/hooks/servicios/use-servicios'
import type { CuadrillaDisponible } from '@/src/types/servicios.types'

export function QuitarCuadrillaModal({ servicioId, crew, onClose }: {
  servicioId: string; crew: CuadrillaDisponible; onClose: () => void
}) {
  const quitar = useQuitarCuadrilla()

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-sm rounded-xl overflow-hidden"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-danger-bg)' }}>
            <AlertTriangle size={22} style={{ color: 'var(--color-danger)' }} />
          </div>
          <h3 className="font-display font-semibold text-base mb-1" style={{ color: 'var(--color-text-900)' }}>
            Quitar cuadrilla del servicio
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
            ¿Seguro que quieres quitar a
          </p>

          <div className="flex items-center gap-3 mt-4 p-3 rounded-lg w-full"
            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              <UserMinus size={16} />
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>{crew.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>{crew.field.name}</p>
            </div>
          </div>

          <p className="text-xs mt-3" style={{ color: 'var(--color-text-400)' }}>
            No queda asignada a ningún servicio. El historial de entregas y movimientos que ya tiene se conserva.
          </p>
        </div>

        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={onClose}
            disabled={quitar.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-70"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => quitar.mutate({ servicioId, crewId: crew.id }, { onSuccess: onClose })}
            disabled={quitar.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
            style={{ background: 'var(--color-danger)', color: '#fff', opacity: quitar.isPending ? 0.75 : 1 }}
          >
            {quitar.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
            {quitar.isPending ? 'Quitando...' : 'Sí, quitar'}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

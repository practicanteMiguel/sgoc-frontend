'use client'

import { useState } from 'react'
import { X, Loader2, Copy, Check, ExternalLink } from 'lucide-react'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useCreateRequisicion } from '@/src/hooks/consumables/use-requisiciones'
import { CATEGORIAS, CATEGORIA_LABELS } from '@/src/types/consumables.types'
import type { Requisicion } from '@/src/types/consumables.types'

const FIELD = {
  background:   'var(--color-surface-1)',
  border:       '1.5px solid var(--color-border)',
  color:        'var(--color-text-900)',
  borderRadius: '8px',
  padding:      '10px 14px',
  fontSize:     '13px',
  width:        '100%',
  outline:      'none',
}

const LABEL = 'text-xs font-medium uppercase tracking-wider'

interface Props {
  onClose: () => void
}

export function RequisicionModal({ onClose }: Props) {
  const create = useCreateRequisicion()

  const [numeroRq, setNumeroRq] = useState('')
  const [categoria, setCategoria] = useState<'PAPELERIA' | 'CONSUMIBLE' | 'EPP'>('PAPELERIA')
  const [lote, setLote] = useState('45')
  const [lugar, setLugar] = useState('')
  const [created, setCreated] = useState<Requisicion | null>(null)
  const [copied, setCopied] = useState(false)

  const errors = {
    numeroRq: !numeroRq || isNaN(Number(numeroRq)),
    lugar: !lugar.trim(),
    lote: !lote || isNaN(Number(lote)),
  }
  const hasErrors = errors.numeroRq || errors.lugar || errors.lote

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hasErrors) return
    create.mutate(
      {
        numero_rq: Number(numeroRq),
        categoria,
        lote: Number(lote),
        lugar: lugar.trim(),
      },
      {
        onSuccess: (rq) => setCreated(rq),
      },
    )
  }

  const llenadoUrl = created
    ? `${window.location.origin}/consumables/llenado/${created.id}`
    : ''

  function handleCopy() {
    navigator.clipboard.writeText(llenadoUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (created) {
    return (
      <ModalPortal onClose={onClose}>
        <div
          className="w-full max-w-md rounded-xl overflow-hidden"
          style={{
            background: 'var(--color-surface-0)',
            border:     '1px solid var(--color-border)',
            boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 pt-6 pb-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-secundary)' }}>
                Requisicion #{created.numero_rq} creada
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70" style={{ color: 'var(--color-text-400)' }}>
                <X size={16} />
              </button>
            </div>

            <p className="text-sm" style={{ color: 'var(--color-text-600)' }}>
              Comparte este link con el supervisor para que llene la solicitud:
            </p>

            <div
              className="rounded-lg px-3 py-2.5 flex items-center gap-2"
              style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
            >
              <span className="flex-1 text-xs truncate" style={{ color: 'var(--color-text-700)' }}>
                {llenadoUrl}
              </span>
              <a
                href={llenadoUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-text-400)' }}
              >
                <ExternalLink size={14} />
              </a>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
              >
                Cerrar
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-md rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-secundary)' }}>
              Nueva requisicion
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              El backend generara los items automaticamente segun la categoria
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70" style={{ color: 'var(--color-text-400)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Numero RQ</label>
                <input
                  type="number"
                  value={numeroRq}
                  onChange={(e) => setNumeroRq(e.target.value)}
                  placeholder="338"
                  style={{ ...FIELD, borderColor: errors.numeroRq && numeroRq !== '' ? 'var(--color-danger)' : 'var(--color-border)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = errors.numeroRq && numeroRq !== '' ? 'var(--color-danger)' : 'var(--color-border)' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Lote</label>
                <input
                  type="number"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  style={FIELD}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as typeof categoria)}
                  style={{ ...FIELD, cursor: 'pointer' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <label className={LABEL} style={{ color: 'var(--color-text-400)' }}>Lugar</label>
                <input
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value)}
                  placeholder="Ej: Planta Dina"
                  style={{ ...FIELD, borderColor: errors.lugar && lugar !== '' ? 'var(--color-danger)' : 'var(--color-border)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                  onBlur={(e)  => { e.target.style.borderColor = errors.lugar && lugar !== '' ? 'var(--color-danger)' : 'var(--color-border)' }}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
              style={{ background: 'var(--color-primary)', color: '#fff', opacity: create.isPending ? 0.75 : 1 }}
            >
              {create.isPending && <Loader2 size={14} className="animate-spin" />}
              {create.isPending ? 'Creando...' : 'Crear requisicion'}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  )
}

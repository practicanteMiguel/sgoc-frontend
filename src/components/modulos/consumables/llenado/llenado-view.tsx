'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Send } from 'lucide-react'
import { useLlenadoRequisicion } from '@/src/hooks/consumables/use-requisiciones'
import { formatCOP } from '@/src/lib/utils'
import { CATEGORIA_LABELS } from '@/src/types/consumables.types'
import type { Requisicion, RQItem } from '@/src/types/consumables.types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'


const INPUT_STYLE: React.CSSProperties = {
  background:   '#fff',
  border:       '1.5px solid #d1d5db',
  borderRadius: '6px',
  padding:      '6px 10px',
  fontSize:     '13px',
  width:        '100%',
  outline:      'none',
  color:        '#111827',
  textAlign:    'right',
}

const FIELD_STYLE: React.CSSProperties = {
  background:   '#fff',
  border:       '1.5px solid #d1d5db',
  borderRadius: '8px',
  padding:      '10px 14px',
  fontSize:     '13px',
  width:        '100%',
  outline:      'none',
  color:        '#111827',
}

interface SolicitadoMap {
  [itemId: string]: string
}

interface Props {
  id: string
}

export function LlenadoView({ id }: Props) {
  const [rq,        setRq]        = useState<Requisicion | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [enviado,   setEnviado]   = useState(false)

  const [fecha,           setFecha]           = useState('')
  const [nombreSolicitante, setNombreSolicitante] = useState('')
  const [numeroContrato,  setNumeroContrato]  = useState('')
  const [cantidades,      setCantidades]      = useState<SolicitadoMap>({})

  const llenado = useLlenadoRequisicion()

  useEffect(() => {
    fetch(`${API_BASE}/requisiciones/${id}`)
      .then((r) => { if (r.status === 404) { setNotFound(true); return null } return r.json() })
      .then((d) => {
        if (!d) return
        if (d.estado === 'COMPLETADA') setEnviado(true)
        setRq(d)
        const init: SolicitadoMap = {}
        for (const item of d.items ?? []) {
          init[item.id] = item.solicitado != null ? String(item.solicitado) : ''
        }
        setCantidades(init)
        if (d.fecha)             setFecha(d.fecha)
        if (d.nombre_solicitante) setNombreSolicitante(d.nombre_solicitante)
        if (d.numero_contrato)   setNumeroContrato(d.numero_contrato)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  function totalItem(item: RQItem) {
    const cant = Number(cantidades[item.id] ?? 0)
    if (!cant || item.valor_unitario === null) return null
    return cant * item.valor_unitario
  }

  function totalGeneral() {
    if (!rq) return 0
    return rq.items.reduce((sum, item) => {
      const t = totalItem(item)
      return t !== null ? sum + t : sum
    }, 0)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rq) return
    llenado.mutate(
      {
        id,
        fecha:              fecha,
        nombre_solicitante: nombreSolicitante,
        numero_contrato:    numeroContrato,
        items:              rq.items.map((item) => ({
          id:        item.id,
          solicitado: Number(cantidades[item.id] ?? 0),
        })),
      },
      {
        onSuccess: () => setEnviado(true),
      },
    )
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f4]">
      <Loader2 size={28} className="animate-spin text-[#1a6b6b]" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f0f4f4] px-6 text-center">
      <XCircle size={40} className="text-red-400" />
      <p className="text-lg font-semibold text-[#1a3a3a]">Enlace no valido</p>
      <p className="text-sm text-gray-500">Esta requisicion no existe o el enlace ha expirado.</p>
    </div>
  )

  if (enviado) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f0f4f4] px-6 text-center">
      <CheckCircle2 size={40} className="text-emerald-500" />
      <p className="text-lg font-semibold text-[#1a3a3a]">Solicitud enviada</p>
      <p className="text-sm text-gray-500">
        La requisicion #{rq?.numero_rq} ha sido completada correctamente.
        <br />El encargado puede revisarla en el sistema.
      </p>
    </div>
  )

  if (!rq) return null

  return (
    <div className="min-h-screen bg-[#f0f4f4] py-8 px-4">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="rounded-2xl bg-white border border-[#d1dede] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1a6b6b] mb-1">
            Requisicion de Insumos
          </p>
          <h1 className="text-xl font-bold text-[#1a3a3a]">
            #{rq.numero_rq} - {CATEGORIA_LABELS[rq.categoria]}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            CC {rq.lote} &middot; {rq.lugar}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Datos del solicitante */}
          <div className="rounded-2xl bg-white border border-[#d1dede] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Datos del solicitante
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">Fecha</label>
                <input
                  required
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  style={FIELD_STYLE}
                  onFocus={(e) => { e.target.style.borderColor = '#1a6b6b' }}
                  onBlur={(e)  => { e.target.style.borderColor = '#d1d5db' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">Nombre del solicitante</label>
                <input
                  required
                  value={nombreSolicitante}
                  onChange={(e) => setNombreSolicitante(e.target.value)}
                  placeholder="Nombre completo"
                  style={FIELD_STYLE}
                  onFocus={(e) => { e.target.style.borderColor = '#1a6b6b' }}
                  onBlur={(e)  => { e.target.style.borderColor = '#d1d5db' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">Numero de contrato</label>
                <input
                  required
                  value={numeroContrato}
                  onChange={(e) => setNumeroContrato(e.target.value)}
                  placeholder="CT-2026-001"
                  style={FIELD_STYLE}
                  onFocus={(e) => { e.target.style.borderColor = '#1a6b6b' }}
                  onBlur={(e)  => { e.target.style.borderColor = '#d1d5db' }}
                />
              </div>
            </div>
          </div>

          {/* Tabla de items */}
          <div className="rounded-2xl bg-white border border-[#d1dede] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#1a3a3a', color: '#fff' }}>
                    {['Codigo', 'Descripcion', 'Unidad', 'V. Unitario', 'Solicitado', 'Total'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...rq.items].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' })).map((item, idx) => {
                    const t = totalItem(item)
                    return (
                      <tr
                        key={item.id}
                        style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-500">
                          {item.codigo}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900" style={{ minWidth: 200 }}>
                          {item.descripcion}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {item.unidad}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-right text-gray-700">
                          {formatCOP(item.valor_unitario)}
                        </td>
                        <td className="px-4 py-3" style={{ minWidth: 96 }}>
                          <input
                            type="number"
                            min="0"
                            value={cantidades[item.id] ?? ''}
                            onChange={(e) => setCantidades((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="0"
                            style={INPUT_STYLE}
                            onFocus={(e) => { e.target.style.borderColor = '#1a6b6b' }}
                            onBlur={(e)  => { e.target.style.borderColor = '#d1d5db' }}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-right text-gray-900">
                          {formatCOP(t)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f0f4f4', borderTop: '2px solid #d1d5db' }}>
                    <td colSpan={5} className="px-4 py-4 text-sm font-bold text-right text-[#1a3a3a]">
                      TOTAL GENERAL
                    </td>
                    <td className="px-4 py-4 text-base font-bold text-right text-[#1a6b6b]">
                      {formatCOP(totalGeneral())}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={llenado.isPending || !fecha || !nombreSolicitante || !numeroContrato}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-opacity"
            style={{
              background: '#1a6b6b',
              color:      '#fff',
              opacity:    (llenado.isPending || !fecha || !nombreSolicitante || !numeroContrato) ? 0.6 : 1,
            }}
          >
            {llenado.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {llenado.isPending ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </form>
      </div>
    </div>
  )
}

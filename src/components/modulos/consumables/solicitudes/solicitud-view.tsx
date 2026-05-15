'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Send } from 'lucide-react'
import { CATEGORIA_LABELS } from '@/src/types/consumables.types'
import type { Solicitud, SolicitudItem } from '@/src/types/consumables.types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

function formatCOP(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value))
}

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

export function SolicitudView({ id }: Props) {
  const [solicitud,   setSolicitud]   = useState<Solicitud | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)
  const [enviado,     setEnviado]     = useState(false)
  const [submitting,  setSubmitting]  = useState(false)

  const [fecha,              setFecha]             = useState('')
  const [nombreSolicitante,  setNombreSolicitante] = useState('')
  const [numeroContrato,     setNumeroContrato]    = useState('')
  const [cantidades,         setCantidades]        = useState<SolicitadoMap>({})
  const [showConfirm,        setShowConfirm]       = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/solicitudes/${id}`)
      .then((r) => { if (r.status === 404) { setNotFound(true); return null } return r.json() })
      .then((d: Solicitud | null) => {
        if (!d) return
        if (d.estado === 'COMPLETADA') setEnviado(true)
        setSolicitud(d)
        const init: SolicitadoMap = {}
        for (const item of (d.categorias ?? []).flatMap(c => c.items)) {
          init[item.id] = item.solicitado != null ? String(item.solicitado) : ''
        }
        setCantidades(init)
        if (d.fecha)              setFecha(d.fecha)
        if (d.nombre_solicitante) setNombreSolicitante(d.nombre_solicitante)
        if (d.numero_contrato)    setNumeroContrato(d.numero_contrato)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  function totalItem(item: SolicitudItem) {
    const cant = Number(cantidades[item.id] ?? 0)
    if (!cant || item.valor_unitario === null) return null
    return cant * Number(item.valor_unitario)
  }

  function totalCategoria(cat: string) {
    if (!solicitud) return 0
    const catData = (solicitud.categorias ?? []).find(c => c.categoria === cat)
    return (catData?.items ?? []).reduce((sum, item) => {
      const t = totalItem(item)
      return t !== null ? sum + t : sum
    }, 0)
  }

  function totalGeneral() {
    if (!solicitud) return 0
    return (solicitud.categorias ?? []).flatMap(c => c.items).reduce((sum, item) => {
      const t = totalItem(item)
      return t !== null ? sum + t : sum
    }, 0)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setShowConfirm(true)
  }

  async function handleConfirm() {
    if (!solicitud) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/solicitudes/${id}/llenado`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fecha,
          nombre_solicitante: nombreSolicitante,
          numero_contrato:    numeroContrato,
          items:              (solicitud.categorias ?? []).flatMap(c => c.items).map((item) => ({
            id:        item.id,
            solicitado: Number(cantidades[item.id] ?? 0),
          })),
        }),
      })
      if (res.ok) { setShowConfirm(false); setEnviado(true) }
    } finally {
      setSubmitting(false)
    }
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
      <p className="text-sm text-gray-500">Esta solicitud no existe o el enlace ha expirado.</p>
    </div>
  )

  if (enviado) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f0f4f4] px-6 text-center">
      <CheckCircle2 size={40} className="text-emerald-500" />
      <p className="text-lg font-semibold text-[#1a3a3a]">Solicitud enviada</p>
      <p className="text-sm text-gray-500">
        El encargado recibira su solicitud y generara las requisiciones correspondientes.
      </p>
    </div>
  )

  if (!solicitud) return null

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div className="min-h-screen bg-[#f0f4f4] py-8 px-4">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="rounded-2xl bg-white border border-[#d1dede] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1a6b6b] mb-1">
            Plantilla de Insumos
          </p>
          <h1 className="text-xl font-bold text-[#1a3a3a]">
            {solicitud.lugar}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            CC {solicitud.lote} &middot; {meses[solicitud.mes - 1]} {solicitud.anio}
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

          {/* Items grouped by category */}
          {(solicitud.categorias ?? []).map(({ categoria: cat, items }) => {
            const subtotal = totalCategoria(cat)
            return (
              <div key={cat} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1a6b6b]">
                    {CATEGORIA_LABELS[cat]}
                  </span>
                  {subtotal > 0 && (
                    <span className="text-xs font-semibold text-gray-600">
                      Subtotal: {formatCOP(subtotal)}
                    </span>
                  )}
                </div>
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
                        {items.map((item, idx) => {
                          const t = totalItem(item)
                          return (
                            <tr
                              key={item.id}
                              style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}
                            >
                              <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-500">
                                {item.codigo}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900 max-w-56 truncate">
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
                    </table>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Total general */}
          <div
            className="flex items-center justify-between px-5 py-4 rounded-2xl"
            style={{ background: '#fff', border: '1px solid #d1dede' }}
          >
            <span className="text-sm font-bold text-[#1a3a3a]">TOTAL GENERAL</span>
            <span className="text-lg font-bold text-[#1a6b6b]">{formatCOP(totalGeneral())}</span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!fecha || !nombreSolicitante || !numeroContrato}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-opacity"
            style={{
              background: '#1a6b6b',
              color:      '#fff',
              opacity:    (!fecha || !nombreSolicitante || !numeroContrato) ? 0.6 : 1,
            }}
          >
            <Send size={18} />
            Revisar y enviar
          </button>
        </form>
      </div>

      {/* Confirmation modal */}
      {showConfirm && solicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div
            className="w-full max-w-sm rounded-2xl bg-white flex flex-col gap-0 overflow-hidden"
            style={{ border: '1px solid #d1dede', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}
          >
            {/* Header */}
            <div className="px-6 py-5" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#1a6b6b] mb-1">
                Confirmar solicitud
              </p>
              <h2 className="text-base font-bold text-[#1a3a3a]">{solicitud.lugar}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                CC {solicitud.lote} &middot; {nombreSolicitante}
              </p>
            </div>

            {/* Subtotals */}
            <div className="px-6 py-5 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Resumen por categoria
              </p>
              {(solicitud.categorias ?? []).map(({ categoria: cat }) => {
                const sub = totalCategoria(cat)
                return (
                  <div key={cat} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-600">{CATEGORIA_LABELS[cat]}</span>
                    <span className="text-sm font-semibold text-[#1a3a3a]">
                      {sub > 0 ? formatCOP(sub) : <span className="text-gray-300">Sin solicitar</span>}
                    </span>
                  </div>
                )
              })}

              <div
                className="flex items-center justify-between gap-4 pt-4 mt-1"
                style={{ borderTop: '1.5px solid #d1d5db' }}
              >
                <span className="text-sm font-bold text-[#1a3a3a]">Total general</span>
                <span className="text-lg font-bold text-[#1a6b6b]">{formatCOP(totalGeneral())}</span>
              </div>
            </div>

            {/* Actions */}
            <div
              className="px-6 py-4 flex gap-3"
              style={{ borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}
            >
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity"
                style={{ background: '#fff', border: '1.5px solid #d1d5db', color: '#374151', opacity: submitting ? 0.5 : 1 }}
              >
                Corregir
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-opacity"
                style={{ background: '#1a6b6b', color: '#fff', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? 'Enviando...' : 'Confirmar envio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

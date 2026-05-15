'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, FileDown, FileSpreadsheet, Equal, Building2, X, Search } from 'lucide-react'
import { useRequisicion, useGuardarFacturas } from '@/src/hooks/consumables/use-requisiciones'
import { CATEGORIA_LABELS, ESTADO_COLORS, ESTADO_LABELS } from '@/src/types/consumables.types'
import type { Requisicion, RQItem } from '@/src/types/consumables.types'

function formatCOP(value: number | null | undefined) {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}

function totalGeneral(items: RQItem[]) {
  return items.reduce((sum, i) => {
    if (i.solicitado === null || i.valor_unitario === null) return sum
    return sum + i.solicitado * i.valor_unitario
  }, 0)
}

async function exportPdf(rq: Requisicion) {
  const rows = rq.items.map((item) => `
    <tr>
      <td>${item.codigo}</td>
      <td>${item.descripcion}</td>
      <td>${item.unidad}</td>
      <td>${item.proveedor_ordinario ?? '-'}</td>
      <td>${item.proveedor_extraordinario ?? '-'}</td>
      <td style="text-align:right">${formatCOP(item.valor_unitario)}</td>
      <td style="text-align:center">${item.solicitado ?? '-'}</td>
      <td style="text-align:right">${formatCOP(item.total)}</td>
    </tr>
  `).join('')

  const total = formatCOP(totalGeneral(rq.items))

  const html = `
    <div style="font-family:Arial,sans-serif;padding:24px;color:#111;background:#fff;">
      <div style="border-bottom:2px solid #1a3a3a;padding-bottom:16px;margin-bottom:20px;">
        <h2 style="margin:0;color:#1a3a3a;font-size:18px;">Requisicion de Insumos #${rq.numero_rq}</h2>
        <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">
          Categoria: ${CATEGORIA_LABELS[rq.categoria]} &nbsp;|&nbsp;
          CC: ${rq.lote} &nbsp;|&nbsp;
          Lugar: ${rq.lugar}
        </p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;font-size:12px;color:#374151;">
        <div><strong>Solicitante:</strong> ${rq.nombre_solicitante ?? '-'}</div>
        <div><strong>Contrato:</strong> ${rq.numero_contrato ?? '-'}</div>
        <div><strong>Fecha:</strong> ${rq.fecha ?? '-'}</div>
        <div><strong>Estado:</strong> ${ESTADO_LABELS[rq.estado]}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="background:#1a3a3a;color:#fff;">
            <th style="padding:8px;text-align:left;">Codigo</th>
            <th style="padding:8px;text-align:left;">Descripcion</th>
            <th style="padding:8px;">Unidad</th>
            <th style="padding:8px;">Prov. Ord.</th>
            <th style="padding:8px;">Prov. Ext.</th>
            <th style="padding:8px;text-align:right;">V. Unit.</th>
            <th style="padding:8px;text-align:center;">Solicitado</th>
            <th style="padding:8px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#f3f4f6;font-weight:bold;">
            <td colspan="7" style="padding:10px 8px;text-align:right;">TOTAL GENERAL</td>
            <td style="padding:10px 8px;text-align:right;">${total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `
  const style = document.createElement('style')
  style.textContent = 'table{width:100%;border-collapse:collapse;} tbody tr:nth-child(even){background:#f9fafb;} td,th{border:1px solid #e5e7eb;}'
  document.head.appendChild(style)
  try {
    const { default: html2pdf } = await import('html2pdf.js')
    await html2pdf().set({
      margin:      10,
      filename:    `RQ-${rq.numero_rq}-${rq.categoria}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF:       { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).from(html).save()
  } finally {
    document.head.removeChild(style)
  }
}

async function exportExcel(rq: Requisicion) {
  const { Workbook } = await import('exceljs')
  const wb = new Workbook()
  const ws = wb.addWorksheet(`RQ-${rq.numero_rq}`)

  ws.addRow(['REQUISICION DE INSUMOS'])
  ws.addRow([`RQ #${rq.numero_rq}`, `${CATEGORIA_LABELS[rq.categoria]}`, `CC: ${rq.lote}`, `Lugar: ${rq.lugar}`])
  ws.addRow([`Solicitante: ${rq.nombre_solicitante ?? '-'}`, `Contrato: ${rq.numero_contrato ?? '-'}`, `Fecha: ${rq.fecha ?? '-'}`, `Estado: ${ESTADO_LABELS[rq.estado]}`])
  ws.addRow([])
  ws.addRow(['Codigo', 'Descripcion', 'Unidad', 'Proveedor Ord.', 'Proveedor Ext.', 'Valor Unitario', 'Solicitado', 'Total'])

  for (const item of rq.items) {
    ws.addRow([
      item.codigo,
      item.descripcion,
      item.unidad,
      item.proveedor_ordinario ?? '',
      item.proveedor_extraordinario ?? '',
      item.valor_unitario ?? '',
      item.solicitado ?? '',
      item.total ?? '',
    ])
  }

  ws.addRow([])
  ws.addRow(['', '', '', '', '', '', 'TOTAL GENERAL', totalGeneral(rq.items)])

  const buf  = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `RQ-${rq.numero_rq}-${rq.categoria}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

type FacturaMap = Record<string, { factura: string; precio: string; proveedor: string }>

interface Props {
  id:     string
  onBack: () => void
}

export function RequisicionDetail({ id, onBack }: Props) {
  const { data: rq, isLoading } = useRequisicion(id)
  const guardarFacturas = useGuardarFacturas()
  const [loadingPdf,          setLoadingPdf]          = useState(false)
  const [loadingXlsx,         setLoadingXlsx]         = useState(false)
  const [facturas,            setFacturas]            = useState<FacturaMap>({})
  const [editandoFacturas,    setEditandoFacturas]    = useState(false)
  const [proveedorExpandido,  setProveedorExpandido]  = useState<Set<string>>(new Set())
  const [filtroOpen,          setFiltroOpen]          = useState(false)
  const [filtroInput,         setFiltroInput]         = useState('')
  const [filtroActivo,        setFiltroActivo]        = useState('')

  useEffect(() => {
    if (!rq) return
    const init: FacturaMap = {}
    const conProveedor = new Set<string>()
    for (const item of rq.items) {
      init[item.id] = {
        factura:   item.numero_factura ?? '',
        precio:    item.precio_real != null ? String(item.precio_real) : '',
        proveedor: item.proveedor_factura ?? '',
      }
      if (item.proveedor_factura) conProveedor.add(item.id)
    }
    setFacturas(init)
    setProveedorExpandido(conProveedor)
    setEditandoFacturas(false)
    setFiltroOpen(false)
    setFiltroInput('')
    setFiltroActivo('')
  }, [rq?.id])

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
    </div>
  )

  if (!rq) return null

  const hasData       = rq.estado !== 'ABIERTA'
  const showFactura   = ['PEDIDO_REALIZADO', 'EN_BODEGA', 'ENTREGADO'].includes(rq.estado) ||
                        rq.items.some((i) => i.numero_factura != null || i.precio_real != null)
  const facturasSaved = rq.items.some((i) => i.numero_factura != null || i.precio_real != null)
  const editMode      = !facturasSaved || editandoFacturas
  const estadoColor   = ESTADO_COLORS[rq.estado]
  const total         = totalGeneral(rq.items)

  async function handlePdf() {
    if (!rq) return
    setLoadingPdf(true)
    try { await exportPdf(rq) } finally { setLoadingPdf(false) }
  }

  async function handleXlsx() {
    if (!rq) return
    setLoadingXlsx(true)
    try { await exportExcel(rq) } finally { setLoadingXlsx(false) }
  }

  function handleGuardarFacturas() {
    if (!rq) return
    guardarFacturas.mutate(
      {
        id: rq.id,
        items: rq.items.map((item) => ({
          id:               item.id,
          numero_factura:   facturas[item.id]?.factura || null,
          precio_real:      facturas[item.id]?.precio ? Number(facturas[item.id].precio) : null,
          proveedor_factura: facturas[item.id]?.proveedor || null,
        })),
      },
      { onSuccess: () => setEditandoFacturas(false) },
    )
  }

  function setItemFactura(itemId: string, field: 'factura' | 'precio', value: string) {
    setFacturas((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }))
  }

  function setItemProveedor(itemId: string, value: string) {
    setFacturas((prev) => ({ ...prev, [itemId]: { ...prev[itemId], proveedor: value } }))
  }

  function toggleProveedorExpandido(itemId: string) {
    setProveedorExpandido((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
        setItemProveedor(itemId, '')
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  function totalReal() {
    if (!rq) return 0
    if (editMode) {
      return rq.items.reduce((sum, item) => {
        const precio = facturas[item.id]?.precio ? Number(facturas[item.id].precio) : null
        if (precio === null || item.solicitado === null) return sum
        return sum + precio * item.solicitado
      }, 0)
    }
    return rq.items.reduce((sum, item) => {
      if (item.precio_real == null || item.solicitado == null) return sum
      return sum + item.precio_real * item.solicitado
    }, 0)
  }

  const hasAnyPrecioReal = editMode
    ? rq.items.some((item) => facturas[item.id]?.precio)
    : rq.items.some((item) => item.precio_real != null)

  const filteredItems = filtroActivo
    ? rq.items.filter((item) => item.numero_factura === filtroActivo)
    : rq.items

  function totalFiltrado() {
    return filteredItems.reduce((sum, item) => {
      if (item.precio_real == null || item.solicitado == null) return sum
      return sum + item.precio_real * item.solicitado
    }, 0)
  }

  // separator header between estimated and factura columns
  const thBase  = 'text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap'
  const thStyle = { color: 'var(--color-text-400)' }
  const thFactStyle = { color: 'var(--color-primary)', borderLeft: '2px solid var(--color-border)' }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity shrink-0"
          style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
        >
          <ArrowLeft size={16} style={{ color: 'var(--color-text-600)' }} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-secundary)' }}>
              Requisicion #{rq.numero_rq}
            </h3>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${estadoColor}22`, color: estadoColor }}
            >
              {ESTADO_LABELS[rq.estado]}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
            {CATEGORIA_LABELS[rq.categoria]} &middot; CC {rq.lote} &middot; {rq.lugar}
          </p>
        </div>

        {hasData && (
          <div className="flex gap-2">
            <button
              onClick={handleXlsx}
              disabled={loadingXlsx}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)', opacity: loadingXlsx ? 0.6 : 1 }}
            >
              {loadingXlsx ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
              Excel
            </button>
            <button
              onClick={handlePdf}
              disabled={loadingPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)', opacity: loadingPdf ? 0.6 : 1 }}
            >
              {loadingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Solicitante',    value: rq.nombre_solicitante ?? 'Pendiente' },
          { label: 'Contrato',       value: rq.numero_contrato    ?? 'Pendiente' },
          { label: 'Fecha',          value: rq.fecha              ?? 'Pendiente' },
          { label: 'Total estimado', value: hasData ? formatCOP(total) : 'Pendiente' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl p-4 flex flex-col gap-1"
            style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{label}</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Items table - unified with factura columns */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                <th className={thBase} style={thStyle}>Codigo</th>
                <th className={thBase} style={thStyle}>Descripcion</th>
                <th className={thBase} style={thStyle}>Unidad</th>
                <th className={thBase} style={thStyle}>Proveedor Ord.</th>
                <th className={thBase} style={thStyle}>Proveedor Ext.</th>
                <th className={`${thBase} text-right`} style={thStyle}>Valor Unit.</th>
                <th className={`${thBase} text-center`} style={thStyle}>Solicitado</th>
                <th className={`${thBase} text-right`} style={thStyle}>Total</th>
                {showFactura && <>
                  <th className={`${thBase} text-left`} style={thFactStyle}>
                    {!editMode && (filtroOpen || filtroActivo) ? (
                      <form
                        className="flex items-center gap-1.5"
                        onSubmit={(e) => { e.preventDefault(); setFiltroActivo(filtroInput.trim()) }}
                      >
                        <input
                          autoFocus
                          type="text"
                          value={filtroInput}
                          onChange={(e) => setFiltroInput(e.target.value)}
                          placeholder="FAC-001..."
                          className="rounded text-xs outline-none px-2 py-1"
                          style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', width: 110, fontWeight: 'normal', letterSpacing: 0, textTransform: 'none' }}
                          onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                          onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 rounded text-xs"
                          style={{ background: 'var(--color-primary)', color: '#fff', fontWeight: 600, letterSpacing: 0, textTransform: 'none' }}
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFiltroOpen(false); setFiltroActivo(''); setFiltroInput('') }}
                          className="w-5 h-5 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
                          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}
                        >
                          <X size={10} />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        N. Factura
                        {!editMode && (
                          <button
                            type="button"
                            onClick={() => setFiltroOpen(true)}
                            className="w-5 h-5 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
                            style={{ background: filtroActivo ? 'var(--color-primary-muted)' : 'transparent', color: filtroActivo ? 'var(--color-primary)' : 'var(--color-text-400)' }}
                            title="Filtrar por N. Factura"
                          >
                            <Search size={10} />
                          </button>
                        )}
                      </div>
                    )}
                  </th>
                  <th className={`${thBase} text-right`} style={{ ...thStyle, ...thFactStyle }}>V. Real</th>
                  <th className={`${thBase} text-right`} style={{ ...thStyle, ...thFactStyle }}>Diferencia</th>
                  <th className={`${thBase} text-left`} style={{ ...thStyle, ...thFactStyle }}>Prov. Real</th>
                </>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 && filtroActivo ? (
                <tr>
                  <td
                    colSpan={showFactura ? 12 : 8}
                    className="px-4 py-10 text-center text-xs"
                    style={{ color: 'var(--color-text-400)' }}
                  >
                    Sin insumos con factura <strong style={{ color: 'var(--color-text-600)' }}>{filtroActivo}</strong>
                  </td>
                </tr>
              ) : null}
              {filteredItems.map((item) => {
                const precioReal = editMode
                  ? (facturas[item.id]?.precio ? Number(facturas[item.id].precio) : null)
                  : item.precio_real
                const diff = precioReal != null && item.valor_unitario !== null && item.solicitado !== null
                  ? (precioReal - item.valor_unitario) * item.solicitado
                  : null
                return (
                  <tr
                    key={item.id}
                    style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                      {item.codigo}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-900)', minWidth: 200 }}>
                      {item.descripcion}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                      {item.unidad}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                      {item.proveedor_ordinario ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                      {item.proveedor_extraordinario ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-right whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>
                      {formatCOP(item.valor_unitario)}
                    </td>
                    <td className="px-4 py-3 text-xs text-center font-bold whitespace-nowrap" style={{ color: item.solicitado !== null ? 'var(--color-text-900)' : 'var(--color-text-400)' }}>
                      {item.solicitado ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-right whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>
                      {formatCOP(item.total)}
                    </td>
                    {showFactura && <>
                      <td className="px-4 py-2.5" style={{ borderLeft: '2px solid var(--color-border)', minWidth: 150 }}>
                        {editMode ? (
                          <input
                            type="text"
                            value={facturas[item.id]?.factura ?? ''}
                            onChange={(e) => setItemFactura(item.id, 'factura', e.target.value)}
                            placeholder="FAC-001"
                            className="rounded-lg text-xs outline-none w-full px-2.5 py-1.5"
                            style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-900)' }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                            onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                          />
                        ) : (
                          <span className="text-xs font-semibold" style={{ color: item.numero_factura ? 'var(--color-text-900)' : 'var(--color-text-400)' }}>
                            {item.numero_factura ?? '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5" style={{ minWidth: 160 }}>
                        {editMode ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={facturas[item.id]?.precio ?? ''}
                              onChange={(e) => setItemFactura(item.id, 'precio', e.target.value)}
                              placeholder="0"
                              className="rounded-lg text-xs outline-none text-right flex-1 px-2.5 py-1.5"
                              style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-900)' }}
                              onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                              onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                            />
                            <button
                              type="button"
                              onClick={() => setItemFactura(item.id, 'precio', String(item.valor_unitario ?? ''))}
                              title="Mismo valor original"
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 hover:opacity-70 transition-opacity"
                              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
                            >
                              <Equal size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-right block" style={{ color: item.precio_real != null ? 'var(--color-text-900)' : 'var(--color-text-400)' }}>
                            {formatCOP(item.precio_real)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-right">
                        {diff !== null ? (
                          <span style={{ color: diff < 0 ? '#16a34a' : diff > 0 ? '#ef4444' : 'var(--color-text-400)' }}>
                            {diff > 0 ? '+' : ''}{formatCOP(diff)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-400)' }}>-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5" style={{ minWidth: 180 }}>
                        {editMode ? (
                          <div className="flex items-center gap-1.5">
                            {proveedorExpandido.has(item.id) ? (
                              <input
                                type="text"
                                value={facturas[item.id]?.proveedor ?? ''}
                                onChange={(e) => setItemProveedor(item.id, e.target.value)}
                                placeholder="Nombre del proveedor"
                                className="rounded-lg text-xs outline-none flex-1 px-2.5 py-1.5"
                                style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-900)' }}
                                onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
                                onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
                              />
                            ) : (
                              <span className="text-xs italic flex-1" style={{ color: 'var(--color-text-400)' }}>Sin cambio</span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleProveedorExpandido(item.id)}
                              title={proveedorExpandido.has(item.id) ? 'Cancelar cambio' : 'Cambiar proveedor'}
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 hover:opacity-70 transition-opacity"
                              style={{
                                background: proveedorExpandido.has(item.id) ? 'rgba(239,68,68,0.08)' : 'var(--color-surface-2)',
                                color: proveedorExpandido.has(item.id) ? '#ef4444' : 'var(--color-text-600)',
                                border: '1px solid var(--color-border)',
                              }}
                            >
                              {proveedorExpandido.has(item.id) ? <X size={12} /> : <Building2 size={12} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: item.proveedor_factura ? 'var(--color-text-900)' : 'var(--color-text-400)' }}>
                            {item.proveedor_factura ?? '-'}
                          </span>
                        )}
                      </td>
                    </>}
                  </tr>
                )
              })}
            </tbody>
            {hasData && (
              <tfoot>
                <tr style={{ background: 'var(--color-surface-1)', borderTop: '2px solid var(--color-border)' }}>
                  <td colSpan={7} className="px-4 py-3 text-xs font-bold text-right" style={{ color: 'var(--color-text-700)' }}>
                    TOTAL ESTIMADO
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-right" style={{ color: 'var(--color-secundary)' }}>
                    {formatCOP(total)}
                  </td>
                  {showFactura && <>
                    <td style={{ borderLeft: '2px solid var(--color-border)' }} />
                    <td className="px-4 py-3 text-sm font-bold text-right" style={{ color: hasAnyPrecioReal ? 'var(--color-secundary)' : 'var(--color-text-400)' }}>
                      {hasAnyPrecioReal ? formatCOP(totalReal()) : '-'}
                    </td>
                    <td />
                    <td />
                  </>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer bar */}
        <div
          className="px-4 py-2.5 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
            {filtroActivo ? (
              <>
                <strong style={{ color: 'var(--color-text-900)' }}>{filteredItems.length}</strong> item{filteredItems.length !== 1 ? 's' : ''} &middot; factura <strong style={{ color: 'var(--color-text-900)' }}>{filtroActivo}</strong>
                {' · '}Total: <strong style={{ color: 'var(--color-text-900)' }}>{formatCOP(totalFiltrado())}</strong>
              </>
            ) : (
              <>
                {rq.items.length} item{rq.items.length !== 1 ? 's' : ''}
                {rq.estado === 'ABIERTA' && ' - Esperando cantidades'}
              </>
            )}
          </span>
          {showFactura && (
            editMode ? (
              <button
                onClick={handleGuardarFacturas}
                disabled={guardarFacturas.isPending}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
                style={{ background: 'var(--color-primary)', color: '#fff', opacity: guardarFacturas.isPending ? 0.7 : 1 }}
              >
                {guardarFacturas.isPending && <Loader2 size={12} className="animate-spin" />}
                {guardarFacturas.isPending ? 'Guardando...' : 'Guardar facturas'}
              </button>
            ) : (
              <button
                onClick={() => setEditandoFacturas(true)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-75 transition-opacity"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)', border: '1px solid var(--color-border)' }}
              >
                Editar facturas
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

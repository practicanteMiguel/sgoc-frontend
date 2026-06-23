'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Loader2, ChevronDown, ChevronUp, Image as ImageIcon, CheckCircle2, X,
  FileDown, FileSpreadsheet, Plus, Trash2, ChevronLeft, ChevronRight, FileText, Package,
  Eye, BarChart2, type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAllDotacionSolicitudes, useGenerarDotacionRQ } from '@/src/hooks/dotaciones/use-dotaciones'
import { useRequisiciones, useRequisicion } from '@/src/hooks/consumables/use-requisiciones'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { ESTADO_DOTACION_LABELS, ESTADO_DOTACION_COLORS } from '@/src/types/dotaciones.types'
import { ESTADO_COLORS, ESTADO_LABELS } from '@/src/types/consumables.types'
import type { DotacionSolicitud, EstadoDotacion } from '@/src/types/dotaciones.types'
import type { Requisicion } from '@/src/types/consumables.types'
import { exportDotacionPdf, exportDotacionExcel } from '@/src/lib/dotacion-export'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type Tab = 'indumentaria' | 'requisiciones' | 'informe'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'indumentaria',  label: 'Indumentaria',  icon: Package   },
  { id: 'requisiciones', label: 'Requisiciones', icon: FileText  },
  { id: 'informe',       label: 'Informe',       icon: BarChart2 },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtCop(n: number): string {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function EstadoBadge({ estado }: { estado: EstadoDotacion }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
      style={{ background: ESTADO_DOTACION_COLORS[estado] + '22', color: ESTADO_DOTACION_COLORS[estado] }}
    >
      {ESTADO_DOTACION_LABELS[estado]}
    </span>
  )
}

// ── RQ exports ────────────────────────────────────────────────────────────────
async function exportRQPdf(rq: Requisicion) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const sorted = [...rq.items].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }))
  const totalEst = sorted.reduce((s, i) => i.valor_unitario != null ? s + Math.round(Number(i.solicitado ?? 0)) * i.valor_unitario : s, 0)
  const fmt = (v: number | null) => v != null ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v) : '-'

  const rows = sorted.map((item, i) => {
    const sol   = Math.round(Number(item.solicitado ?? 0))
    const total = item.valor_unitario != null ? sol * item.valor_unitario : null
    const td = (v: string, extra = '') => `<td style="padding:6px 5px;border:1px solid #e5e7eb;font-size:9px;${extra}">${v}</td>`
    return `<tr style="${i % 2 === 1 ? 'background:#f9fafb;' : ''}">
      ${td(item.codigo || '-', 'font-family:monospace;')}
      ${td(item.descripcion, 'word-break:break-word;')}
      ${td(item.unidad, 'text-align:center;')}
      ${td(fmt(item.valor_unitario), 'text-align:right;')}
      ${td(String(sol), 'text-align:center;font-weight:bold;')}
      ${td(fmt(total), 'text-align:right;font-weight:bold;')}
    </tr>`
  }).join('')

  const html = `<div style="font-family:Arial,sans-serif;padding:20px;color:#111;background:#fff;">
    <div style="display:flex;align-items:center;padding-bottom:14px;border-bottom:3px solid #1E4A8A;margin-bottom:18px;">
      <div style="flex:1;"><img src="${origin}/assets/logo-full.png" style="height:60px;width:auto;object-fit:contain;display:block;" onerror="this.style.visibility='hidden'"/></div>
      <div style="flex:1;text-align:center;">
        <div style="font-size:13px;font-weight:bold;color:#111;margin-bottom:3px;">SERVICIOS ASOCIADOS SAS.</div>
        <div style="font-size:12px;font-weight:bold;color:#1E4A8A;margin-bottom:4px;">Requisicion de Dotacion</div>
        <div style="font-size:11px;color:#555;">RQ #<strong>${rq.numero_rq}</strong></div>
      </div>
      <div style="flex:1;text-align:right;"><div style="font-size:9px;color:#6b7280;">Generado: ${new Date().toLocaleDateString('es-CO')}</div></div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:16px;">
      ${[['Solicitante', rq.nombre_solicitante ?? '-'],['Contrato', rq.numero_contrato ?? '-'],['Fecha', rq.fecha ?? '-'],['Lugar', rq.lugar ?? '-']].map(([l,v]) =>
        `<div style="flex:1;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;"><div style="font-size:9px;color:#6b7280;margin-bottom:2px;">${l}</div><div style="font-size:11px;font-weight:600;color:#111;">${v}</div></div>`
      ).join('')}
    </div>
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-family:Arial,sans-serif;margin-bottom:16px;">
      <colgroup><col style="width:10%"><col style="width:36%"><col style="width:8%"><col style="width:14%"><col style="width:8%"><col style="width:14%"></colgroup>
      <thead><tr style="background:#1a3a3a;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        ${['Codigo','Descripcion','Unidad','V. Unitario','Cant.','Total'].map(h => `<th style="padding:7px 5px;text-align:left;font-size:9px;border:1px solid #1a3a3a;">${h}</th>`).join('')}
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="background:#f3f4f6;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        <td colspan="5" style="padding:8px 5px;text-align:right;font-size:10px;font-weight:bold;border:1px solid #e5e7eb;color:#374151;">TOTAL GENERAL</td>
        <td style="padding:8px 5px;text-align:right;font-size:10px;font-weight:bold;border:1px solid #e5e7eb;color:#1a3a3a;">${fmt(totalEst)}</td>
      </tr></tfoot>
    </table>
  </div>`

  const { default: html2pdf } = await import('html2pdf.js')
  await html2pdf().set({
    margin: 8, filename: `RQ-Dotacion-${rq.numero_rq}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(html).save()
}

async function exportRQExcel(rq: Requisicion) {
  const excelModule = await import('exceljs')
  const ExcelJS = (excelModule as { default?: typeof excelModule }).default ?? excelModule
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('RQ Dotacion')
  ws.columns = [{ width: 14 }, { width: 36 }, { width: 10 }, { width: 16 }, { width: 10 }, { width: 16 }]

  const DARK = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a3a3a' } } as const
  const THIN = { style: 'thin', color: { argb: 'FFd1d5db' } } as const
  const BDR  = { top: THIN, left: THIN, bottom: THIN, right: THIN }

  ws.addRow([`RQ #${rq.numero_rq} - Requisicion de Dotacion`]).getCell(1).font = { bold: true, size: 11 }
  ws.addRow(['Solicitante:', rq.nombre_solicitante ?? '-', 'Contrato:', rq.numero_contrato ?? '-'])
  ws.addRow(['Fecha:', rq.fecha ?? '-', 'Lugar:', rq.lugar ?? '-'])
  ws.addRow([])

  const hdr = ws.addRow(['Codigo', 'Descripcion', 'Unidad', 'V. Unitario', 'Cantidad', 'Total'])
  hdr.eachCell((c) => {
    c.fill = DARK; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
    c.alignment = { horizontal: 'center', vertical: 'middle' }; c.border = BDR
  })

  const sorted = [...rq.items].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }))
  let total = 0
  sorted.forEach((item, i) => {
    const sol = Math.round(Number(item.solicitado ?? 0))
    const tot = item.valor_unitario != null ? sol * item.valor_unitario : null
    if (tot) total += tot
    const row = ws.addRow([item.codigo || '-', item.descripcion, item.unidad, item.valor_unitario, sol, tot])
    row.eachCell((c) => { c.border = BDR; c.font = { size: 9 } })
    if (i % 2 === 1) row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } } })
    row.getCell(4).numFmt = '"$"#,##0'; row.getCell(6).numFmt = '"$"#,##0'
  })

  const totRow = ws.addRow(['', '', '', '', 'TOTAL GENERAL', total])
  totRow.getCell(5).font = { bold: true, size: 9 }
  totRow.getCell(6).font = { bold: true, size: 9 }; totRow.getCell(6).numFmt = '"$"#,##0'
  totRow.eachCell((c) => { c.border = BDR })

  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  Object.assign(document.createElement('a'), { href: url, download: `RQ-Dotacion-${rq.numero_rq}.xlsx` }).click()
  URL.revokeObjectURL(url)
}

// ── RQ detail inline view ─────────────────────────────────────────────────────
function DotacionRQDetail({ rqId, onBack }: { rqId: string; onBack: () => void }) {
  const { data: rq, isLoading } = useRequisicion(rqId)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [loadingXls, setLoadingXls] = useState(false)

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
      </div>
    )
  }

  if (!rq) return null

  const estadoColor = ESTADO_COLORS[rq.estado] ?? '#6b7280'
  const sorted      = [...rq.items].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }))
  const totalEst    = sorted.reduce((s, i) => i.valor_unitario != null ? s + Math.round(Number(i.solicitado ?? 0)) * i.valor_unitario : s, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-semibold" style={{ color: 'var(--color-text-900)' }}>Requisicion #{rq.numero_rq}</p>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: estadoColor + '22', color: estadoColor }}>
                {ESTADO_LABELS[rq.estado]}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              Dotacion · CC 45 · {rq.lugar}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => { setLoadingXls(true); try { await exportRQExcel(rq) } finally { setLoadingXls(false) } }}
            disabled={loadingPdf || loadingXls}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
          >
            {loadingXls ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} Excel
          </button>
          <button
            onClick={async () => { setLoadingPdf(true); try { await exportRQPdf(rq) } finally { setLoadingPdf(false) } }}
            disabled={loadingPdf || loadingXls}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
          >
            {loadingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} PDF
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Solicitante',    value: rq.nombre_solicitante ?? '-'             },
          { label: 'Contrato',       value: rq.numero_contrato ?? '-'                },
          { label: 'Fecha',          value: rq.fecha ?? '-'                          },
          { label: 'Total estimado', value: totalEst > 0 ? fmtCop(totalEst) : '-'   },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-3" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-400)' }}>{label}</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Items table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                {['Codigo', 'Descripcion', 'Unidad', 'Valor Unit.', 'Solicitado', 'Total'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--color-text-400)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => {
                const sol   = Math.round(Number(item.solicitado ?? 0))
                const total = item.valor_unitario != null ? sol * item.valor_unitario : null
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--color-text-400)' }}>{item.codigo || '-'}</td>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-900)', minWidth: 200 }}>{item.descripcion}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{item.unidad}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-right whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>
                      {item.valor_unitario != null ? fmtCop(item.valor_unitario) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-center font-bold whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>{sol}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-right whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>
                      {total != null ? fmtCop(total) : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                <td colSpan={5} className="px-4 py-3 text-xs font-bold text-right" style={{ color: 'var(--color-text-600)' }}>TOTAL ESTIMADO</td>
                <td className="px-4 py-3 text-sm font-bold text-right" style={{ color: 'var(--color-secundary)' }}>{fmtCop(totalEst)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{sorted.length} item{sorted.length !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ── Generar RQ modal ──────────────────────────────────────────────────────────
interface ItemRow {
  _id: string
  codigo: string
  descripcion: string
  unidad: string
  tipo: 'ORDINARIA' | 'EXTRAORDINARIA'
  valorUnitario: string
  solicitado: string
}

function makeItem(): ItemRow {
  return { _id: Math.random().toString(36).slice(2), codigo: '', descripcion: '', unidad: 'UNIDAD', tipo: 'ORDINARIA', valorUnitario: '', solicitado: '1' }
}

function rowTotal(item: ItemRow): number {
  const v = parseFloat(item.valorUnitario)
  const s = parseInt(item.solicitado)
  return isNaN(v) || isNaN(s) ? 0 : v * s
}

function GenerarRQModal({
  sol,
  onClose,
  onDone,
}: {
  sol: DotacionSolicitud
  onClose: () => void
  onDone:  () => void
}) {
  const [numeroRQ, setNumeroRQ] = useState('')
  const [obs, setObs]           = useState('')
  const [items, setItems]       = useState<ItemRow[]>(() => [makeItem()])
  const generar = useGenerarDotacionRQ()

  function setField(id: string, field: keyof Omit<ItemRow, '_id'>, val: string) {
    setItems(prev => prev.map(it => it._id === id ? { ...it, [field]: val } : it))
  }

  const totalGeneral = items.reduce((s, it) => s + rowTotal(it), 0)

  function submit() {
    const num = parseInt(numeroRQ)
    if (isNaN(num) || num <= 0) { toast.error('Ingrese un numero de RQ valido'); return }
    if (items.length === 0) { toast.error('Agregue al menos un item'); return }
    const invalid = items.find(it => !it.descripcion.trim() || !it.unidad.trim() || !it.valorUnitario || !it.solicitado)
    if (invalid) { toast.error('Complete todos los campos requeridos de los items'); return }

    generar.mutate({
      id:                 sol.id,
      numero_rq:          num,
      fecha:              new Date().toISOString().split('T')[0],
      numero_contrato:    sol.contrato,
      nombre_solicitante: sol.inspeccion_realizada_por,
      estado:             'APROBADA',
      ...(obs.trim() ? { observaciones: obs.trim() } : {}),
      items: items.map(it => ({
        ...(it.codigo.trim() ? { codigo: it.codigo.trim() } : {}),
        descripcion:      it.descripcion.trim(),
        unidad:           it.unidad.trim(),
        tipo_requisicion: it.tipo,
        valor_unitario:   parseFloat(it.valorUnitario),
        solicitado:       parseInt(it.solicitado),
      })),
    }, { onSuccess: () => { onDone(); onClose() } })
  }

  const INP: React.CSSProperties = { border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none', width: '100%' }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Generar RQ</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{sol.campo?.name} · {sol.inspeccion_realizada_por}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {/* Meta read-only */}
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: 'Contrato',        value: sol.contrato                   },
              { label: 'Solicitante',     value: sol.inspeccion_realizada_por   },
              { label: 'Centro de costo', value: '45'                           },
            ] as const).map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-400)' }}>{label}</p>
                <p className="text-sm font-medium px-3 py-2 rounded-lg truncate" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-900)' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Numero RQ + Observaciones */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Numero RQ *</label>
              <input type="number" value={numeroRQ} onChange={e => setNumeroRQ(e.target.value)} placeholder="ej. 105" style={INP} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Observaciones</label>
              <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" style={INP} />
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-400)' }}>Items</p>
            <div className="flex flex-col gap-2">
              {items.map((item, idx) => (
                <div key={item._id} className="rounded-xl p-3 flex flex-col gap-2" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-400)' }}>Item {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => setItems(prev => prev.filter(it => it._id !== item._id))}
                        className="p-0.5 rounded transition-opacity hover:opacity-70" style={{ color: '#ef4444' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input value={item.codigo} onChange={e => setField(item._id, 'codigo', e.target.value)} placeholder="Codigo" style={INP} />
                    <input value={item.descripcion} onChange={e => setField(item._id, 'descripcion', e.target.value)} placeholder="Descripcion *" className="col-span-3" style={INP} />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input value={item.unidad} onChange={e => setField(item._id, 'unidad', e.target.value)} placeholder="Unidad *" style={INP} />
                    <select value={item.tipo} onChange={e => setField(item._id, 'tipo', e.target.value)} style={{ ...INP, appearance: 'none' as const }}>
                      <option value="ORDINARIA">Ordinaria</option>
                      <option value="EXTRAORDINARIA">Extraordinaria</option>
                    </select>
                    <input type="number" value={item.valorUnitario} onChange={e => setField(item._id, 'valorUnitario', e.target.value)} placeholder="Valor unit. *" style={INP} />
                    <input type="number" value={item.solicitado} onChange={e => setField(item._id, 'solicitado', e.target.value)} placeholder="Cant *" min="1" style={INP} />
                  </div>
                  {rowTotal(item) > 0 && (
                    <p className="text-xs text-right font-medium" style={{ color: 'var(--color-text-600)' }}>= {fmtCop(rowTotal(item))}</p>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setItems(prev => [...prev, makeItem()])}
              className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
            >
              <Plus size={13} /> Agregar item
            </button>
          </div>

          {totalGeneral > 0 && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-400)' }}>Total general</span>
              <span className="text-sm font-bold" style={{ color: 'var(--color-text-900)' }}>{fmtCop(totalGeneral)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-3 justify-end shrink-0" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={generar.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: '#1a3a3a', color: '#fff', opacity: generar.isPending ? 0.7 : 1 }}>
            {generar.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {generar.isPending ? 'Generando...' : 'Generar RQ'}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Solicitud detail modal ────────────────────────────────────────────────────
function SolicitudModal({
  sol,
  onClose,
}: {
  sol: DotacionSolicitud
  onClose: () => void
}) {
  const [lightbox, setLightbox]       = useState<string | null>(null)
  const [expanded, setExpanded]       = useState<Set<number>>(new Set([0]))
  const [loadingPdf, setLoadingPdf]   = useState(false)
  const [loadingXlsx, setLoadingXlsx] = useState(false)
  const [showGenerar, setShowGenerar] = useState(false)

  function toggle(i: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(i)) { next.delete(i) } else { next.add(i) }
      return next
    })
  }

  return (
    <>
      <ModalPortal onClose={onClose}>
        <div
          className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '85vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>{sol.campo?.name ?? '—'}</p>
                <EstadoBadge estado={sol.estado} />
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                {formatDate(sol.fecha)} &middot; {sol.contrato} &middot; {sol.inspeccion_realizada_por}
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg transition-opacity hover:opacity-70 shrink-0" style={{ color: 'var(--color-text-400)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Reposiciones */}
          <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
            {sol.reposiciones.map((repo, i) => (
              <div key={repo.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                <button type="button" onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  style={{ background: 'var(--color-surface-1)' }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{repo.empleado.first_name} {repo.empleado.last_name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{repo.empleado.position}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {repo.imagenes.length > 0 && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-400)' }}>
                        <ImageIcon size={11} />{repo.imagenes.length}
                      </span>
                    )}
                    {expanded.has(i)
                      ? <ChevronUp size={14} style={{ color: 'var(--color-text-400)' }} />
                      : <ChevronDown size={14} style={{ color: 'var(--color-text-400)' }} />}
                  </div>
                </button>

                {expanded.has(i) && (
                  <div className="px-4 pb-4 pt-3 flex flex-col gap-3" style={{ background: 'var(--color-surface-0)' }}>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-400)' }}>Condicion encontrada</p>
                      <p className="text-sm" style={{ color: 'var(--color-text-900)' }}>{repo.condicion_encontrada}</p>
                    </div>
                    {repo.fecha_entrega && (
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-400)' }}>Fecha entrega estimada</p>
                        <p className="text-sm" style={{ color: 'var(--color-text-900)' }}>{formatDate(repo.fecha_entrega)}</p>
                      </div>
                    )}
                    {repo.imagenes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {repo.imagenes.map(img => (
                          <button key={img.id} type="button" onClick={() => setLightbox(img.url)}
                            className="rounded-lg overflow-hidden transition-opacity hover:opacity-80 relative"
                            style={{ width: 64, height: 64, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', flexShrink: 0 }}>
                            <Image src={img.url} alt={img.original_name} fill className="object-cover" unoptimized />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Export buttons */}
          <div className="px-5 py-3 flex gap-2 shrink-0" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
            <button
              onClick={async () => { setLoadingPdf(true); try { await exportDotacionPdf(sol) } finally { setLoadingPdf(false) } }}
              disabled={loadingPdf || loadingXlsx}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
            >
              {loadingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} PDF
            </button>
            <button
              onClick={async () => { setLoadingXlsx(true); try { await exportDotacionExcel(sol) } finally { setLoadingXlsx(false) } }}
              disabled={loadingPdf || loadingXlsx}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
            >
              {loadingXlsx ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} Excel
            </button>
          </div>

          {sol.estado === 'autorizada' && (
            <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <button onClick={() => setShowGenerar(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold w-full justify-center"
                style={{ background: '#1a3a3a', color: '#fff' }}>
                <CheckCircle2 size={15} /> Generar RQ
              </button>
            </div>
          )}
        </div>
      </ModalPortal>

      {lightbox && (
        <ModalPortal onClose={() => setLightbox(null)}>
          <Image src={lightbox} alt="" width={1200} height={900} className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" unoptimized />
        </ModalPortal>
      )}
      {showGenerar && (
        <GenerarRQModal sol={sol} onClose={() => setShowGenerar(false)} onDone={onClose} />
      )}
    </>
  )
}

// ── Tab: Indumentaria ─────────────────────────────────────────────────────────
function IndumentariaTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 rounded-xl"
      style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface-1)' }}>
      <Package size={30} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-700)' }}>Indumentaria</p>
      <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>Esta seccion estara disponible proximamente</p>
    </div>
  )
}

// ── Tab: Informe ──────────────────────────────────────────────────────────────
function InformeTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 rounded-xl"
      style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface-1)' }}>
      <FileText size={30} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-700)' }}>Informe</p>
      <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>Esta seccion estara disponible proximamente</p>
    </div>
  )
}

// ── Tab: Requisiciones ────────────────────────────────────────────────────────
function RequisicionesTab() {
  const now = new Date()
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [selectedSol,   setSelectedSol]   = useState<DotacionSolicitud | null>(null)
  const [selectedRQId,  setSelectedRQId]  = useState<string | null>(null)

  function adjustPeriod(delta: number) {
    let m = mes + delta, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  const { data: solicitudes = [], isLoading: loadingSols } = useAllDotacionSolicitudes()
  const { data: requisiciones = [], isLoading: loadingRQs } = useRequisiciones({ mes, anio })

  const sols = solicitudes as DotacionSolicitud[]
  const rqs  = (Array.isArray(requisiciones) ? requisiciones : []).filter(r => r.categoria === 'DOTACION') as Requisicion[]

  if (selectedRQId) {
    return <DotacionRQDetail rqId={selectedRQId} onBack={() => setSelectedRQId(null)} />
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Reposiciones */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-700)' }}>Reposiciones</p>
          <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{sols.length} reposicion{sols.length !== 1 ? 'es' : ''}</p>
        </div>

        {loadingSols ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} /></div>
        ) : sols.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-xl"
            style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface-1)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>Sin reposiciones</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#1a3a3a', color: '#fff' }}>
                    {['Campo', 'Contrato', 'Inspector', 'Repos.', 'Estado', 'Fecha', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sols.map((sol, idx) => (
                    <tr key={sol.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}>
                      <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--color-text-900)' }}>{sol.campo?.name ?? '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-600)' }}>{sol.contrato}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-700)' }}>{sol.inspeccion_realizada_por}</td>
                      <td className="px-4 py-3 text-xs text-center" style={{ color: 'var(--color-text-700)' }}>{sol.reposiciones.length}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={sol.estado} /></td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{formatDate(sol.fecha)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedSol(sol)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                          title="Ver detalle"
                          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}>
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Requisiciones generadas */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-700)' }}>Requisiciones generadas</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg px-2 py-1.5"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}>
              <button onClick={() => adjustPeriod(-1)}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-text-700)' }}>
                <ChevronLeft size={13} />
              </button>
              <span className="text-xs font-semibold px-1 min-w-28 text-center" style={{ color: 'var(--color-text-900)' }}>
                {MESES[mes - 1]} {anio}
              </span>
              <button onClick={() => adjustPeriod(1)}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-text-700)' }}>
                <ChevronRight size={13} />
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{rqs.length} RQ{rqs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {loadingRQs ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} /></div>
        ) : rqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-xl"
            style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface-1)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>Sin requisiciones para {MESES[mes - 1]} {anio}</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#1a3a3a', color: '#fff' }}>
                    {['Numero RQ', 'Lugar', 'Estado', 'Fecha', 'Total', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rqs.map((rq, idx) => {
                    const color = ESTADO_COLORS[rq.estado] ?? '#6b7280'
                    return (
                      <tr key={rq.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}>
                        <td className="px-4 py-3 font-bold" style={{ color: 'var(--color-text-900)' }}>#{rq.numero_rq}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-700)' }}>{rq.lugar}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: color + '22', color }}>
                            {ESTADO_LABELS[rq.estado]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                          {rq.fecha ? formatDate(rq.fecha) : formatDate(rq.created_at)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>
                          {rq.total_general != null ? fmtCop(rq.total_general) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelectedRQId(rq.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                            title="Ver detalle"
                            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}>
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedSol && <SolicitudModal sol={selectedSol} onClose={() => setSelectedSol(null)} />}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function EncargadoDotacionTab() {
  const [tab, setTab] = useState<Tab>('requisiciones')

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface-2)' }}>
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={
                tab === t.id
                  ? { background: 'var(--color-surface-0)', color: 'var(--color-secundary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                  : { color: 'var(--color-text-400)' }
              }
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'indumentaria'  && <IndumentariaTab />}
      {tab === 'requisiciones' && <RequisicionesTab />}
      {tab === 'informe'       && <InformeTab />}
    </div>
  )
}

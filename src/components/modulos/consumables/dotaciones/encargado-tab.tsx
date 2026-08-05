'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { formatDateShort as formatDate } from '@/src/lib/utils'
import {
  Loader2, ChevronDown, ChevronUp, Image as ImageIcon, CheckCircle2, X,
  FileDown, FileSpreadsheet, Plus, Trash2, ChevronLeft, ChevronRight, FileText, Package,
  Eye, BarChart2, History, Search, PackagePlus, Calendar, PackageCheck, PenLine, type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAllDotacionSolicitudes, useGenerarDotacionRQ, useCrearRqDirecta } from '@/src/hooks/dotaciones/use-dotaciones'
import {
  useIndumentariaCatalog,
  useCreateIndumentariaItem,
  useUpdateIndumentariaItem,
  useEntregasPorNumeroRQ,
  useRegistrarEntregaBatch,
} from '@/src/hooks/dotaciones/use-indumentaria'
import type { TipoEntrega, IndumentariaItem } from '@/src/types/indumentaria.types'
import { useRequisiciones, useRequisicion } from '@/src/hooks/consumables/use-requisiciones'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { EntregaParcialBadge } from '@/src/components/modulos/consumables/entrega-parcial-badge'
import { ESTADO_DOTACION_LABELS, ESTADO_DOTACION_COLORS } from '@/src/types/dotaciones.types'
import { ESTADO_COLORS, ESTADO_LABELS } from '@/src/types/consumables.types'
import type { DotacionSolicitud, EstadoDotacion, Reposicion } from '@/src/types/dotaciones.types'
import type { Requisicion, RQItem } from '@/src/types/consumables.types'
import { exportDotacionPdf, exportDotacionExcel } from '@/src/lib/dotacion-export'
import type { ImageRange } from 'exceljs'
import { TallaPicker, useSignatureCanvas, type TipoTalla } from './entrega-shared'
import { HistorialGeneralTab } from './historial-general-tab'
import { InformeDotacionesTab } from './informe-dotaciones-tab'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type Tab = 'indumentaria' | 'requisiciones' | 'historial' | 'informe'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'indumentaria',  label: 'Indumentaria',  icon: Package   },
  { id: 'requisiciones', label: 'Requisiciones', icon: FileText  },
  { id: 'historial',     label: 'Historial',     icon: History   },
  { id: 'informe',       label: 'Informe',       icon: BarChart2 },
]


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

function totalGeneralRQ(items: RQItem[]) {
  return items.reduce((sum, i) => {
    if (i.solicitado === null || i.valor_unitario === null) return sum
    return sum + i.solicitado * i.valor_unitario
  }, 0)
}

async function exportRQExcel(rq: Requisicion) {
  const [excelModule, { fetchLogoBuffer }, { fetchFirmaUrl }, { getAuthState }] = await Promise.all([
    import('exceljs'),
    import('@/src/lib/report-header'),
    import('@/src/lib/firma'),
    import('@/src/stores/auth.store'),
  ])
  const ExcelJS = (excelModule as unknown as { default?: typeof excelModule }).default ?? excelModule
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(`RQ-${rq.numero_rq}`)

  const encargadoFirmaUrl = await fetchFirmaUrl()
  const encargadoUser2    = getAuthState().user
  const encargadoNombre2  = encargadoUser2 ? `${encargadoUser2.first_name} ${encargadoUser2.last_name}` : ''
  async function fetchBuf(url: string): Promise<ArrayBuffer | null> {
    try { const r = await fetch(url); return r.ok ? r.arrayBuffer() : null } catch { return null }
  }

  const hasFactura = rq.items.some((i) => i.numero_factura !== null || i.precio_real !== null)

  const HEADERS = hasFactura
    ? ['Codigo','Descripcion','Unidad','Proveedor Ord.','Proveedor Ext.','Valor Unitario','Cantidad','Total','N. Factura','V. Real','Diferencia','Prov. Real']
    : ['Codigo','Descripcion','Unidad','Proveedor Ord.','Proveedor Ext.','Valor Unitario','Cantidad','Total']
  const COL_WIDTHS = hasFactura
    ? [14, 38, 10, 22, 22, 18, 12, 18, 18, 18, 18, 22]
    : [14, 38, 10, 22, 22, 18, 12, 18]
  const numCols = HEADERS.length

  ws.columns = COL_WIDTHS.map((width) => ({ width }))

  const thin       = { style: 'thin' } as const
  const allBorders = { top: thin, bottom: thin, left: thin, right: thin }
  const copFmt     = '"$"#,##0'

  // Row 1: logo header (solo Servicios Asociados)
  ws.getRow(1).height = 68
  ws.mergeCells(1, 2, 1, numCols)
  const titleCell     = ws.getCell(1, 2)
  titleCell.value     = `SERVICIOS ASOCIADOS SAS.\nREQUISICION DE DOTACION  |  RQ #${rq.numero_rq}\nCC: ${rq.lote}  |  Lugar: ${rq.lugar}`
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  titleCell.font      = { bold: true, size: 10 }

  const logoBuf = await fetchLogoBuffer('/assets/logo-full.png')
  if (logoBuf) {
    const id = wb.addImage({ buffer: logoBuf, extension: 'png' })
    ws.addImage(id, { tl: { col: 0.05, row: 0.05 }, br: { col: 1.9, row: 0.95 } } as unknown as ImageRange)
  }

  // Row 2: blue separator
  ws.getRow(2).height = 4
  for (let c = 1; c <= numCols; c++) {
    ws.getCell(2, c).border = { bottom: { style: 'medium', color: { argb: 'FF1E4A8A' } } }
  }

  // Row 3: info block
  ws.getRow(3).height = 18
  ws.mergeCells(3, 1, 3, 4)
  ws.getCell(3, 1).value     = `Solicitante: ${rq.nombre_solicitante ?? '-'}   |   Contrato: ${rq.numero_contrato ?? '-'}`
  ws.getCell(3, 1).font      = { size: 10 }
  ws.getCell(3, 1).alignment = { vertical: 'middle' }
  ws.mergeCells(3, 5, 3, numCols)
  ws.getCell(3, 5).value     = `Fecha: ${rq.fecha ?? '-'}   |   Estado: ${ESTADO_LABELS[rq.estado]}`
  ws.getCell(3, 5).font      = { size: 10 }
  ws.getCell(3, 5).alignment = { vertical: 'middle' }

  // Row 4: column headers
  const hdrRow = ws.getRow(4)
  hdrRow.height = 26
  HEADERS.forEach((h, i) => {
    const cell     = hdrRow.getCell(i + 1)
    cell.value     = h
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } }
    cell.font      = { bold: true, size: 10, color: { argb: 'FF000000' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border    = allBorders
  })

  // Data rows
  const items = [...rq.items].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }))
  for (let ri = 0; ri < items.length; ri++) {
    const item    = items[ri]
    const rowNum  = 5 + ri
    const row     = ws.getRow(rowNum)
    row.height    = 18
    const bgColor = ri % 2 !== 0 ? 'FFF3F4F6' : 'FFFFFFFF'

    const diff = item.precio_real != null && item.valor_unitario !== null && item.solicitado !== null
      ? (item.precio_real - item.valor_unitario) * item.solicitado
      : null

    const cols = [
      { v: item.codigo,                          align: 'left',   numFmt: null   },
      { v: item.descripcion,                     align: 'left',   numFmt: null   },
      { v: item.unidad,                          align: 'center', numFmt: null   },
      { v: item.proveedor_ordinario     ?? '',   align: 'left',   numFmt: null   },
      { v: item.proveedor_extraordinario ?? '',  align: 'left',   numFmt: null   },
      { v: item.valor_unitario          ?? '',   align: 'right',  numFmt: copFmt },
      { v: item.solicitado              ?? '',   align: 'center', numFmt: null   },
      { v: item.total                   ?? '',   align: 'right',  numFmt: copFmt },
      ...(hasFactura ? [
        { v: item.numero_factura        ?? '',   align: 'left',   numFmt: null   },
        { v: item.precio_real           ?? '',   align: 'right',  numFmt: copFmt },
        { v: diff                       ?? '',   align: 'right',  numFmt: copFmt },
        { v: item.proveedor_factura     ?? '',   align: 'left',   numFmt: null   },
      ] : []),
    ]
    cols.forEach(({ v, align, numFmt }, ci) => {
      const cell     = row.getCell(ci + 1)
      cell.value     = v
      cell.alignment = { vertical: 'middle', horizontal: align as 'left' | 'center' | 'right', wrapText: true }
      cell.border    = allBorders
      cell.font      = { size: 10 }
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      if (numFmt) cell.numFmt = numFmt
    })
  }

  // Total row
  const totalRowNum = 5 + items.length
  const totalRow    = ws.getRow(totalRowNum)
  totalRow.height   = 22
  const grayFill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } } as const

  if (hasFactura) {
    // Estimated: cols 1-7 label, col 8 value
    ws.mergeCells(totalRowNum, 1, totalRowNum, 7)
    const lbl = totalRow.getCell(1)
    lbl.value = 'TOTAL GENERAL'; lbl.font = { bold: true, size: 11 }; lbl.alignment = { horizontal: 'right', vertical: 'middle' }; lbl.border = allBorders; lbl.fill = grayFill
    const tot = totalRow.getCell(8)
    tot.value = totalGeneralRQ(rq.items); tot.numFmt = copFmt; tot.font = { bold: true, size: 11 }; tot.alignment = { horizontal: 'right', vertical: 'middle' }; tot.border = allBorders; tot.fill = grayFill
    // Real: col 9 label, col 10 value
    const realTotalVal = rq.items.reduce((sum, i) => (i.precio_real != null && i.solicitado != null ? sum + i.precio_real * i.solicitado : sum), 0)
    const realLbl = totalRow.getCell(9)
    realLbl.value = 'TOTAL REAL'; realLbl.font = { bold: true, size: 11 }; realLbl.alignment = { horizontal: 'right', vertical: 'middle' }; realLbl.border = allBorders; realLbl.fill = grayFill
    const realTot = totalRow.getCell(10)
    realTot.value = realTotalVal; realTot.numFmt = copFmt; realTot.font = { bold: true, size: 11 }; realTot.alignment = { horizontal: 'right', vertical: 'middle' }; realTot.border = allBorders; realTot.fill = grayFill
    for (const c of [11, 12]) { const cell = totalRow.getCell(c); cell.border = allBorders; cell.fill = grayFill }
  } else {
    ws.mergeCells(totalRowNum, 1, totalRowNum, numCols - 1)
    const lbl     = totalRow.getCell(1)
    lbl.value     = 'TOTAL GENERAL'
    lbl.font      = { bold: true, size: 11 }
    lbl.alignment = { horizontal: 'right', vertical: 'middle' }
    lbl.border    = allBorders
    lbl.fill      = grayFill
    const tot     = totalRow.getCell(numCols)
    tot.value     = totalGeneralRQ(rq.items)
    tot.numFmt    = copFmt
    tot.font      = { bold: true, size: 11 }
    tot.alignment = { horizontal: 'right', vertical: 'middle' }
    tot.border    = allBorders
    tot.fill      = grayFill
  }

  // Signature section
  const midCol      = Math.floor(numCols / 2)
  const sigHdrRow   = totalRowNum + 2
  const sigNombreRow = sigHdrRow + 1
  const sigFirmaStart = sigNombreRow + 1
  const sigFirmaEnd   = sigFirmaStart + 4
  const grayHdrFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } } as const

  ws.getRow(totalRowNum + 1).height = 8
  ws.getRow(sigHdrRow).height = 14
  ws.getRow(sigNombreRow).height = 16
  for (let r = sigFirmaStart; r <= sigFirmaEnd; r++) ws.getRow(r).height = 18

  ws.mergeCells(sigHdrRow, 1, sigHdrRow, midCol)
  const supHdr = ws.getCell(sigHdrRow, 1)
  supHdr.value = 'RESPONSABLE SOLICITUD'; supHdr.font = { bold: true, size: 10 }
  supHdr.alignment = { horizontal: 'center', vertical: 'middle' }; supHdr.fill = grayHdrFill; supHdr.border = allBorders

  ws.mergeCells(sigHdrRow, midCol + 1, sigHdrRow, numCols)
  const encHdr = ws.getCell(sigHdrRow, midCol + 1)
  encHdr.value = 'RESPONSABLE AUTORIZACION'; encHdr.font = { bold: true, size: 10 }
  encHdr.alignment = { horizontal: 'center', vertical: 'middle' }; encHdr.fill = grayHdrFill; encHdr.border = allBorders

  ws.mergeCells(sigNombreRow, 1, sigNombreRow, midCol)
  const supNom = ws.getCell(sigNombreRow, 1)
  supNom.value = `Nombre: ${rq.nombre_solicitante ?? ''}`; supNom.font = { size: 10 }
  supNom.alignment = { horizontal: 'left', vertical: 'middle' }; supNom.border = allBorders

  ws.mergeCells(sigNombreRow, midCol + 1, sigNombreRow, numCols)
  const encNom = ws.getCell(sigNombreRow, midCol + 1)
  encNom.value = `Nombre: ${encargadoNombre2}`; encNom.font = { size: 10 }
  encNom.alignment = { horizontal: 'left', vertical: 'middle' }; encNom.border = allBorders

  for (let r = sigFirmaStart; r <= sigFirmaEnd; r++) {
    ws.mergeCells(r, 1, r, midCol)
    ws.getCell(r, 1).border = allBorders
    ws.mergeCells(r, midCol + 1, r, numCols)
    ws.getCell(r, midCol + 1).border = allBorders
  }

  if (rq.firma_supervisor_url) {
    const buf2 = await fetchBuf(rq.firma_supervisor_url)
    if (buf2) {
      const imgId = wb.addImage({ buffer: buf2, extension: 'png' })
      ws.addImage(imgId, { tl: { col: 0.1, row: sigFirmaStart - 0.9 }, br: { col: midCol - 0.1, row: sigFirmaEnd - 0.1 } } as unknown as ImageRange)
    }
  }
  if (encargadoFirmaUrl) {
    const buf2 = await fetchBuf(encargadoFirmaUrl)
    if (buf2) {
      const imgId = wb.addImage({ buffer: buf2, extension: 'png' })
      ws.addImage(imgId, { tl: { col: midCol + 0.1, row: sigFirmaStart - 0.9 }, br: { col: numCols - 0.1, row: sigFirmaEnd - 0.1 } } as unknown as ImageRange)
    }
  }

  const buf  = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `RQ-${rq.numero_rq}-DOTACION.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Constancia de entrega (PDF) ────────────────────────────────────────────
async function exportConstanciaDotacionPdf(rq: Requisicion) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const items  = [...rq.items].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }))
  const receptorLabel = [rq.nombre_receptor, rq.cargo_receptor].filter(Boolean).join(' · ') || '-'
  const fmt = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

  const header = `
<div style="display:flex;align-items:center;padding-bottom:14px;border-bottom:3px solid #1E4A8A;margin-bottom:20px;">
  <div style="flex:1;"><img src="${origin}/assets/logo-full.png" style="height:62px;width:auto;object-fit:contain;display:block;" onerror="this.style.visibility='hidden'" /></div>
  <div style="flex:1;text-align:center;">
    <div style="font-size:13px;font-weight:bold;color:#111;margin-bottom:3px;">SERVICIOS ASOCIADOS SAS.</div>
    <div style="font-size:12px;font-weight:bold;color:#1E4A8A;margin-bottom:4px;">Constancia de Entrega de Dotacion</div>
    <div style="font-size:11px;color:#555;">RQ #<strong>${rq.numero_rq}</strong></div>
    <div style="font-size:11px;color:#555;margin-top:1px;">CC: <strong>${rq.lote}</strong> &nbsp;&middot;&nbsp; Lugar: <strong>${rq.lugar}</strong></div>
  </div>
  <div style="flex:1;text-align:right;">
    <div style="font-size:9px;color:#6b7280;">Generado: ${new Date().toLocaleDateString('es-CO')}</div>
    <div style="display:inline-block;margin-top:4px;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:bold;background:${rq.entrega_completa ? 'rgba(22,163,74,0.15)' : 'rgba(245,158,11,0.15)'};color:${rq.entrega_completa ? '#15803d' : '#b45309'};">
      ${rq.entrega_completa ? 'Entrega completa' : 'Entrega parcial'}
    </div>
  </div>
</div>`

  const infoHtml = `
    <div style="display:flex;gap:10px;margin-bottom:18px;">
      ${[
        ['Receptor',         receptorLabel],
        ['Fecha de entrega', rq.fecha_entrega ?? '-'],
        ['Total solicitado', rq.total_solicitado != null ? `${rq.total_solicitado} uds` : '-'],
        ['Total recibido',   rq.total_recibido   != null ? `${rq.total_recibido} uds`   : '-'],
      ].map(([label, value]) => `
        <div style="flex:1;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;">
          <div style="font-size:9px;color:#6b7280;margin-bottom:2px;">${label}</div>
          <div style="font-size:11px;font-weight:600;color:#111;">${value}</div>
        </div>`).join('')}
    </div>`

  const totalEstCOP = items.reduce((s, i) => i.valor_unitario != null ? s + Math.round(Number(i.solicitado ?? 0)) * i.valor_unitario : s, 0)
  const totalRecCOP = items.reduce((s, i) => i.valor_unitario != null ? s + Math.round(Number(i.recibido   ?? 0)) * i.valor_unitario : s, 0)

  const rows = items.map((item, i) => {
    const sol      = Math.round(Number(item.solicitado ?? 0))
    const rec      = Math.round(Number(item.recibido   ?? 0))
    const diff     = rec - sol
    const totEst   = item.valor_unitario != null ? sol * item.valor_unitario : null
    const totRec   = item.valor_unitario != null ? rec * item.valor_unitario : null
    const recColor  = rec === sol ? '#16a34a' : rec < sol ? '#ef4444' : '#3b82f6'
    const diffColor = diff === 0  ? '#16a34a' : diff < 0  ? '#ef4444' : '#3b82f6'
    const td = (val: string, extra = '') => `<td style="padding:6px 5px;border:1px solid #e5e7eb;font-size:9px;${extra}">${val}</td>`
    return `<tr style="${i % 2 === 1 ? 'background:#f9fafb;' : ''}">
      ${td(item.codigo,      'font-family:monospace;')}
      ${td(item.descripcion, 'word-break:break-word;')}
      ${td(item.unidad,      'text-align:center;')}
      ${td(item.valor_unitario != null ? fmt(item.valor_unitario) : '-', 'text-align:right;')}
      ${td(String(sol),      'text-align:center;font-weight:bold;')}
      ${td(totEst != null ? fmt(totEst) : '-', 'text-align:right;')}
      ${td(String(rec),      `text-align:center;font-weight:bold;color:${recColor};`)}
      ${td(totRec != null ? fmt(totRec) : '-', `text-align:right;font-weight:bold;color:${totRec != null && totEst != null && totRec < totEst ? '#ef4444' : '#16a34a'};`)}
      ${td(diff === 0 ? '=' : (diff > 0 ? '+' : '') + String(diff), `text-align:center;font-weight:bold;color:${diffColor};`)}
    </tr>`
  }).join('')

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-family:Arial,sans-serif;margin-bottom:20px;">
      <colgroup>
        <col style="width:10%"><col style="width:30%"><col style="width:8%">
        <col style="width:12%"><col style="width:8%"><col style="width:12%">
        <col style="width:8%"><col style="width:12%">
      </colgroup>
      <thead>
        <tr style="background:#1a3a3a;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <th style="padding:7px 5px;text-align:left;font-size:9px;border:1px solid #1a3a3a;">Codigo</th>
          <th style="padding:7px 5px;text-align:left;font-size:9px;border:1px solid #1a3a3a;">Descripcion</th>
          <th style="padding:7px 5px;text-align:center;font-size:9px;border:1px solid #1a3a3a;">Unidad</th>
          <th style="padding:7px 5px;text-align:right;font-size:9px;border:1px solid #1a3a3a;">V. Unitario</th>
          <th style="padding:7px 5px;text-align:center;font-size:9px;border:1px solid #1a3a3a;">Solicitado</th>
          <th style="padding:7px 5px;text-align:right;font-size:9px;border:1px solid #1a3a3a;">Total Est.</th>
          <th style="padding:7px 5px;text-align:center;font-size:9px;border:1px solid #1a3a3a;">Recibido</th>
          <th style="padding:7px 5px;text-align:right;font-size:9px;border:1px solid #1a3a3a;">Total Rec.</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#f3f4f6;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <td colspan="4" style="padding:8px 5px;text-align:right;font-size:10px;font-weight:bold;border:1px solid #e5e7eb;color:#374151;">TOTALES</td>
          <td style="padding:8px 5px;text-align:center;font-size:10px;font-weight:bold;border:1px solid #e5e7eb;color:#111;">${rq.total_solicitado ?? '-'} uds</td>
          <td style="padding:8px 5px;text-align:right;font-size:10px;font-weight:bold;border:1px solid #e5e7eb;color:#1a3a3a;">${fmt(totalEstCOP)}</td>
          <td style="padding:8px 5px;text-align:center;font-size:10px;font-weight:bold;border:1px solid #e5e7eb;color:${rq.entrega_completa ? '#16a34a' : '#ef4444'};">${rq.total_recibido ?? '-'} uds</td>
          <td style="padding:8px 5px;text-align:right;font-size:10px;font-weight:bold;border:1px solid #e5e7eb;color:${rq.entrega_completa ? '#16a34a' : '#ef4444'};">${fmt(totalRecCOP)}</td>
        </tr>
      </tfoot>
    </table>`

  const sigHtml = rq.firma_recepcion_url
    ? `<img src="${rq.firma_recepcion_url}" crossorigin="anonymous" style="max-height:100px;width:auto;object-fit:contain;display:block;margin-top:8px;" />`
    : '<div style="height:80px;border-bottom:2px solid #374151;margin:8px 0 0;"></div>'

  const footer = `
<div style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
  <div style="padding:16px 20px;">
    <div style="font-size:10px;font-weight:bold;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">
      FIRMA DEL RECEPTOR
    </div>
    <div style="font-size:10px;color:#6b7280;margin-bottom:2px;">Nombre: <span style="color:#111;font-weight:600;">${receptorLabel}</span></div>
    <div style="font-size:10px;color:#6b7280;margin-bottom:6px;">Fecha de entrega: <span style="color:#111;font-weight:600;">${rq.fecha_entrega ?? '-'}</span></div>
    ${sigHtml}
  </div>
</div>`

  const html = `<div style="font-family:Arial,sans-serif;padding:20px;color:#111;background:#fff;">${header}${infoHtml}${tableHtml}${footer}</div>`
  const { default: html2pdf } = await import('html2pdf.js')
  await html2pdf().set({
    margin:      8,
    filename:    `Constancia-Entrega-RQ-${rq.numero_rq}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(html).save()
}

// ── RQ detail inline view ─────────────────────────────────────────────────────
function DotacionRQDetail({ rqId, onBack }: { rqId: string; onBack: () => void }) {
  const { data: rq, isLoading } = useRequisicion(rqId)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [loadingXls, setLoadingXls] = useState(false)
  const [loadingConstancia, setLoadingConstancia] = useState(false)
  const [showRecepcion, setShowRecepcion] = useState<boolean | null>(null)

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
  const totalRecCOP = sorted.reduce((s, i) => i.valor_unitario != null ? s + Math.round(Number(i.recibido   ?? 0)) * i.valor_unitario : s, 0)
  const isEntregado = rq.recepcion_completada || rq.estado === 'ENTREGADO'
  const showEv      = (showRecepcion ?? isEntregado) && isEntregado

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
              Dotacion · CC {rq.lote} · {rq.lugar}
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
        {/* Toggle bar - solo cuando hay entrega */}
        {isEntregado && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 flex-wrap"
            style={{ background: showEv ? 'rgba(22,163,74,0.05)' : 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}
          >
            <PackageCheck size={14} style={{ color: showEv ? '#16a34a' : 'var(--color-text-400)' }} />
            <span className="text-xs font-semibold" style={{ color: showEv ? '#15803d' : 'var(--color-text-600)' }}>
              Evidencia de recepcion
            </span>
            {showEv && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={rq.entrega_completa
                  ? { background: 'rgba(22,163,74,0.15)', color: '#15803d' }
                  : { background: 'rgba(245,158,11,0.15)', color: '#b45309' }}
              >
                {rq.entrega_completa ? 'Entrega completa' : 'Entrega parcial'}
              </span>
            )}
            {showEv && rq.tiene_faltante && (
              <EntregaParcialBadge fechaPrimeraEntrega={rq.fecha_primera_entrega} categoria={rq.categoria} itemsPendientes={rq.items_pendientes} />
            )}
            {showEv && (
              <button
                onClick={async () => { setLoadingConstancia(true); try { await exportConstanciaDotacionPdf(rq) } finally { setLoadingConstancia(false) } }}
                disabled={loadingConstancia}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)', opacity: loadingConstancia ? 0.6 : 1 }}
              >
                {loadingConstancia ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                Constancia PDF
              </button>
            )}
            <button
              onClick={() => setShowRecepcion(!showEv)}
              className="ml-auto relative rounded-full shrink-0"
              style={{ width: 40, height: 22, background: showEv ? '#16a34a' : 'var(--color-border)', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <span
                className="absolute top-1 w-4 h-4 bg-white rounded-full"
                style={{ left: showEv ? 20 : 2, transition: 'left 0.15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
              />
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                {[
                  { label: 'Codigo',      align: 'text-left'   },
                  { label: 'Descripcion', align: 'text-left'   },
                  { label: 'Unidad',      align: 'text-left'   },
                  { label: 'Valor Unit.', align: 'text-right'  },
                  { label: 'Solicitado',  align: 'text-center' },
                  { label: 'Total',       align: 'text-right'  },
                ].map(({ label, align }) => (
                  <th key={label} className={`${align} px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap`}
                    style={{ color: 'var(--color-text-400)' }}>{label}</th>
                ))}
                {showEv && (
                  <>
                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: '#16a34a', borderLeft: '2px solid var(--color-border)' }}>Recibido</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: '#16a34a' }}>Total Rec.</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--color-text-400)' }}>Diferencia</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => {
                const sol   = Math.round(Number(item.solicitado ?? 0))
                const total = item.valor_unitario != null ? sol * item.valor_unitario : null
                const rec    = Math.round(Number(item.recibido ?? 0))
                const diff   = rec - sol
                const totRec = item.valor_unitario != null ? rec * item.valor_unitario : null
                const recColor  = rec === sol ? '#16a34a' : rec < sol ? '#ef4444' : '#3b82f6'
                const diffColor = diff === 0  ? '#16a34a' : diff < 0  ? '#ef4444' : '#3b82f6'
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
                    {showEv && (
                      <>
                        <td className="px-4 py-3 text-xs text-center font-bold whitespace-nowrap" style={{ color: recColor, borderLeft: '2px solid var(--color-border)' }}>{rec}</td>
                        <td className="px-4 py-3 text-xs text-right font-semibold whitespace-nowrap" style={{ color: totRec != null && total != null && totRec < total ? '#ef4444' : '#16a34a' }}>
                          {totRec != null ? fmtCop(totRec) : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-center font-bold whitespace-nowrap" style={{ color: diffColor }}>
                          {diff === 0 ? '=' : (diff > 0 ? '+' : '') + diff}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                <td colSpan={5} className="px-4 py-3 text-xs font-bold text-right" style={{ color: 'var(--color-text-600)' }}>TOTAL ESTIMADO</td>
                <td className="px-4 py-3 text-sm font-bold text-right" style={{ color: 'var(--color-secundary)' }}>{fmtCop(totalEst)}</td>
                {showEv && (
                  <>
                    <td className="px-4 py-3 text-xs text-center font-bold whitespace-nowrap"
                      style={{ color: rq.entrega_completa ? '#16a34a' : '#f59e0b', borderLeft: '2px solid var(--color-border)' }}>
                      {rq.total_recibido != null ? `${rq.total_recibido} uds` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-right whitespace-nowrap"
                      style={{ color: rq.entrega_completa ? '#16a34a' : '#f59e0b' }}>
                      {totalRecCOP > 0 ? fmtCop(totalRecCOP) : '-'}
                    </td>
                    <td></td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Info + firma cuando esta activa la evidencia */}
        {showEv && (
          <>
            <div className="px-4 pt-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              {[
                { label: 'Receptor', value: [rq.nombre_receptor, rq.cargo_receptor].filter(Boolean).join(' · ') || '-' },
                { label: 'Fecha de entrega', value: rq.fecha_entrega ?? '-' },
                { label: 'Total solicitado', value: rq.total_solicitado != null ? `${rq.total_solicitado} uds` : '-' },
                { label: 'Total recibido', value: rq.total_recibido != null ? `${rq.total_recibido} uds` : '-' },
              ].map(({ label, value }, i) => (
                <div key={label}>
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{label}</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: i === 3 ? (rq.entrega_completa ? '#16a34a' : '#f59e0b') : 'var(--color-text-900)' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-4 py-4 flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-400)' }}>Firma del receptor</p>
              {rq.firma_recepcion_url ? (
                <div
                  className="rounded-lg inline-flex items-center justify-center p-3 mt-1"
                  style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', alignSelf: 'flex-start' }}
                >
                  <Image src={rq.firma_recepcion_url} alt="Firma receptor" width={200} height={80} style={{ maxHeight: 80, width: 'auto', objectFit: 'contain' }} unoptimized />
                </div>
              ) : (
                <div
                  className="h-16 rounded-lg mt-1 flex items-center justify-center"
                  style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface-1)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin firma registrada</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{sorted.length} item{sorted.length !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ── Generar RQ modal ──────────────────────────────────────────────────────────
interface ItemRow {
  _id: string
  indumentariaId: string
  tipo: 'ORDINARIA' | 'EXTRAORDINARIA'
  valorUnitario: string
  solicitado: string
}

function makeItem(): ItemRow {
  return { _id: Math.random().toString(36).slice(2), indumentariaId: '', tipo: 'ORDINARIA', valorUnitario: '', solicitado: '1' }
}

function rowTotal(item: ItemRow): number {
  const v = parseFloat(item.valorUnitario)
  const s = parseInt(item.solicitado)
  return isNaN(v) || isNaN(s) ? 0 : v * s
}

const PICKER_INP: React.CSSProperties = {
  border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)',
  borderRadius: 8, padding: '6px 10px 6px 28px', fontSize: 12, outline: 'none', width: '100%',
}

// ── Selector de item del catalogo de indumentaria ──────────────────────────
function IndumentariaPicker({
  catalog,
  selectedId,
  onSelect,
}: {
  catalog: IndumentariaItem[]
  selectedId: string
  onSelect: (item: IndumentariaItem) => void
}) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)
  const selected = catalog.find(c => c.id === selectedId) ?? null

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  const filtered = catalog.filter(c => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return c.nombre.toLowerCase().includes(q) || (c.codigo ?? '').toLowerCase().includes(q)
  })

  if (selected && !open) {
    return (
      <div className="col-span-4 flex items-center justify-between gap-2 rounded-lg px-3 py-2"
        style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)' }}>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
            {selected.codigo ? `${selected.codigo} · ` : ''}{selected.nombre}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{selected.unidad}</p>
        </div>
        <button type="button" onClick={() => { setQuery(''); setOpen(true) }}
          className="text-xs font-medium shrink-0 px-2 py-1 rounded-md transition-opacity hover:opacity-70"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}>
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div className="col-span-4 relative" ref={boxRef}>
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-400)' }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar item del catalogo *"
          style={PICKER_INP}
        />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-y-auto z-10"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: 190 }}>
          {filtered.length === 0 ? (
            <p className="text-xs px-3 py-2" style={{ color: 'var(--color-text-400)' }}>Sin resultados</p>
          ) : filtered.slice(0, 30).map(c => (
            <button key={c.id} type="button"
              onClick={() => { onSelect(c); setOpen(false); setQuery('') }}
              className="w-full text-left px-3 py-2 text-xs transition-colors hover:opacity-80"
              style={{ borderBottom: '1px solid var(--color-border)' }}>
              <span className="font-semibold" style={{ color: 'var(--color-text-900)' }}>{c.nombre}</span>
              <span style={{ color: 'var(--color-text-400)' }}> &middot; {c.codigo || 's/codigo'} &middot; {c.unidad}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
  const [cc, setCc]             = useState('45')
  const [obs, setObs]           = useState('')
  const [items, setItems]       = useState<ItemRow[]>(() => [makeItem()])
  const generar = useGenerarDotacionRQ()
  const { data: catalogRaw } = useIndumentariaCatalog()
  const catalog = (Array.isArray(catalogRaw) ? catalogRaw : []).filter(c => c.activo)

  function setField(id: string, field: keyof Omit<ItemRow, '_id'>, val: string) {
    setItems(prev => prev.map(it => it._id === id ? { ...it, [field]: val } : it))
  }

  function selectIndumentaria(id: string, item: IndumentariaItem) {
    setItems(prev => prev.map(it => it._id === id
      ? { ...it, indumentariaId: item.id, valorUnitario: it.valorUnitario || (item.valor_unitario != null ? String(item.valor_unitario) : '') }
      : it))
  }

  const totalGeneral = items.reduce((s, it) => s + rowTotal(it), 0)

  function submit() {
    const num = parseInt(numeroRQ)
    if (isNaN(num) || num <= 0) { toast.error('Ingrese un numero de RQ valido'); return }
    if (items.length === 0) { toast.error('Agregue al menos un item'); return }
    const invalid = items.find(it => !it.indumentariaId || !it.valorUnitario || !it.solicitado)
    if (invalid) { toast.error('Complete todos los campos requeridos de los items'); return }

    generar.mutate({
      id:                 sol.id,
      numero_rq:          num,
      fecha:              new Date().toISOString().split('T')[0],
      numero_contrato:    sol.contrato,
      nombre_solicitante: sol.inspeccion_realizada_por,
      estado:             'APROBADA',
      lote:               parseInt(cc) || 45,
      ...(obs.trim() ? { observaciones: obs.trim() } : {}),
      items: items.map(it => ({
        indumentaria_id:  it.indumentariaId,
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
          {/* Meta */}
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: 'Contrato',    value: sol.contrato                 },
              { label: 'Solicitante', value: sol.inspeccion_realizada_por },
            ] as const).map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-400)' }}>{label}</p>
                <p className="text-sm font-medium px-3 py-2 rounded-lg truncate" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-900)' }}>{value}</p>
              </div>
            ))}
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Centro de costo (CC)</label>
              <input type="number" value={cc} onChange={e => setCc(e.target.value)} placeholder="45" style={INP} />
            </div>
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
                    <IndumentariaPicker
                      catalog={catalog}
                      selectedId={item.indumentariaId}
                      onSelect={i => selectIndumentaria(item._id, i)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
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
  initialRepoId,
}: {
  sol: DotacionSolicitud
  onClose: () => void
  initialRepoId?: string
}) {
  const initialIndex = initialRepoId
    ? Math.max(0, sol.reposiciones.findIndex(r => r.id === initialRepoId))
    : 0
  const [lightbox, setLightbox]       = useState<string | null>(null)
  const [expanded, setExpanded]       = useState<Set<number>>(new Set([initialIndex]))
  const [loadingPdf, setLoadingPdf]   = useState(false)
  const [loadingXlsx, setLoadingXlsx] = useState(false)
  const [showGenerar, setShowGenerar] = useState(false)

  const { data: allRQs = [] } = useRequisiciones()
  const rq = allRQs.find(r => r.categoria === 'DOTACION' && r.solicitud_id === sol.id)
  const numeroRq = rq?.numero_rq != null ? String(rq.numero_rq) : null
  const { data: entregasRQ = [] } = useEntregasPorNumeroRQ(numeroRq)

  function toggle(i: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(i)) { next.delete(i) } else { next.add(i) }
      return next
    })
  }

  const totalFotos = sol.reposiciones.reduce((n, r) => n + r.imagenes.length, 0)

  return (
    <>
      <ModalPortal onClose={onClose}>
        <div
          className="w-full max-w-2xl rounded-xl flex flex-col overflow-hidden"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '85vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <EstadoBadge estado={sol.estado} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                {sol.campo?.name ?? 'Solicitud'} - {formatDate(sol.fecha)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                {sol.inspeccion_realizada_por} &middot; {sol.cargo_inspector} &middot; Contrato {sol.contrato}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-opacity hover:opacity-70 shrink-0" style={{ color: 'var(--color-text-400)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Stats bar */}
          <div className="px-5 py-3 flex gap-6 shrink-0" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
            <div className="flex items-center gap-1.5">
              <FileText size={13} style={{ color: 'var(--color-text-400)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-600)' }}>
                <strong>{sol.reposiciones.length}</strong> reposicion{sol.reposiciones.length !== 1 ? 'es' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={13} style={{ color: 'var(--color-text-400)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-600)' }}>
                Emitida <strong>{formatDate(sol.created_at)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ImageIcon size={13} style={{ color: 'var(--color-text-400)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-600)' }}>
                <strong>{totalFotos}</strong> foto{totalFotos !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Reposiciones */}
          <div className="overflow-y-auto px-5 py-4 flex flex-col gap-2" style={{ maxHeight: 420 }}>
            {sol.reposiciones.map((repo, i) => {
              const entregasEsteEmpleado = entregasRQ.filter(e => e.empleado_id === repo.empleado.id)
              const entregado = entregasEsteEmpleado.length > 0
              const fechaEntregaRQ = entregasEsteEmpleado[0]?.fecha_entrega ?? null
              return (
              <div key={repo.id} style={{
                border: entregado ? '1px solid #16a34a' : '1px solid var(--color-border)',
                borderRadius: 8, overflow: 'hidden', flexShrink: 0,
              }}>
                <button type="button" onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  style={{ background: entregado ? 'rgba(22,163,74,0.1)' : 'var(--color-surface-1)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0"
                      style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-600)' }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{repo.empleado.first_name} {repo.empleado.last_name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{repo.empleado.position}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {entregado && (
                      <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#16a34a' }}>
                        <PackageCheck size={12} /> Entregado
                      </span>
                    )}
                    {repo.imagenes.length > 0 && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-400)' }}>
                        <ImageIcon size={12} />{repo.imagenes.length}
                      </span>
                    )}
                    {expanded.has(i)
                      ? <ChevronUp size={15} style={{ color: 'var(--color-text-400)' }} />
                      : <ChevronDown size={15} style={{ color: 'var(--color-text-400)' }} />}
                  </div>
                </button>

                {expanded.has(i) && (
                  <div className="px-4 py-3 flex flex-col gap-3" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-400)' }}>Condicion encontrada</p>
                      <p className="text-sm" style={{ color: 'var(--color-text-700)' }}>{repo.condicion_encontrada}</p>
                    </div>
                    {fechaEntregaRQ && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#16a34a' }}>Fecha de entrega al empleado</p>
                        <p className="text-sm font-medium" style={{ color: '#16a34a' }}>{formatDate(fechaEntregaRQ)}</p>
                      </div>
                    )}
                    {entregasEsteEmpleado.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-400)' }}>Entregado</p>
                        <ul className="text-sm flex flex-col gap-0.5" style={{ color: 'var(--color-text-700)' }}>
                          {entregasEsteEmpleado.map(e => (
                            <li key={e.id}>{e.cantidad} x {e.indumentaria?.nombre ?? 'Item'}{e.talla && ` (talla ${e.talla})`}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {repo.imagenes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-400)' }}>Fotos</p>
                        <div className="flex flex-wrap gap-2">
                          {repo.imagenes.map(img => (
                            <button key={img.id} type="button" onClick={() => setLightbox(img.url)}
                              className="overflow-hidden rounded-lg"
                              style={{ height: 72, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', flexShrink: 0 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt={img.original_name} style={{ height: '100%', width: 'auto', display: 'block' }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )
            })}
          </div>

          {/* Export + Generar RQ */}
          <div className="px-5 py-3 flex items-center justify-between gap-3 shrink-0" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
            <div className="flex gap-2">
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
              <button onClick={() => setShowGenerar(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ background: '#1a3a3a', color: '#fff' }}>
                <CheckCircle2 size={13} /> Generar RQ
              </button>
            )}
          </div>
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

// ── Item form modal (crear / editar) ──────────────────────────────────────────
function ItemFormModal({
  item,
  onClose,
}: {
  item?: IndumentariaItem
  onClose: () => void
}) {
  const crear   = useCreateIndumentariaItem()
  const editar  = useUpdateIndumentariaItem()
  const isEdit  = !!item

  const [nombre,    setNombre]    = useState(item?.nombre    ?? '')
  const [codigo]                  = useState(item?.codigo    ?? '')
  const [unidad,    setUnidad]    = useState(item?.unidad    ?? 'UNIDAD')
  const [valor,     setValor]     = useState(item?.valor_unitario != null ? String(item.valor_unitario) : '')
  const [proveedor, setProveedor] = useState(item?.proveedor ?? '')
  const [activo,    setActivo]    = useState(item?.activo    ?? true)
  const [requiereTalla, setRequiereTalla] = useState(item?.requiere_talla ?? false)

  const isPending = crear.isPending || editar.isPending

  function submit() {
    if (!nombre.trim()) { toast.error('El nombre es requerido'); return }
    const payload = {
      nombre:         nombre.trim(),
      unidad:         unidad.trim() || 'UNIDAD',
      valor_unitario: valor ? parseFloat(valor) : null,
      proveedor:      proveedor.trim() || null,
      requiere_talla: requiereTalla,
    }

    if (isEdit) {
      editar.mutate({ id: item!.id, ...payload, activo }, { onSuccess: onClose })
    } else {
      crear.mutate(payload, { onSuccess: onClose })
    }
  }

  const INP: React.CSSProperties = {
    border: '1.5px solid var(--color-border)',
    background: 'var(--color-surface-0)',
    color: 'var(--color-text-900)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    outline: 'none',
    width: '100%',
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
            {isEdit ? 'Editar item' : 'Nuevo item'}
          </p>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Botas de seguridad" style={INP} />
            </div>
            {isEdit && (
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Codigo (automatico)</label>
                <input value={codigo} disabled style={{ ...INP, opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
            )}
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Unidad</label>
              <input value={unidad} onChange={e => setUnidad(e.target.value)} placeholder="UNIDAD" style={INP} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Valor unitario</label>
              <input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0" min="0" style={INP} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Proveedor</label>
              <input value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="Opcional" style={INP} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <div
              onClick={() => setRequiereTalla(v => !v)}
              className="w-9 h-5 rounded-full transition-colors relative shrink-0"
              style={{ background: requiereTalla ? '#1a3a3a' : 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                style={{ background: '#fff', transform: requiereTalla ? 'translateX(16px)' : 'translateX(2px)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
              />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-700)' }}>
              Requiere talla
            </span>
          </label>

          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <div
                onClick={() => setActivo(v => !v)}
                className="w-9 h-5 rounded-full transition-colors relative shrink-0"
                style={{ background: activo ? '#1a3a3a' : 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                  style={{ background: '#fff', transform: activo ? 'translateX(16px)' : 'translateX(2px)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-700)' }}>
                {activo ? 'Activo' : 'Inactivo'}
              </span>
            </label>
          )}
        </div>

        <div className="px-5 py-4 flex gap-3 justify-end shrink-0" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: '#1a3a3a', color: '#fff', opacity: isPending ? 0.7 : 1 }}>
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {isPending ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear item')}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Tab: Indumentaria ─────────────────────────────────────────────────────────
function IndumentariaTab() {
  const { data: rawItems, isLoading } = useIndumentariaCatalog()
  const items = Array.isArray(rawItems) ? rawItems : []

  const [search,       setSearch]       = useState('')
  const [activoFilter, setActivoFilter] = useState<boolean | undefined>(undefined)
  const [editItem,     setEditItem]     = useState<IndumentariaItem | null>(null)

  const filtered = items
    .filter(i => activoFilter === undefined || i.activo === activoFilter)
    .filter(i => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return i.nombre.toLowerCase().includes(q)
        || (i.codigo ?? '').toLowerCase().includes(q)
        || (i.proveedor ?? '').toLowerCase().includes(q)
    })

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-400)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por codigo, nombre o proveedor..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
            onFocus={e => { e.target.style.borderColor = 'var(--color-secundary)' }}
            onBlur={e  => { e.target.style.borderColor = 'var(--color-border)' }}
          />
        </div>

        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          {([undefined, true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => setActivoFilter(val)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={
                activoFilter === val
                  ? { background: 'var(--color-surface-0)', color: 'var(--color-text-900)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
                  : { color: 'var(--color-text-400)' }
              }
            >
              {val === undefined ? 'Todos' : val ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-14">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface-1)' }}>
          <Package size={30} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-700)' }}>
            {search.trim() ? 'Sin resultados' : 'Sin items en el catalogo'}
          </p>
          {!search.trim() && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
              Los items se gestionan desde el area de compras
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#1a3a3a', color: '#fff' }}>
                  {['Codigo', 'Nombre', 'Unidad', 'Valor unitario', 'Proveedor', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:opacity-90 transition-opacity cursor-pointer"
                    style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}
                    onClick={() => setEditItem(item)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--color-text-400)' }}>
                      {item.codigo || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                      {item.nombre}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                      {item.unidad}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-right whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>
                      {item.valor_unitario != null ? fmtCop(item.valor_unitario) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                      {item.proveedor || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={
                          item.activo
                            ? { background: '#16a34a22', color: '#16a34a' }
                            : { background: '#6b728022', color: '#6b7280' }
                        }
                      >
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
              {filtered.length} item{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {editItem && <ItemFormModal item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}

// ── Tab: Informe ──────────────────────────────────────────────────────────────
// ── Tab: Requisiciones ────────────────────────────────────────────────────────
function RequisicionesTab() {
  const now = new Date()
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [selectedSol,   setSelectedSol]   = useState<DotacionSolicitud | null>(null)
  const [selectedRQId,  setSelectedRQId]  = useState<string | null>(null)
  const [showGenerarDirecta, setShowGenerarDirecta] = useState(false)

  function adjustPeriod(delta: number) {
    let m = mes + delta, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  const { data: solicitudes = [], isLoading: loadingSols } = useAllDotacionSolicitudes()
  const { data: requisiciones = [], isLoading: loadingRQs } = useRequisiciones({ mes, anio })

  const sols = (solicitudes as DotacionSolicitud[]).filter(sol => {
    if (!sol.fecha) return true
    const d = new Date(sol.fecha)
    return d.getMonth() + 1 === mes && d.getFullYear() === anio
  })
  const rqs  = (Array.isArray(requisiciones) ? requisiciones : []).filter(r => r.categoria === 'DOTACION') as Requisicion[]

  if (selectedRQId) {
    return <DotacionRQDetail rqId={selectedRQId} onBack={() => setSelectedRQId(null)} />
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Selector de periodo (afecta reposiciones y requisiciones) */}
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
      </div>

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
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>Sin reposiciones para {MESES[mes - 1]} {anio}</p>
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
          <div className="flex items-center gap-3">
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{rqs.length} RQ{rqs.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => setShowGenerarDirecta(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ background: '#1a3a3a', color: '#fff' }}
            >
              <Plus size={13} /> Generar RQ
            </button>
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
                    {['Numero RQ', 'C. Costo', 'Lugar', 'Estado', 'Fecha', 'Total', ''].map(h => (
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
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-600)' }}>{rq.lote}</td>
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
      {showGenerarDirecta && <GenerarRQDirectaModal onClose={() => setShowGenerarDirecta(false)} />}
    </div>
  )
}

// ── Generar RQ directa (sin reposicion detras, ej. dotacion inicial/periodica) ──
function GenerarRQDirectaModal({ onClose }: { onClose: () => void }) {
  const [numeroRQ, setNumeroRQ]   = useState('')
  const [lugar, setLugar]         = useState('')
  const [cc, setCc]               = useState('45')
  const [contrato, setContrato]   = useState('')
  const [solicitante, setSolicitante] = useState('')
  const [obs, setObs]             = useState('')
  const [items, setItems]         = useState<ItemRow[]>(() => [makeItem()])
  const generar = useCrearRqDirecta()
  const { data: catalogRaw } = useIndumentariaCatalog()
  const catalog = (Array.isArray(catalogRaw) ? catalogRaw : []).filter(c => c.activo)

  function setField(id: string, field: keyof Omit<ItemRow, '_id'>, val: string) {
    setItems(prev => prev.map(it => it._id === id ? { ...it, [field]: val } : it))
  }

  function selectIndumentaria(id: string, item: IndumentariaItem) {
    setItems(prev => prev.map(it => it._id === id
      ? { ...it, indumentariaId: item.id, valorUnitario: it.valorUnitario || (item.valor_unitario != null ? String(item.valor_unitario) : '') }
      : it))
  }

  const totalGeneral = items.reduce((s, it) => s + rowTotal(it), 0)

  function submit() {
    const num = parseInt(numeroRQ)
    if (isNaN(num) || num <= 0) { toast.error('Ingrese un numero de RQ valido'); return }
    if (!lugar.trim()) { toast.error('Ingrese el lugar/campo de la RQ'); return }
    if (items.length === 0) { toast.error('Agregue al menos un item'); return }
    const invalid = items.find(it => !it.indumentariaId || !it.valorUnitario || !it.solicitado)
    if (invalid) { toast.error('Complete todos los campos requeridos de los items'); return }

    generar.mutate({
      numero_rq:          num,
      lugar:               lugar.trim(),
      fecha:              new Date().toISOString().split('T')[0],
      lote:               parseInt(cc) || 45,
      ...(contrato.trim()    ? { numero_contrato:    contrato.trim()    } : {}),
      ...(solicitante.trim() ? { nombre_solicitante: solicitante.trim() } : {}),
      ...(obs.trim()         ? { observaciones:      obs.trim()         } : {}),
      items: items.map(it => ({
        indumentaria_id:  it.indumentariaId,
        tipo_requisicion: it.tipo,
        valor_unitario:   parseFloat(it.valorUnitario),
        solicitado:       parseInt(it.solicitado),
      })),
    }, { onSuccess: () => onClose() })
  }

  const INP: React.CSSProperties = { border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none', width: '100%' }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Generar RQ directa</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>Sin reposicion detras, ej. dotacion inicial o periodica</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Numero RQ *</label>
              <input type="number" value={numeroRQ} onChange={e => setNumeroRQ(e.target.value)} placeholder="ej. 105" style={INP} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Lugar / Campo *</label>
              <input value={lugar} onChange={e => setLugar(e.target.value)} placeholder="ej. DINA" style={INP} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Centro de costo (CC)</label>
              <input type="number" value={cc} onChange={e => setCc(e.target.value)} placeholder="45" style={INP} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Contrato</label>
              <input value={contrato} onChange={e => setContrato(e.target.value)} placeholder="Opcional" style={INP} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Solicitante</label>
              <input value={solicitante} onChange={e => setSolicitante(e.target.value)} placeholder="Opcional" style={INP} />
            </div>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Observaciones</label>
            <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" style={INP} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-400)' }}>Items</p>
            <div className="flex flex-col gap-2">
              {items.map((item, idx) => {
                const itemsUsados = new Set(items.filter(it => it._id !== item._id).map(it => it.indumentariaId).filter(Boolean))
                const opciones = catalog.filter(c => c.id === item.indumentariaId || !itemsUsados.has(c.id))
                return (
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
                      <IndumentariaPicker
                        catalog={opciones}
                        selectedId={item.indumentariaId}
                        onSelect={i => selectIndumentaria(item._id, i)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
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
                )
              })}
            </div>
            {items.length < catalog.length && (
              <button
                onClick={() => setItems(prev => [...prev, makeItem()])}
                className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
              >
                <Plus size={13} /> Agregar item
              </button>
            )}
          </div>

          {totalGeneral > 0 && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-400)' }}>Total general</span>
              <span className="text-sm font-bold" style={{ color: 'var(--color-text-900)' }}>{fmtCop(totalGeneral)}</span>
            </div>
          )}
        </div>

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

// ── Generar Entrega modal ─────────────────────────────────────────────────────
interface EntregaItemRow {
  _id: string
  indumentaria_id: string
  cantidad: string
  tipoTalla: TipoTalla
  talla: string
}

function makeEntregaItem(): EntregaItemRow {
  return { _id: Math.random().toString(36).slice(2), indumentaria_id: '', cantidad: '1', tipoTalla: '', talla: '' }
}

function GenerarEntregaModal({
  sol,
  repo,
  onClose,
}: {
  sol: DotacionSolicitud
  repo: Reposicion
  onClose: () => void
}) {
  const { data: allRQs = [] } = useRequisiciones()
  const rqSummary = allRQs.find(r => r.categoria === 'DOTACION' && r.solicitud_id === sol.id)
  const { data: rqDetail, isLoading: loadingRQ } = useRequisicion(rqSummary?.id ?? null)
  const numeroRq = rqSummary?.numero_rq != null ? String(rqSummary.numero_rq) : null
  const { data: entregasRQ = [], isLoading: loadingEntregas } = useEntregasPorNumeroRQ(numeroRq)
  const { data: catalogRaw } = useIndumentariaCatalog()
  const catalog = Array.isArray(catalogRaw) ? catalogRaw : []
  const registrar = useRegistrarEntregaBatch()

  function requiereTalla(indumentariaId: string): boolean {
    return catalog.find(c => c.id === indumentariaId)?.requiere_talla ?? false
  }

  const [fase, setFase]         = useState<'seleccion' | 'resumen' | 'firma'>('seleccion')
  const [tipo, setTipo]         = useState<TipoEntrega>('REPOSICION')
  const [fecha, setFecha]       = useState(() => new Date().toISOString().split('T')[0])
  const [obs, setObs]           = useState('')
  const [items, setItems]       = useState<EntregaItemRow[]>(() => [makeEntregaItem()])
  const { canvasRef, hasStrokes, setHasStrokes, startDraw, draw, endDraw, limpiar } = useSignatureCanvas(fase === 'firma')

  const loadingItems = loadingRQ || loadingEntregas
  const rqItems: RQItem[] = (rqDetail?.items ?? []).filter(i => i.indumentaria_id)

  const entregadoPrevioPorItem = new Map<string, number>()
  for (const e of entregasRQ) {
    entregadoPrevioPorItem.set(e.indumentaria_id, (entregadoPrevioPorItem.get(e.indumentaria_id) ?? 0) + e.cantidad)
  }

  function disponibleBase(indumentariaId: string): number {
    const rqItem = rqItems.find(i => i.indumentaria_id === indumentariaId)
    if (!rqItem) return 0
    const solicitado = Math.round(Number(rqItem.solicitado ?? 0))
    const entregadoPrevio = entregadoPrevioPorItem.get(indumentariaId) ?? 0
    return Math.max(0, solicitado - entregadoPrevio)
  }

  function disponiblePara(indumentariaId: string, excludeRowId: string): number {
    const usadoEnForm = items.reduce((s, it) => (
      it._id !== excludeRowId && it.indumentaria_id === indumentariaId ? s + (parseInt(it.cantidad) || 0) : s
    ), 0)
    return Math.max(0, disponibleBase(indumentariaId) - usadoEnForm)
  }

  const hayItemsDisponibles = rqItems.some(i => disponibleBase(i.indumentaria_id!) > 0)

  function setItemField(id: string, field: keyof Omit<EntregaItemRow, '_id'>, val: string) {
    setItems(prev => prev.map(it => it._id === id ? { ...it, [field]: val } : it))
  }

  function selectItem(id: string, indumentariaId: string) {
    setItems(prev => prev.map(it => it._id === id
      ? { ...it, indumentaria_id: indumentariaId, cantidad: '1', tipoTalla: '', talla: '' }
      : it))
  }

  function setTipoTalla(id: string, tipoTalla: EntregaItemRow['tipoTalla']) {
    setItems(prev => prev.map(it => it._id === id ? { ...it, tipoTalla, talla: '' } : it))
  }

  function setCantidad(id: string, indumentariaId: string, val: string) {
    const max = disponiblePara(indumentariaId, id)
    const n = Math.min(Math.max(1, parseInt(val) || 1), Math.max(1, max))
    setItemField(id, 'cantidad', String(n))
  }

  function irAResumen() {
    const invalid = items.find(it => !it.indumentaria_id || !it.cantidad || Number(it.cantidad) < 1)
    if (invalid) { toast.error('Seleccione el item y la cantidad de todos los registros'); return }
    const sinTalla = items.find(it => requiereTalla(it.indumentaria_id) && !it.talla)
    if (sinTalla) { toast.error('Indique la talla de todos los items que la requieren'); return }
    setFase('resumen')
  }

  function handleConfirmar() {
    if (!canvasRef.current || !hasStrokes) return
    canvasRef.current.toBlob(blob => {
      if (!blob) return
      registrar.mutate({
        empleadoId: repo.empleado.id,
        tipo,
        fechaEntrega: fecha,
        numeroRq,
        observacion: obs.trim() || undefined,
        items: items.map(it => ({
          indumentaria_id: it.indumentaria_id,
          cantidad: parseInt(it.cantidad) || 1,
          talla: it.talla || null,
        })),
        firmaBlob: blob,
      }, { onSuccess: () => onClose() })
    }, 'image/png')
  }

  const INP: React.CSSProperties = {
    border: '1.5px solid var(--color-border)',
    background: 'var(--color-surface-0)',
    color: 'var(--color-text-900)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    outline: 'none',
    width: '100%',
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
              {repo.empleado.first_name} {repo.empleado.last_name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {repo.empleado.position} &middot; {sol.campo?.name ?? '-'} &middot; {sol.contrato}
              {numeroRq && <> &middot; RQ #{numeroRq}</>}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        {fase === 'seleccion' && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
              {/* Tipo + Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Tipo de entrega</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value as TipoEntrega)} style={{ ...INP, appearance: 'none' as const }}>
                    <option value="TOCACION">Dotacion inicial</option>
                    <option value="REPOSICION">Reposicion</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Fecha de entrega</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={INP} />
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-400)' }}>
                  Items de la RQ
                </p>
                {loadingItems ? (
                  <div className="flex justify-center py-6">
                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                  </div>
                ) : rqItems.length === 0 ? (
                  <div className="rounded-xl py-6 flex flex-col items-center" style={{ border: '1px dashed var(--color-border)' }}>
                    <Package size={20} className="mb-1" style={{ color: 'var(--color-text-400)' }} />
                    <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Esta RQ no tiene items de indumentaria</p>
                  </div>
                ) : !hayItemsDisponibles ? (
                  <div className="rounded-xl py-6 flex flex-col items-center" style={{ border: '1px dashed var(--color-border)' }}>
                    <PackageCheck size={20} className="mb-1" style={{ color: '#16a34a' }} />
                    <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Ya se entrego todo lo solicitado en esta RQ</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map((item, idx) => {
                      const maxQty = item.indumentaria_id ? disponiblePara(item.indumentaria_id, item._id) : 0
                      const opciones = rqItems.filter(i =>
                        i.indumentaria_id === item.indumentaria_id || disponiblePara(i.indumentaria_id!, item._id) > 0
                      )
                      const necesitaTalla = item.indumentaria_id && requiereTalla(item.indumentaria_id)
                      return (
                        <div key={item._id} className="rounded-xl p-3 flex flex-col gap-2"
                          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--color-text-400)', minWidth: 16 }}>{idx + 1}</span>
                            <select
                              value={item.indumentaria_id}
                              onChange={e => selectItem(item._id, e.target.value)}
                              className="flex-1"
                              style={{ ...INP, appearance: 'none' as const }}
                            >
                              <option value="">Seleccionar item...</option>
                              {opciones.map(i => (
                                <option key={i.indumentaria_id} value={i.indumentaria_id!}>
                                  {i.descripcion} (disp. {disponiblePara(i.indumentaria_id!, item._id)})
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={item.cantidad}
                              onChange={e => setCantidad(item._id, item.indumentaria_id, e.target.value)}
                              min={1}
                              max={maxQty || undefined}
                              disabled={!item.indumentaria_id}
                              placeholder="Cant."
                              style={{ ...INP, width: 72 }}
                            />
                            {items.length > 1 && (
                              <button onClick={() => setItems(prev => prev.filter(it => it._id !== item._id))}
                                className="p-0.5 rounded transition-opacity hover:opacity-70 shrink-0" style={{ color: '#ef4444' }}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                          {necesitaTalla && (
                            <div className="pl-6">
                              <TallaPicker
                                tipoTalla={item.tipoTalla}
                                talla={item.talla}
                                onChangeTipo={t => setTipoTalla(item._id, t)}
                                onChangeTalla={v => setItemField(item._id, 'talla', v)}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {items.length < rqItems.length && (
                      <button
                        onClick={() => setItems(prev => [...prev, makeEntregaItem()])}
                        className="mt-1 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
                      >
                        <Plus size={13} /> Agregar item
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Observacion */}
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Observacion (opcional)</label>
                <textarea
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                  placeholder="Ej. reposicion por desgaste en campo..."
                  rows={2}
                  style={{ ...INP, resize: 'none' as const }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 flex gap-3 justify-end shrink-0"
              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
                Cancelar
              </button>
              <button onClick={irAResumen} disabled={loadingItems || !hayItemsDisponibles}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
                style={{ background: '#1a3a3a', color: '#fff', opacity: (loadingItems || !hayItemsDisponibles) ? 0.6 : 1 }}>
                Continuar
              </button>
            </div>
          </>
        )}

        {fase === 'resumen' && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                Esto es lo que va a recibir {repo.empleado.first_name} {repo.empleado.last_name}:
              </p>
              <div className="flex flex-col gap-2">
                {items.map(item => {
                  const rqItem = rqItems.find(i => i.indumentaria_id === item.indumentaria_id)
                  return (
                    <div key={item._id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                      style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                        {rqItem?.descripcion ?? '-'}
                        {item.talla && <span style={{ color: 'var(--color-text-400)' }}> &middot; Talla {item.talla}</span>}
                      </span>
                      <span className="text-sm font-bold" style={{ color: 'var(--color-secundary)' }}>
                        {item.cantidad} {rqItem?.unidad ?? ''}
                      </span>
                    </div>
                  )
                })}
              </div>
              {obs.trim() && (
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Observacion: {obs.trim()}</p>
              )}
            </div>
            <div className="px-5 py-4 flex gap-3 justify-end shrink-0"
              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <button onClick={() => setFase('seleccion')}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
                Corregir
              </button>
              <button onClick={() => { setHasStrokes(false); setFase('firma') }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
                style={{ background: '#1a3a3a', color: '#fff' }}>
                De acuerdo
              </button>
            </div>
          </>
        )}

        {fase === 'firma' && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-500)' }}>
                Firma de {repo.empleado.first_name} {repo.empleado.last_name} confirmando que recibio lo anterior.
              </p>
              <div style={{ border: '1.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: '#fff', touchAction: 'none' }}>
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={180}
                  style={{ display: 'block', width: '100%', cursor: 'crosshair', touchAction: 'none' }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
              </div>
            </div>
            <div className="px-5 py-4 flex gap-3 justify-end shrink-0"
              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <button onClick={() => setFase('resumen')} disabled={registrar.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)', opacity: registrar.isPending ? 0.5 : 1 }}>
                Volver
              </button>
              <button onClick={limpiar} disabled={registrar.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)', opacity: registrar.isPending ? 0.5 : 1 }}>
                Limpiar
              </button>
              <button onClick={handleConfirmar} disabled={!hasStrokes || registrar.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
                style={{ background: '#1a3a3a', color: '#fff', opacity: (!hasStrokes || registrar.isPending) ? 0.6 : 1 }}>
                {registrar.isPending ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                {registrar.isPending ? 'Registrando...' : 'Confirmar entrega'}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalPortal>
  )
}

// ── Fila del historial (trae la fecha real de entrega al empleado) ─────────
function HistorialRow({
  sol,
  repo,
  idx,
  onVer,
  onEntregar,
  onVerRQ,
}: {
  sol: DotacionSolicitud
  repo: Reposicion
  idx: number
  onVer: () => void
  onEntregar: () => void
  onVerRQ: (rqId: string) => void
}) {
  const { data: allRQs = [] } = useRequisiciones()
  const rq = allRQs.find(r => r.categoria === 'DOTACION' && r.solicitud_id === sol.id)
  const numeroRq = rq?.numero_rq != null ? String(rq.numero_rq) : null
  const { data: entregasRQ = [] } = useEntregasPorNumeroRQ(numeroRq)
  const entregasEsteEmpleado = entregasRQ.filter(e => e.empleado_id === repo.empleado.id)
  const fechaEntrega = entregasEsteEmpleado[0]?.fecha_entrega ?? null
  const yaEntregado = entregasEsteEmpleado.length > 0
  const puedeEntregar = (rq?.estado === 'EN_BODEGA' || rq?.estado === 'ENTREGADO') && !yaEntregado

  return (
    <tr
      style={{
        borderBottom: '1px solid var(--color-border)',
        background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)',
      }}>
      <td className="px-4 py-3 font-medium text-sm whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>
        {repo.empleado.first_name} {repo.empleado.last_name}
      </td>
      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
        {repo.empleado.position}
      </td>
      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-700)' }}>
        {sol.campo?.name ?? '-'}
      </td>
      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
        {formatDate(sol.fecha)}
      </td>
      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
        {sol.fecha_autorizacion ? formatDate(sol.fecha_autorizacion) : '-'}
      </td>
      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
        {sol.fecha_solicitud_compras ? formatDate(sol.fecha_solicitud_compras) : '-'}
      </td>
      <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
        {sol.numero_rq && rq ? (
          <button onClick={() => onVerRQ(rq.id)} className="hover:underline" style={{ color: 'var(--color-secundary)' }}>
            #{sol.numero_rq}
          </button>
        ) : sol.numero_rq ? (
          <span style={{ color: 'var(--color-text-900)' }}>#{sol.numero_rq}</span>
        ) : (
          <span style={{ color: 'var(--color-text-900)' }}>-</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
        {fechaEntrega ? formatDate(fechaEntrega) : '-'}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onVer}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
          title="Ver reposicion"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}>
          <Eye size={13} />
        </button>
      </td>
      <td className="px-4 py-3">
        {puedeEntregar && (
          <button
            onClick={onEntregar}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity whitespace-nowrap"
            style={{ background: '#1a3a3a', color: '#fff' }}>
            <PackagePlus size={11} /> Entregar
          </button>
        )}
      </td>
    </tr>
  )
}

// ── Modal con el detalle de la RQ (reutiliza la vista inline) ──────────────
function RQDetailModal({ rqId, onClose }: { rqId: string; onClose: () => void }) {
  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="overflow-y-auto p-5">
          <DotacionRQDetail rqId={rqId} onBack={onClose} />
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Tab: Historial (reposiciones) ──────────────────────────────────────────────
function ReposicionesHistorialTab() {
  const now = new Date()
  const { data: solicitudes = [], isLoading } = useAllDotacionSolicitudes()
  const [search, setSearch]       = useState('')
  const [mes,  setMes]            = useState(now.getMonth() + 1)
  const [anio, setAnio]           = useState(now.getFullYear())
  const [campoId, setCampoId]     = useState('')
  const [selected, setSelected]                 = useState<{ sol: DotacionSolicitud; repo: Reposicion } | null>(null)
  const [entregaTarget, setEntregaTarget]       = useState<{ sol: DotacionSolicitud; repo: Reposicion } | null>(null)
  const [rqDetailId, setRqDetailId]             = useState<string | null>(null)

  function adjustPeriod(delta: number) {
    let m = mes + delta, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  const campos = Array.from(
    new Map((solicitudes as DotacionSolicitud[]).filter(s => s.campo).map(s => [s.campo!.id, s.campo!.name])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]))

  const rows = (solicitudes as DotacionSolicitud[])
    .filter(sol => {
      const d = new Date(sol.fecha)
      return d.getMonth() + 1 === mes && d.getFullYear() === anio
    })
    .filter(sol => !campoId || sol.campo?.id === campoId)
    .flatMap(sol => sol.reposiciones.map(repo => ({ sol, repo })))

  const filtered = search.trim()
    ? rows.filter(({ repo }) =>
        `${repo.empleado.first_name} ${repo.empleado.last_name}`.toLowerCase().includes(search.toLowerCase())
      )
    : rows

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg px-2 py-1.5"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}>
          <button onClick={() => adjustPeriod(-1)}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-700)' }}>
            <ChevronLeft size={13} />
          </button>
          <span className="text-xs font-semibold px-1 min-w-28 text-center flex items-center gap-1.5" style={{ color: 'var(--color-text-900)' }}>
            <Calendar size={12} style={{ color: 'var(--color-text-400)' }} />
            {MESES[mes - 1]} {anio}
          </span>
          <button onClick={() => adjustPeriod(1)}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-700)' }}>
            <ChevronRight size={13} />
          </button>
        </div>

        <select
          value={campoId}
          onChange={e => setCampoId(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg outline-none cursor-pointer"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', minWidth: 160 }}
        >
          <option value="">Todos los campos</option>
          {campos.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-400)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empleado..."
            className="pl-8 pr-3 py-2 text-xs rounded-lg outline-none"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', minWidth: 220 }}
          />
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-14">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface-1)' }}>
          <History size={30} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-700)' }}>Sin registros</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>Los empleados de reposiciones apareceran aqui automaticamente</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#1a3a3a', color: '#fff' }}>
                  {['Empleado', 'Cargo', 'Campo', 'Fecha emitida', 'Fecha autorizada', 'Solic. compras', 'N° RQ', 'Fecha entrega', '', ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ sol, repo }, idx) => (
                  <HistorialRow
                    key={`${sol.id}-${repo.id}`}
                    sol={sol}
                    repo={repo}
                    idx={idx}
                    onVer={() => setSelected({ sol, repo })}
                    onEntregar={() => setEntregaTarget({ sol, repo })}
                    onVerRQ={setRqDetailId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <SolicitudModal sol={selected.sol} initialRepoId={selected.repo.id} onClose={() => setSelected(null)} />
      )}
      {entregaTarget && (
        <GenerarEntregaModal
          sol={entregaTarget.sol}
          repo={entregaTarget.repo}
          onClose={() => setEntregaTarget(null)}
        />
      )}
      {rqDetailId && (
        <RQDetailModal rqId={rqDetailId} onClose={() => setRqDetailId(null)} />
      )}
    </div>
  )
}

// ── Tab: Historial (wrapper con sub-tabs) ──────────────────────────────────────
function HistorialTab() {
  const [subTab, setSubTab] = useState<'reposiciones' | 'general'>('reposiciones')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--color-surface-2)' }}>
        {([
          { id: 'reposiciones', label: 'Reposiciones' },
          { id: 'general',      label: 'Historial general' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={
              subTab === t.id
                ? { background: 'var(--color-surface-0)', color: 'var(--color-secundary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                : { color: 'var(--color-text-400)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'reposiciones' && <ReposicionesHistorialTab />}
      {subTab === 'general'      && <HistorialGeneralTab />}
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
      {tab === 'historial'     && <HistorialTab />}
      {tab === 'informe'       && <InformeDotacionesTab />}
    </div>
  )
}

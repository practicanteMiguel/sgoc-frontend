'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ArrowLeft, Loader2, FileDown, FileSpreadsheet, Equal, Building2, X, Search, PackageCheck } from 'lucide-react'
import { useRequisicion, useGuardarFacturas } from '@/src/hooks/consumables/use-requisiciones'
import { fetchFirmaUrl } from '@/src/lib/firma'
import { getAuthState } from '@/src/stores/auth.store'
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
  const origin     = typeof window !== 'undefined' ? window.location.origin : ''
  const hasFactura = rq.items.some((i) => i.numero_factura !== null || i.precio_real !== null)
  const numCols    = hasFactura ? 12 : 8

  const encargadoFirmaUrl = await fetchFirmaUrl()
  const encargadoUser     = getAuthState().user
  const encargadoNombre   = encargadoUser ? `${encargadoUser.first_name} ${encargadoUser.last_name}` : ''

  const header = `
<div style="display:flex;align-items:center;padding-bottom:14px;border-bottom:3px solid #1E4A8A;margin-bottom:20px;">
  <div style="flex:1;">
    <img src="${origin}/assets/logo-full.png" style="height:62px;width:auto;object-fit:contain;display:block;" onerror="this.style.visibility='hidden'" />
  </div>
  <div style="flex:1;text-align:center;">
    <div style="font-size:13px;font-weight:bold;color:#111;margin-bottom:3px;">SERVICIOS ASOCIADOS SAS.</div>
    <div style="font-size:12px;font-weight:bold;color:#1E4A8A;margin-bottom:4px;">Requisicion de Insumos</div>
    <div style="font-size:11px;color:#555;">RQ #<strong>${rq.numero_rq}</strong> &nbsp;&middot;&nbsp; ${CATEGORIA_LABELS[rq.categoria]}</div>
    <div style="font-size:11px;color:#555;margin-top:1px;">CC: <strong>${rq.lote}</strong> &nbsp;&middot;&nbsp; Lugar: <strong>${rq.lugar}</strong> &nbsp;&middot;&nbsp; Generado: <strong>${new Date().toLocaleDateString('es-CO')}</strong></div>
  </div>
  <div style="flex:1;"></div>
</div>`

  const infoHtml = `
    <div style="display:flex;gap:12px;margin-bottom:18px;">
      ${[
        ['Solicitante', rq.nombre_solicitante ?? '-'],
        ['Contrato',    rq.numero_contrato    ?? '-'],
        ['Fecha',       rq.fecha              ?? '-'],
        ['Estado',      ESTADO_LABELS[rq.estado]],
      ].map(([label, value]) => `
        <div style="flex:1;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;">
          <div style="font-size:9px;color:#6b7280;margin-bottom:2px;">${label}</div>
          <div style="font-size:11px;font-weight:600;color:#111;">${value}</div>
        </div>`).join('')}
    </div>`

  const colWidths = hasFactura
    ? ['6%','18%','4%','9%','9%','9%','4%','8%','8%','8%','9%','8%']
    : ['10%','27%','7%','12%','12%','14%','7%','11%']

  const headerLabels = hasFactura
    ? ['Codigo','Descripcion','Unidad','Prov. Ord.','Prov. Ext.','Valor Unit.','Cant.','Total','N. Factura','V. Real','Diferencia','Prov. Real']
    : ['Codigo','Descripcion','Unidad','Prov. Ord.','Prov. Ext.','Valor Unitario','Cant.','Total']

  const centerCols = new Set([2, 6])
  const rightCols  = new Set([5, 7, 9, 10])
  const thCells = headerLabels.map((h, i) => {
    const align = centerCols.has(i) ? 'center' : rightCols.has(i) ? 'right' : 'left'
    return `<th style="padding:${hasFactura ? '5px 4px' : '8px 6px'};text-align:${align};font-size:${hasFactura ? '9px' : '10px'};border:1px solid #1a3a3a;">${h}</th>`
  }).join('')

  const cellPad = hasFactura ? '4px 4px' : '7px 6px'
  const cellFs  = hasFactura ? '9px' : '10px'
  const td = (val: string, extra = '') =>
    `<td style="padding:${cellPad};border:1px solid #e5e7eb;font-size:${cellFs};${extra}">${val}</td>`

  const rows = [...rq.items].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' })).map((item, i) => {
    const diff = item.precio_real != null && item.valor_unitario !== null && item.solicitado !== null
      ? (item.precio_real - item.valor_unitario) * item.solicitado
      : null
    const diffColor = diff !== null ? (diff < 0 ? 'color:#16a34a;' : diff > 0 ? 'color:#ef4444;' : '') : ''
    const baseCells = [
      td(item.codigo,                              'word-break:break-word;'),
      td(item.descripcion,                         'word-break:break-word;'),
      td(item.unidad,                              'text-align:center;'),
      td(item.proveedor_ordinario     ?? '-',      'word-break:break-word;'),
      td(item.proveedor_extraordinario ?? '-',     'word-break:break-word;'),
      td(formatCOP(item.valor_unitario),           'text-align:right;white-space:nowrap;'),
      td(String(item.solicitado ?? '-'),           'text-align:center;'),
      td(formatCOP(item.total),                    'text-align:right;white-space:nowrap;'),
    ]
    const facturaCells = hasFactura ? [
      td(item.numero_factura            ?? '-',    'word-break:break-word;'),
      td(item.precio_real != null ? formatCOP(item.precio_real) : '-', 'text-align:right;white-space:nowrap;'),
      td(diff !== null ? (diff > 0 ? '+' : '') + formatCOP(diff) : '-', `text-align:right;white-space:nowrap;${diffColor}`),
      td(item.proveedor_factura         ?? '-',    'word-break:break-word;'),
    ] : []
    return `<tr style="${i % 2 === 1 ? 'background:#f9fafb;' : ''}">${[...baseCells, ...facturaCells].join('')}</tr>`
  }).join('')

  const total = formatCOP(totalGeneral(rq.items))
  const totalRealVal = rq.items.reduce((sum, i) => {
    if (i.precio_real == null || i.solicitado == null) return sum
    return sum + i.precio_real * i.solicitado
  }, 0)

  const tfootRow = hasFactura
    ? `<tr style="background:#f3f4f6;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        <td colspan="7" style="padding:10px 8px;text-align:right;font-size:11px;font-weight:bold;border:1px solid #e5e7eb;color:#374151;">TOTAL GENERAL</td>
        <td style="padding:10px 8px;text-align:right;font-size:11px;font-weight:bold;border:1px solid #e5e7eb;color:#111;">${total}</td>
        <td style="padding:10px 8px;text-align:right;font-size:10px;font-weight:bold;border:1px solid #e5e7eb;color:#374151;">TOTAL REAL</td>
        <td style="padding:10px 8px;text-align:right;font-size:11px;font-weight:bold;border:1px solid #e5e7eb;color:#111;">${formatCOP(totalRealVal)}</td>
        <td style="border:1px solid #e5e7eb;"></td>
        <td style="border:1px solid #e5e7eb;"></td>
      </tr>`
    : `<tr style="background:#f3f4f6;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        <td colspan="${numCols - 1}" style="padding:10px 8px;text-align:right;font-size:11px;font-weight:bold;border:1px solid #e5e7eb;color:#374151;">TOTAL GENERAL</td>
        <td style="padding:10px 8px;text-align:right;font-size:11px;font-weight:bold;border:1px solid #e5e7eb;color:#111;">${total}</td>
      </tr>`

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-family:Arial,sans-serif;">
      <colgroup>${colWidths.map((w) => `<col style="width:${w}">`).join('')}</colgroup>
      <thead>
        <tr style="background:#1a3a3a;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          ${thCells}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>${tfootRow}</tfoot>
    </table>`

  const supervisorFirmaHtml = rq.firma_supervisor_url
    ? `<img src="${rq.firma_supervisor_url}" crossorigin="anonymous" style="max-height:100px;width:auto;object-fit:contain;display:block;margin-top:8px;" />`
    : '<div style="height:80px;"></div>'

  const encargadoFirmaHtml = encargadoFirmaUrl
    ? `<img src="${encargadoFirmaUrl}" crossorigin="anonymous" style="max-height:100px;width:auto;object-fit:contain;display:block;margin-top:8px;" />`
    : '<div style="height:80px;"></div>'

  const footer = `
<div style="display:flex;gap:0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-top:20px;">
  <div style="flex:1;padding:16px 20px;">
    <div style="font-size:10px;font-weight:bold;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">
      RESPONSABLE SOLICITUD
    </div>
    <div style="font-size:10px;color:#6b7280;margin-bottom:4px;">Nombre: <span style="color:#111;font-weight:600;">${rq.nombre_solicitante ?? ''}</span></div>
    ${supervisorFirmaHtml}
  </div>
  <div style="width:1px;background:#e5e7eb;flex-shrink:0;"></div>
  <div style="flex:1;padding:16px 20px;">
    <div style="font-size:10px;font-weight:bold;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">
      RESPONSABLE AUTORIZACION
    </div>
    <div style="font-size:10px;color:#6b7280;margin-bottom:4px;">Nombre: <span style="color:#111;font-weight:600;">${encargadoNombre}</span></div>
    ${encargadoFirmaHtml}
  </div>
</div>`

  const html = `<div style="font-family:Arial,sans-serif;padding:20px;color:#111;background:#fff;">${header}${infoHtml}${tableHtml}${footer}</div>`

  const { default: html2pdf } = await import('html2pdf.js')
  await html2pdf().set({
    margin:      10,
    filename:    `RQ-${rq.numero_rq}-${rq.categoria}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(html).save()
}

async function exportExcel(rq: Requisicion) {
  const [excelModule, { fetchLogoBuffer }] = await Promise.all([
    import('exceljs'),
    import('@/src/lib/report-header'),
  ])
  const ExcelJS = (excelModule as { default?: typeof excelModule }).default ?? excelModule
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
  titleCell.value     = `SERVICIOS ASOCIADOS SAS.\nREQUISICION DE INSUMOS  |  RQ #${rq.numero_rq}  |  ${CATEGORIA_LABELS[rq.categoria]}\nCC: ${rq.lote}  |  Lugar: ${rq.lugar}`
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  titleCell.font      = { bold: true, size: 10 }

  const logoBuf = await fetchLogoBuffer('/assets/logo-full.png')
  if (logoBuf) {
    const id = wb.addImage({ buffer: logoBuf, extension: 'png' })
    ws.addImage(id, { tl: { col: 0.05, row: 0.05 }, br: { col: 1.9, row: 0.95 } })
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
    tot.value = totalGeneral(rq.items); tot.numFmt = copFmt; tot.font = { bold: true, size: 11 }; tot.alignment = { horizontal: 'right', vertical: 'middle' }; tot.border = allBorders; tot.fill = grayFill
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
    tot.value     = totalGeneral(rq.items)
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
      ws.addImage(imgId, { tl: { col: 0.1, row: sigFirmaStart - 0.9 }, br: { col: midCol - 0.1, row: sigFirmaEnd - 0.1 } })
    }
  }
  if (encargadoFirmaUrl) {
    const buf2 = await fetchBuf(encargadoFirmaUrl)
    if (buf2) {
      const imgId = wb.addImage({ buffer: buf2, extension: 'png' })
      ws.addImage(imgId, { tl: { col: midCol + 0.1, row: sigFirmaStart - 0.9 }, br: { col: numCols - 0.1, row: sigFirmaEnd - 0.1 } })
    }
  }

  const buf  = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `RQ-${rq.numero_rq}-${rq.categoria}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

async function exportConstanciaPdf(rq: Requisicion) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const header = `
<div style="display:flex;align-items:center;padding-bottom:14px;border-bottom:3px solid #1E4A8A;margin-bottom:20px;">
  <div style="flex:1;">
    <img src="${origin}/assets/logo-full.png" style="height:62px;width:auto;object-fit:contain;display:block;" onerror="this.style.visibility='hidden'" />
  </div>
  <div style="flex:1;text-align:center;">
    <div style="font-size:13px;font-weight:bold;color:#111;margin-bottom:3px;">SERVICIOS ASOCIADOS SAS.</div>
    <div style="font-size:12px;font-weight:bold;color:#1E4A8A;margin-bottom:4px;">Constancia de Entrega de Insumos</div>
    <div style="font-size:11px;color:#555;">RQ #<strong>${rq.numero_rq}</strong> &nbsp;&middot;&nbsp; ${CATEGORIA_LABELS[rq.categoria]}</div>
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
        ['Receptor',         rq.nombre_solicitante ?? '-'],
        ['Contrato',         rq.numero_contrato    ?? '-'],
        ['Fecha de entrega', rq.fecha_entrega       ?? '-'],
        ['Total solicitado', rq.total_solicitado != null ? `${rq.total_solicitado} uds` : '-'],
        ['Total recibido',   rq.total_recibido   != null ? `${rq.total_recibido} uds`   : '-'],
      ].map(([label, value]) => `
        <div style="flex:1;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;">
          <div style="font-size:9px;color:#6b7280;margin-bottom:2px;">${label}</div>
          <div style="font-size:11px;font-weight:600;color:#111;">${value}</div>
        </div>`).join('')}
    </div>`

  const items = [...rq.items].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }))

  const rows = items.map((item, i) => {
    const sol      = Math.round(Number(item.solicitado ?? 0))
    const rec      = Math.round(Number(item.recibido   ?? 0))
    const diff     = rec - sol
    const recColor  = rec === sol ? '#16a34a' : rec < sol ? '#ef4444' : '#3b82f6'
    const diffColor = diff === 0  ? '#16a34a' : diff < 0  ? '#ef4444' : '#3b82f6'
    const td = (val: string, extra = '') => `<td style="padding:7px 6px;border:1px solid #e5e7eb;font-size:10px;${extra}">${val}</td>`
    return `<tr style="${i % 2 === 1 ? 'background:#f9fafb;' : ''}">
      ${td(item.codigo,      'font-family:monospace;')}
      ${td(item.descripcion, 'word-break:break-word;')}
      ${td(item.unidad,      'text-align:center;')}
      ${td(String(sol),      'text-align:center;font-weight:bold;')}
      ${td(String(rec),      `text-align:center;font-weight:bold;color:${recColor};`)}
      ${td(diff === 0 ? '=' : (diff > 0 ? '+' : '') + String(diff), `text-align:center;font-weight:bold;color:${diffColor};`)}
    </tr>`
  }).join('')

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-family:Arial,sans-serif;margin-bottom:20px;">
      <colgroup>
        <col style="width:12%"><col style="width:36%"><col style="width:8%">
        <col style="width:14%"><col style="width:14%"><col style="width:16%">
      </colgroup>
      <thead>
        <tr style="background:#1a3a3a;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <th style="padding:8px 6px;text-align:left;font-size:10px;border:1px solid #1a3a3a;">Codigo</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;border:1px solid #1a3a3a;">Descripcion</th>
          <th style="padding:8px 6px;text-align:center;font-size:10px;border:1px solid #1a3a3a;">Unidad</th>
          <th style="padding:8px 6px;text-align:center;font-size:10px;border:1px solid #1a3a3a;">Solicitado</th>
          <th style="padding:8px 6px;text-align:center;font-size:10px;border:1px solid #1a3a3a;">Recibido</th>
          <th style="padding:8px 6px;text-align:center;font-size:10px;border:1px solid #1a3a3a;">Diferencia</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#f3f4f6;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <td colspan="3" style="padding:10px 8px;text-align:right;font-size:11px;font-weight:bold;border:1px solid #e5e7eb;color:#374151;">TOTALES</td>
          <td style="padding:10px 8px;text-align:center;font-size:11px;font-weight:bold;border:1px solid #e5e7eb;color:#111;">${rq.total_solicitado ?? '-'} uds</td>
          <td style="padding:10px 8px;text-align:center;font-size:11px;font-weight:bold;border:1px solid #e5e7eb;color:${rq.entrega_completa ? '#16a34a' : '#ef4444'};">${rq.total_recibido ?? '-'} uds</td>
          <td style="border:1px solid #e5e7eb;"></td>
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
    <div style="font-size:10px;color:#6b7280;margin-bottom:2px;">Nombre: <span style="color:#111;font-weight:600;">${rq.nombre_solicitante ?? ''}</span></div>
    <div style="font-size:10px;color:#6b7280;margin-bottom:6px;">Fecha de entrega: <span style="color:#111;font-weight:600;">${rq.fecha_entrega ?? '-'}</span></div>
    ${sigHtml}
  </div>
</div>`

  const html = `<div style="font-family:Arial,sans-serif;padding:20px;color:#111;background:#fff;">${header}${infoHtml}${tableHtml}${footer}</div>`

  const { default: html2pdf } = await import('html2pdf.js')
  await html2pdf().set({
    margin:      10,
    filename:    `Constancia-Entrega-RQ-${rq.numero_rq}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(html).save()
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
  const [loadingConstancia,   setLoadingConstancia]   = useState(false)
  const [facturas,            setFacturas]            = useState<FacturaMap>({})
  const [editandoFacturas,    setEditandoFacturas]    = useState(false)
  const [proveedorExpandido,  setProveedorExpandido]  = useState<Set<string>>(new Set())
  const [filtroOpen,          setFiltroOpen]          = useState(false)
  const [filtroInput,         setFiltroInput]         = useState('')
  const [filtroActivo,        setFiltroActivo]        = useState('')
  const [showRecepcion,       setShowRecepcion]       = useState(false)

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function handleConstancia() {
    if (!rq) return
    setLoadingConstancia(true)
    try { await exportConstanciaPdf(rq) } finally { setLoadingConstancia(false) }
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

  const sortedItems = [...rq.items].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }))
  const filteredItems = filtroActivo
    ? sortedItems.filter((item) => item.numero_factura === filtroActivo)
    : sortedItems

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

        {/* Toggle recepcion - solo cuando hay datos de entrega */}
        {rq.recepcion_completada && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 flex-wrap"
            style={{ background: showRecepcion ? 'rgba(22,163,74,0.05)' : 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}
          >
            <PackageCheck size={14} style={{ color: showRecepcion ? '#16a34a' : 'var(--color-text-400)' }} />
            <span className="text-xs font-semibold" style={{ color: showRecepcion ? '#15803d' : 'var(--color-text-600)' }}>
              Evidencia de recepcion
            </span>
            {showRecepcion && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={rq.entrega_completa
                  ? { background: 'rgba(22,163,74,0.15)', color: '#15803d' }
                  : { background: 'rgba(245,158,11,0.15)', color: '#b45309' }}
              >
                {rq.entrega_completa ? 'Entrega completa' : 'Entrega parcial'}
              </span>
            )}
            {showRecepcion && (
              <button
                onClick={handleConstancia}
                disabled={loadingConstancia}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)', opacity: loadingConstancia ? 0.6 : 1 }}
              >
                {loadingConstancia ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                Constancia PDF
              </button>
            )}
            <button
              onClick={() => setShowRecepcion((v) => !v)}
              className="ml-auto relative rounded-full shrink-0"
              style={{ width: 40, height: 22, background: showRecepcion ? '#16a34a' : 'var(--color-border)', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <span
                className="absolute top-1 w-4 h-4 bg-white rounded-full"
                style={{ left: showRecepcion ? 20 : 2, transition: 'left 0.15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
              />
            </button>
          </div>
        )}

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
                {rq.recepcion_completada && showRecepcion && (
                  <>
                    <th className={`${thBase} text-center`} style={{ color: '#16a34a', borderLeft: '2px solid var(--color-border)' }}>Recibido</th>
                    <th className={`${thBase} text-right`} style={{ color: '#16a34a' }}>Total Rec.</th>
                    <th className={`${thBase} text-center`} style={thStyle}>Diferencia</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 && filtroActivo ? (
                <tr>
                  <td
                    colSpan={(showFactura ? 12 : 8) + (rq.recepcion_completada && showRecepcion ? 3 : 0)}
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
                    {rq.recepcion_completada && showRecepcion && (() => {
                      const qtyRec    = Math.round(Number(item.recibido   ?? 0))
                      const qtySol    = Math.round(Number(item.solicitado ?? 0))
                      const qtyDiff   = qtyRec - qtySol
                      const totRecCOP = item.valor_unitario != null ? qtyRec * item.valor_unitario : null
                      const totEstCOP = item.valor_unitario != null ? qtySol * item.valor_unitario : null
                      const rcColor   = qtyRec === qtySol ? '#16a34a' : qtyRec < qtySol ? '#ef4444' : '#3b82f6'
                      const dfColor   = qtyDiff === 0 ? '#16a34a' : qtyDiff < 0 ? '#ef4444' : '#3b82f6'
                      return (
                        <>
                          <td className="px-4 py-3 text-xs text-center font-bold whitespace-nowrap" style={{ color: rcColor, borderLeft: '2px solid var(--color-border)' }}>
                            {qtyRec}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-right whitespace-nowrap" style={{ color: totRecCOP != null && totEstCOP != null && totRecCOP < totEstCOP ? '#ef4444' : '#16a34a' }}>
                            {totRecCOP != null ? formatCOP(totRecCOP) : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-center font-bold whitespace-nowrap" style={{ color: dfColor }}>
                            {qtyDiff === 0 ? '=' : (qtyDiff > 0 ? '+' : '') + qtyDiff}
                          </td>
                        </>
                      )
                    })()}
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
                  {rq.recepcion_completada && showRecepcion && (
                    <>
                      <td className="px-4 py-3 text-xs text-center font-bold whitespace-nowrap" style={{ color: rq.entrega_completa ? '#16a34a' : '#f59e0b', borderLeft: '2px solid var(--color-border)' }}>
                        {rq.total_recibido != null ? `${rq.total_recibido} uds` : '-'}
                      </td>
                      {(() => {
                        const totalRecCOP = sortedItems.reduce((s, i) => i.valor_unitario != null ? s + Math.round(Number(i.recibido ?? 0)) * i.valor_unitario : s, 0)
                        return (
                          <td className="px-4 py-3 text-sm font-bold text-right whitespace-nowrap" style={{ color: rq.entrega_completa ? '#16a34a' : '#f59e0b' }}>
                            {formatCOP(totalRecCOP)}
                          </td>
                        )
                      })()}
                      {(() => {
                        const totalRecCOP = sortedItems.reduce((s, i) => i.valor_unitario != null ? s + Math.round(Number(i.recibido ?? 0)) * i.valor_unitario : s, 0)
                        const valDiff     = totalRecCOP - total
                        const valColor    = valDiff === 0 ? '#16a34a' : valDiff < 0 ? '#ef4444' : '#3b82f6'
                        const valLabel    = valDiff === 0 ? '=' : (valDiff > 0 ? '+' : '-') + formatCOP(Math.abs(valDiff))
                        return (
                          <td className="px-4 py-3 text-xs text-center font-bold whitespace-nowrap" style={{ color: valColor }}>
                            {valLabel}
                          </td>
                        )
                      })()}
                    </>
                  )}
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

        {/* Info cards + firma integradas cuando el toggle esta activo */}
        {rq.recepcion_completada && showRecepcion && (
          <>
            <div className="px-4 pt-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              {[
                { label: 'Receptor',         value: rq.nombre_solicitante ?? '-',                                                     color: 'var(--color-text-900)' },
                { label: 'Fecha de entrega', value: rq.fecha_entrega       ?? '-',                                                     color: 'var(--color-text-900)' },
                { label: 'Total solicitado', value: rq.total_solicitado != null ? `${rq.total_solicitado} uds` : '-',                   color: 'var(--color-text-900)' },
                { label: 'Total recibido',   value: rq.total_recibido   != null ? `${rq.total_recibido} uds`   : '-',                   color: rq.entrega_completa ? '#16a34a' : '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{label}</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-4 flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-400)' }}>
                Firma del receptor
              </p>
              {rq.fecha_entrega && (
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                  Fechado el: <strong style={{ color: 'var(--color-text-900)' }}>{rq.fecha_entrega}</strong>
                </p>
              )}
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
    </div>
  )
}

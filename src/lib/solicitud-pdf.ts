import { fetchLogoBase64 } from '@/src/lib/report-header'
import { CATEGORIA_LABELS } from '@/src/types/consumables.types'
import type { Solicitud, CategoriaInsumo } from '@/src/types/consumables.types'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export async function generarPdfsSolicitud(params: {
  solicitud: Solicitud
  categoria: CategoriaInsumo
  mes: number
  anio: number
  firmaUrl: string
  cargo: string
  formatCOP: (v: number) => string
}): Promise<void> {
  const { solicitud, categoria, mes, anio, firmaUrl, cargo, formatCOP } = params

  const catData = solicitud.categorias.find((c) => c.categoria === categoria)
  if (!catData) return

  const items = catData.items
    .filter((i) => (i.solicitado ?? 0) > 0)
    .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }))
  if (items.length === 0) return

  const logoPrincipal = await fetchLogoBase64('/assets/logo-full.png')
  const logoSrcLeft   = logoPrincipal ?? ''

  const header = `
<div style="display:flex;align-items:center;padding-bottom:14px;border-bottom:3px solid #1E4A8A;margin-bottom:20px;">
  <div style="flex:1;">
    ${logoSrcLeft ? `<img src="${logoSrcLeft}" style="height:62px;width:auto;object-fit:contain;display:block;" />` : ''}
  </div>
  <div style="flex:1;text-align:center;">
    <div style="font-size:13px;font-weight:bold;color:#111;margin-bottom:3px;">SERVICIOS ASOCIADOS SAS.</div>
    <div style="font-size:12px;font-weight:bold;color:#1E4A8A;margin-bottom:4px;">SOLICITUD DE INSUMOS</div>
    <div style="font-size:11px;color:#555;">${MESES[mes - 1]} ${anio} | ${CATEGORIA_LABELS[categoria]}</div>
    <div style="font-size:11px;color:#555;margin-top:1px;">${solicitud.lugar} - CC ${solicitud.lote}</div>
  </div>
  <div style="flex:1;"></div>
</div>`

  const infoRow = `
<div style="display:flex;gap:12px;margin-bottom:18px;">
  ${[
    ['Fecha',       solicitud.fecha              ?? '-'],
    ['Solicitante', solicitud.nombre_solicitante ?? '-'],
    ['Contrato',    solicitud.numero_contrato    ?? '-'],
  ].map(([label, value]) => `
    <div style="flex:1;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;">
      <div style="font-size:9px;color:#6b7280;margin-bottom:2px;">${label}</div>
      <div style="font-size:11px;font-weight:600;color:#111;">${value}</div>
    </div>`).join('')}
</div>`

  const thStyle = 'padding:8px 6px;font-size:10px;border:1px solid #d1d5db;text-align:'

  const rows = items.map((item, idx) => {
    const cant  = item.solicitado ?? 0
    const total = item.valor_unitario != null ? cant * Number(item.valor_unitario) : null
    const bg    = idx % 2 === 0 ? '#fff' : '#f3f4f6'
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      <td style="padding:7px 6px;border:1px solid #e5e7eb;font-size:10px;font-family:monospace;">${item.codigo}</td>
      <td style="padding:7px 6px;border:1px solid #e5e7eb;font-size:10px;">${item.descripcion}</td>
      <td style="padding:7px 6px;border:1px solid #e5e7eb;font-size:10px;text-align:center;">${item.unidad}</td>
      <td style="padding:7px 6px;border:1px solid #e5e7eb;font-size:10px;text-align:right;white-space:nowrap;">${formatCOP(item.valor_unitario)}</td>
      <td style="padding:7px 6px;border:1px solid #e5e7eb;font-size:10px;text-align:center;">${cant}</td>
      <td style="padding:7px 6px;border:1px solid #e5e7eb;font-size:10px;text-align:right;white-space:nowrap;font-weight:bold;">${total !== null ? formatCOP(total) : '-'}</td>
    </tr>`
  }).join('')

  const grandTotal = items.reduce((sum, item) => {
    const cant = item.solicitado ?? 0
    if (item.valor_unitario == null) return sum
    return sum + cant * Number(item.valor_unitario)
  }, 0)

  const totalRow = `
<tr style="background:#f3f4f6;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
  <td colspan="5" style="padding:10px 8px;text-align:right;font-size:11px;font-weight:bold;border:1px solid #e5e7eb;color:#374151;">TOTAL ${CATEGORIA_LABELS[categoria].toUpperCase()}</td>
  <td style="padding:10px 8px;text-align:right;font-size:11px;font-weight:bold;border:1px solid #e5e7eb;color:#111;">${formatCOP(grandTotal)}</td>
</tr>`

  const table = `
<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-family:Arial,sans-serif;margin-bottom:20px;">
  <colgroup>
    <col style="width:10%"><col style="width:35%"><col style="width:8%"><col style="width:15%"><col style="width:10%"><col style="width:22%">
  </colgroup>
  <thead>
    <tr style="background:#16a34a;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      <th style="${thStyle}left;">Codigo</th>
      <th style="${thStyle}left;">Descripcion</th>
      <th style="${thStyle}center;">Unidad</th>
      <th style="${thStyle}right;">V. Unitario</th>
      <th style="${thStyle}center;">Solicitado</th>
      <th style="${thStyle}right;">Total</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>${totalRow}</tfoot>
</table>`

  const firmaImgHtml = `<img src="${firmaUrl}" crossorigin="anonymous" style="max-height:120px;width:auto;object-fit:contain;display:block;margin-top:8px;" />`

  const firmasAdicionales = `
<div style="margin:28px 0 0 0;">
  <div style="font-size:10px;font-weight:bold;color:#374151;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:16px;padding-bottom:6px;border-bottom:2px solid #e5e7eb;">
    FIRMAS ADICIONALES
  </div>
  <div style="display:flex;gap:0;">
    ${[1, 2, 3].map(() => `
    <div style="flex:1;padding:14px 16px;border:1px solid #e5e7eb;border-right:none;">
      <div style="font-size:9px;color:#6b7280;margin-bottom:4px;">Nombre:</div>
      <div style="border-bottom:1px solid #9ca3af;margin-bottom:10px;height:14px;"></div>
      <div style="font-size:9px;color:#6b7280;margin-bottom:4px;">Cargo:</div>
      <div style="border-bottom:1px solid #9ca3af;margin-bottom:10px;height:14px;"></div>
      <div style="font-size:9px;color:#6b7280;margin-bottom:4px;">Firma:</div>
      <div style="height:60px;border-bottom:1px solid #9ca3af;"></div>
    </div>`).join('')}
    <div style="flex:1;padding:14px 16px;border:1px solid #e5e7eb;">
      <div style="font-size:9px;color:#6b7280;margin-bottom:4px;">Nombre:</div>
      <div style="border-bottom:1px solid #9ca3af;margin-bottom:10px;height:14px;"></div>
      <div style="font-size:9px;color:#6b7280;margin-bottom:4px;">Cargo:</div>
      <div style="border-bottom:1px solid #9ca3af;margin-bottom:10px;height:14px;"></div>
      <div style="font-size:9px;color:#6b7280;margin-bottom:4px;">Firma:</div>
      <div style="height:60px;border-bottom:1px solid #9ca3af;"></div>
    </div>
  </div>
</div>`

  const footer = `
<div style="display:flex;gap:0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-top:8px;">
  <div style="flex:1;padding:16px 20px;">
    <div style="font-size:10px;font-weight:bold;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">
      RESPONSABLE SOLICITUD
    </div>
    <div style="font-size:10px;color:#6b7280;margin-bottom:4px;">Nombre: <span style="color:#111;font-weight:600;">${solicitud.nombre_solicitante ?? ''}</span></div>
    <div style="font-size:10px;color:#6b7280;margin-bottom:8px;">Cargo: <span style="color:#111;font-weight:600;">${cargo}</span></div>
    ${firmaImgHtml}
  </div>
  <div style="width:1px;background:#e5e7eb;flex-shrink:0;"></div>
  <div style="flex:1;padding:16px 20px;">
    <div style="font-size:10px;font-weight:bold;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">
      RESPONSABLE AUTORIZACION
    </div>
    <div style="font-size:10px;color:#6b7280;margin-bottom:4px;">Nombre: <span style="display:inline-block;width:140px;border-bottom:1px solid #9ca3af;">&nbsp;</span></div>
    <div style="font-size:10px;color:#6b7280;margin-bottom:8px;">Cargo: <span style="display:inline-block;width:150px;border-bottom:1px solid #9ca3af;">&nbsp;</span></div>
    <div style="height:120px;"></div>
  </div>
</div>`

  const html = `<div style="font-family:Arial,sans-serif;padding:20px;color:#111;background:#fff;">${header}${infoRow}${table}${footer}${firmasAdicionales}</div>`

  const { default: html2pdf } = await import('html2pdf.js')
  await html2pdf().set({
    margin:      [10, 10, 10, 10],
    filename:    `Solicitud_${categoria}_${solicitud.lugar}_${mes}-${anio}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(html).save()
}

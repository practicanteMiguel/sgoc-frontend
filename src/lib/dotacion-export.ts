import type { DotacionSolicitud } from '@/src/types/dotaciones.types'
import type { Cell, ImageRange } from 'exceljs'
import { fetchLogoBase64 } from './report-header'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getImgExt(url: string): 'jpeg' | 'png' | 'gif' {
  const clean = url.toLowerCase().split('?')[0]
  if (clean.endsWith('.png'))  return 'png'
  if (clean.endsWith('.gif'))  return 'gif'
  return 'jpeg'
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export async function exportDotacionPdf(sol: DotacionSolicitud): Promise<void> {
  const logo = await fetchLogoBase64('/assets/logo-full.png')
  const logoTag = logo ? `<img src="${logo}" style="height:50px;width:auto;object-fit:contain;" />` : ''

  const B  = '1px solid #aaaaaa'
  const TH = `padding:5px 6px;background:#dce6f1;font-weight:bold;text-align:center;font-size:9px;border:${B};vertical-align:middle;`
  const TD = `padding:5px 6px;border:${B};vertical-align:top;font-size:9px;`
  const IL = `padding:4px 6px;border:${B};font-weight:bold;font-size:9px;background:#dce6f1;white-space:nowrap;`
  const IV = `padding:4px 6px;border:${B};font-size:9px;`

  const rows = sol.reposiciones.map(r => {
    const fotos = r.imagenes.length
      ? r.imagenes.map(img =>
          `<img src="${img.url}" style="width:52px;height:52px;object-fit:cover;border-radius:3px;margin:2px;display:inline-block;" crossorigin="anonymous" />`
        ).join('')
      : '—'
    return `<tr>
      <td style="${TD}"><strong>${r.empleado.first_name} ${r.empleado.last_name}</strong><br/><span style="color:#666;">${r.empleado.position}</span></td>
      <td style="${TD}">${r.condicion_encontrada}</td>
      <td style="${TD}text-align:center;">${fmtDate(r.fecha_entrega)}</td>
      <td style="${TD}text-align:center;">${fotos}</td>
    </tr>`
  }).join('')

  const hseImg = sol.firma_hse_url
    ? `<img src="${sol.firma_hse_url}" style="height:45px;display:block;margin:0 auto 4px;" crossorigin="anonymous" />`
    : '<div style="height:45px;"></div>'
  const autImg = sol.firma_autorizador_url
    ? `<img src="${sol.firma_autorizador_url}" style="height:45px;display:block;margin:0 auto 4px;" crossorigin="anonymous" />`
    : '<div style="height:45px;"></div>'

  const html = `
<div style="font-family:Arial,sans-serif;font-size:10px;color:#111;padding:4px;">

  <table style="width:100%;border-collapse:collapse;border:1.5px solid #1E4A8A;">
    <tr>
      <td style="width:16%;padding:8px;border-right:1.5px solid #1E4A8A;text-align:center;vertical-align:middle;">${logoTag}</td>
      <td style="padding:8px;text-align:center;vertical-align:middle;border-right:1.5px solid #1E4A8A;">
        <div style="font-size:11px;font-weight:bold;">HSEQ</div>
        <div style="font-size:10px;font-weight:bold;margin-top:2px;">FORMATO</div>
        <div style="font-size:9px;font-weight:bold;margin-top:6px;">SOLICITUD DE REPOSICIÓN DE DOTACIÓN Y/O ELEMENTOS DE PROTECCIÓN PERSONAL</div>
      </td>
      <td style="width:24%;padding:0;vertical-align:top;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="font-weight:bold;padding:4px 6px;font-size:9px;background:#dce6f1;border-bottom:1px solid #1E4A8A;">CÓDIGO:</td><td style="padding:4px 6px;font-size:9px;border-bottom:1px solid #1E4A8A;">HQ-FO-159</td></tr>
          <tr><td style="font-weight:bold;padding:4px 6px;font-size:9px;background:#dce6f1;border-bottom:1px solid #1E4A8A;">VIGENCIA:</td><td style="padding:4px 6px;font-size:9px;background:#dce6f1;border-bottom:1px solid #1E4A8A;">04/03/2026</td></tr>
          <tr><td style="font-weight:bold;padding:4px 6px;font-size:9px;background:#dce6f1;">VERSIÓN:</td><td style="padding:4px 6px;font-size:9px;">1</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="${IL}">CONTRATO:</td>
      <td style="${IV}">${sol.contrato}</td>
      <td style="${IL}">FECHA:</td>
      <td style="${IV}">${fmtDate(sol.fecha)}</td>
    </tr>
    <tr>
      <td style="${IL}">CAMPO:</td>
      <td style="${IV}" colspan="3">${sol.campo?.name ?? '—'}</td>
    </tr>
    <tr>
      <td style="${IL}">INSPECCIÓN REALIZADA POR:</td>
      <td style="${IV}">${sol.inspeccion_realizada_por}</td>
      <td style="${IL}">CARGO</td>
      <td style="${IV}">${sol.cargo_inspector}</td>
    </tr>
    <tr>
      <th colspan="4" style="background:#dce6f1;text-align:center;padding:5px;font-size:10px;font-weight:bold;border:${B};">HALLAZGO</th>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr>
        <th style="${TH}width:22%;">NOMBRE Y CARGO DEL EMPLEADO</th>
        <th style="${TH}width:33%;">CONDICIÓN ENCONTRADA</th>
        <th style="${TH}width:18%;">FECHA EN QUE SE ENTREGÓ ESTE ELEMENTO</th>
        <th style="${TH}width:27%;">REGISTRO FOTOGRÁFICO</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-top:24px;">
    <tr>
      <td style="width:50%;text-align:center;padding:10px 20px;border-top:1px solid #ccc;">
        ${hseImg}
        <div style="border-top:1px solid #555;padding-top:4px;font-size:9px;font-weight:bold;">${sol.inspeccion_realizada_por}</div>
        <div style="font-size:8px;color:#555;">${sol.cargo_inspector}</div>
      </td>
      <td style="width:50%;text-align:center;padding:10px 20px;border-top:1px solid #ccc;border-left:1px solid #ccc;">
        ${autImg}
        <div style="border-top:1px solid #555;padding-top:4px;font-size:9px;font-weight:bold;">${sol.nombre_autorizador ?? '________________________________'}</div>
        <div style="font-size:8px;color:#555;">${sol.cargo_autorizador ?? 'Autorizador'}</div>
      </td>
    </tr>
  </table>

</div>`

  const { default: html2pdf } = await import('html2pdf.js')
  await html2pdf()
    .set({
      margin:      [8, 8, 8, 8],
      filename:    `Dotacion_${sol.campo?.name ?? 'solicitud'}_${fmtDate(sol.fecha)}.pdf`,
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(html)
    .save()
}

// ── Excel ─────────────────────────────────────────────────────────────────────

export async function exportDotacionExcel(sol: DotacionSolicitud): Promise<void> {
  const [excelModule, { fetchLogoBuffer }] = await Promise.all([
    import('exceljs'),
    import('@/src/lib/report-header'),
  ])
  const ExcelJS = (excelModule as unknown as { default?: typeof excelModule }).default ?? excelModule
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Solicitud')

  ws.columns = [
    { width: 26 },
    { width: 32 },
    { width: 20 },
    { width: 24 },
  ]

  const BLUE  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } } as const
  const THIN  = { style: 'thin', color: { argb: 'FF999999' } } as const
  const SIDES = { top: THIN, left: THIN, bottom: THIN, right: THIN }

  function bdr(cell: Cell)  { cell.border = SIDES }
  function blue(cell: Cell) { cell.fill = BLUE; bdr(cell) }

  // ── Header block (rows 1-3) ──
  ws.mergeCells(1, 1, 3, 1)
  ws.mergeCells(1, 2, 3, 3)

  const titleCell = ws.getCell(1, 2)
  titleCell.value = 'HSEQ\nFORMATO\nSOLICITUD DE REPOSICIÓN DE DOTACIÓN Y/O ELEMENTOS DE PROTECCIÓN PERSONAL'
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  titleCell.font = { bold: true, size: 10 }
  blue(titleCell)

  const codeRows = [['CÓDIGO:', 'HQ-FO-159'], ['VIGENCIA:', '04/03/2026'], ['VERSIÓN:', '1']]
  codeRows.forEach(([label, val], i) => {
    const c = ws.getCell(i + 1, 4)
    c.value = `${label}  ${val}`
    c.font  = { bold: true, size: 9 }
    c.alignment = { vertical: 'middle' }
    blue(c)
    ws.getRow(i + 1).height = 20
  })

  const logoBuf = await fetchLogoBuffer('/assets/logo-full.png')
  if (logoBuf) {
    const imgId = wb.addImage({ buffer: logoBuf, extension: 'png' })
    ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 100, height: 56 } })
  }
  bdr(ws.getCell(1, 1))

  // ── Info rows ──
  let r = 4

  function infoRow(label: string, val: string, label2?: string, val2?: string) {
    ws.getRow(r).height = 15
    const l1 = ws.getCell(r, 1)
    l1.value = label; l1.font = { bold: true, size: 9 }; l1.alignment = { vertical: 'middle' }; blue(l1)
    if (label2 !== undefined) {
      const v1 = ws.getCell(r, 2); v1.value = val; v1.font = { size: 9 }; v1.alignment = { vertical: 'middle' }; bdr(v1)
      const l2 = ws.getCell(r, 3); l2.value = label2; l2.font = { bold: true, size: 9 }; l2.alignment = { vertical: 'middle' }; blue(l2)
      const v2 = ws.getCell(r, 4); v2.value = val2 ?? ''; v2.font = { size: 9 }; v2.alignment = { vertical: 'middle' }; bdr(v2)
    } else {
      ws.mergeCells(r, 2, r, 4)
      const v1 = ws.getCell(r, 2); v1.value = val; v1.font = { size: 9 }; v1.alignment = { vertical: 'middle' }; bdr(v1)
    }
    r++
  }

  infoRow('CONTRATO:', sol.contrato, 'FECHA:', fmtDate(sol.fecha))
  infoRow('CAMPO:', sol.campo?.name ?? '—')
  infoRow('INSPECCIÓN REALIZADA POR:', sol.inspeccion_realizada_por, 'CARGO:', sol.cargo_inspector)

  // ── HALLAZGO header ──
  ws.mergeCells(r, 1, r, 4)
  const hallCell = ws.getCell(r, 1)
  hallCell.value = 'HALLAZGO'
  hallCell.font = { bold: true, size: 10 }
  hallCell.alignment = { horizontal: 'center', vertical: 'middle' }
  blue(hallCell)
  ws.getRow(r).height = 16
  r++

  // ── Column headers ──
  const hdrs = [
    'NOMBRE Y CARGO DEL EMPLEADO',
    'CONDICIÓN ENCONTRADA',
    'FECHA EN QUE SE ENTREGÓ ESTE ELEMENTO',
    'REGISTRO FOTOGRÁFICO',
  ]
  hdrs.forEach((h, ci) => {
    const c = ws.getCell(r, ci + 1)
    c.value = h; c.font = { bold: true, size: 9 }
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    blue(c)
  })
  ws.getRow(r).height = 30
  r++

  // ── Data rows - track row indices for image placement ──
  const repoRowIndex0: number[] = []  // 0-based row index per reposicion

  sol.reposiciones.forEach(repo => {
    repoRowIndex0.push(r - 1)  // 0-based index for ws.addImage
    const numImgs = repo.imagenes.length
    ws.getRow(r).height = numImgs > 0 ? 70 : 40

    const vals = [
      `${repo.empleado.first_name} ${repo.empleado.last_name}\n${repo.empleado.position}`,
      repo.condicion_encontrada,
      fmtDate(repo.fecha_entrega),
      '',  // left empty - images will be placed here
    ]
    vals.forEach((val, ci) => {
      const c = ws.getCell(r, ci + 1)
      c.value = val; c.font = { size: 9 }
      c.alignment = { wrapText: true, vertical: 'top' }
      bdr(c)
    })
    if (numImgs === 0) {
      ws.getCell(r, 4).value = '—'
    }
    r++
  })

  // ── Signature row ──
  r++  // blank spacer
  ws.getRow(r).height = 70
  const sigRow0 = r - 1  // 0-based index for image placement
  ws.mergeCells(r, 1, r, 2)
  ws.mergeCells(r, 3, r, 4)

  const s1 = ws.getCell(r, 1)
  s1.value = `\n\n${sol.inspeccion_realizada_por}\n${sol.cargo_inspector}`
  s1.font = { size: 9 }; s1.alignment = { horizontal: 'center', vertical: 'bottom', wrapText: true }
  s1.border = { top: THIN }

  const s2 = ws.getCell(r, 3)
  s2.value = `\n\n${sol.nombre_autorizador ?? '________________________________'}\n${sol.cargo_autorizador ?? '________________________________'}`
  s2.font = { size: 9 }; s2.alignment = { horizontal: 'center', vertical: 'bottom', wrapText: true }
  s2.border = { top: THIN, left: THIN }

  // ── Fetch and embed all images in parallel ──
  const tasks: Promise<void>[] = []

  sol.reposiciones.forEach((repo, i) => {
    const ri   = repoRowIndex0[i]
    const N    = repo.imagenes.length
    if (N === 0) return
    repo.imagenes.forEach((img, j) => {
      tasks.push((async () => {
        const buf = await fetchLogoBuffer(img.url)
        if (!buf) return
        try {
          const id = wb.addImage({ buffer: buf, extension: getImgExt(img.url) })
          ws.addImage(id, {
            tl: { col: 3 + j / N,       row: ri      },
            br: { col: 3 + (j + 1) / N, row: ri + 1  },
            editAs: 'oneCell',
          } as unknown as ImageRange & { editAs: string })
        } catch { /* skip if image format unsupported */ }
      })())
    })
  })

  if (sol.firma_hse_url) {
    tasks.push((async () => {
      const buf = await fetchLogoBuffer(sol.firma_hse_url!)
      if (!buf) return
      try {
        const id = wb.addImage({ buffer: buf, extension: getImgExt(sol.firma_hse_url!) })
        ws.addImage(id, {
          tl: { col: 0, row: sigRow0     },
          br: { col: 2, row: sigRow0 + 1 },
          editAs: 'oneCell',
        } as unknown as ImageRange & { editAs: string })
      } catch {}
    })())
  }

  if (sol.firma_autorizador_url) {
    tasks.push((async () => {
      const buf = await fetchLogoBuffer(sol.firma_autorizador_url!)
      if (!buf) return
      try {
        const id = wb.addImage({ buffer: buf, extension: getImgExt(sol.firma_autorizador_url!) })
        ws.addImage(id, {
          tl: { col: 2, row: sigRow0     },
          br: { col: 4, row: sigRow0 + 1 },
          editAs: 'oneCell',
        } as unknown as ImageRange & { editAs: string })
      } catch {}
    })())
  }

  await Promise.all(tasks)

  const buf  = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `Dotacion_${sol.campo?.name ?? 'solicitud'}_${fmtDate(sol.fecha)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

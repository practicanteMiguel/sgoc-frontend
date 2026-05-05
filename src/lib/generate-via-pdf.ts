import { buildHtmlHeader } from './report-header'
import { MONTHS, VIA_STATE_LABELS } from '@/src/types/vias.types'
import type { ViaReport } from '@/src/types/vias.types'

export async function downloadViaPdf(
  reports: ViaReport[],
  month: number,
  year: number,
  fieldName: string,
): Promise<void> {
  const header = buildHtmlHeader({
    title:    'Seguimiento a estados de vias',
    subtitle: `Campo: <strong>${fieldName}</strong>`,
    extra:    `Periodo: <strong>${MONTHS[month - 1]} ${year}</strong> &nbsp;&middot;&nbsp; Fecha: <strong>${new Date().toLocaleDateString('es-CO')}</strong>`,
  })

  const parts: string[] = [header]

  for (const report of reports) {
    const typeColor = report.type === 'mensual' ? '#065F46' : '#991B1B'
    const typeLabel = report.type === 'mensual' ? 'INFORME MENSUAL' : 'INFORME URGENTE'
    const date = new Date(report.created_at).toLocaleDateString('es-CO')

    parts.push(`<div style="margin-top:24px;margin-bottom:8px;">
      <strong style="font-size:15px;color:${typeColor};">&#9632; ${typeLabel}</strong>
      <span style="font-size:12px;color:#888;margin-left:12px;">${date}</span>
    </div>`)

    if (report.general_observations) {
      parts.push(`<div style="font-size:12px;margin-bottom:12px;">
        <strong>Observaciones generales:</strong> <em style="color:#444;">${report.general_observations}</em>
      </div>`)
    }

    for (const item of report.items ?? []) {
      parts.push(`<div style="margin-top:16px;margin-bottom:4px;">
        <strong style="font-size:13px;">${item.via_name}</strong>
        <span style="font-size:11px;color:#555;margin-left:8px;">[${VIA_STATE_LABELS[item.state]}]</span>
      </div>`)

      if (item.observations) {
        parts.push(`<p style="font-size:11px;color:#444;font-style:italic;margin:4px 0 8px;">${item.observations}</p>`)
      }

      for (const img of item.capture_group?.images ?? []) {
        parts.push(`<div style="text-align:center;margin-bottom:8px;">
          <img src="${img.url}" style="max-width:340px;max-height:230px;object-fit:contain;" crossorigin="anonymous" />
        </div>`)
      }
    }
  }

  const html = `<div style="font-family:Arial,sans-serif;padding:24px;color:#111;background:#fff;">${parts.join('')}</div>`
  const { default: html2pdf } = await import('html2pdf.js')
  await html2pdf().set({
    margin: 10,
    filename: `Informe_Vias_${MONTHS[month - 1]}_${year}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(html).save()
}

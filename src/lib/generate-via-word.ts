import {
  AlignmentType, BorderStyle, Document, HeightRule, ImageRun,
  Packer, Paragraph, Table, TableCell, TableLayoutType, TableRow,
  TextRun, VerticalAlign, WidthType,
} from 'docx'
import type { ViaReport } from '@/src/types/vias.types'
import { MONTHS, VIA_STATE_LABELS } from '@/src/types/vias.types'

async function fetchBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

function imgType(url: string): 'jpg' | 'png' | 'gif' | 'bmp' {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'png'
  if (ext === 'gif') return 'gif'
  if (ext === 'bmp') return 'bmp'
  return 'jpg'
}

const NIL = { style: BorderStyle.NIL, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NIL, bottom: NIL, left: NIL, right: NIL }

export async function generateViaWord(
  reports: ViaReport[],
  month: number,
  year: number,
  fieldName: string,
): Promise<Blob> {
  const [logoLeftBuf, logoRightBuf] = await Promise.all([
    fetchBuffer('/assets/logo-full.png'),
    fetchBuffer('/assets/Logo_Ecopetrol.png'),
  ])

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        height: { value: 1000, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: logoLeftBuf
              ? [new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [new ImageRun({ type: 'png', data: logoLeftBuf, transformation: { width: 130, height: 65 } })],
                })]
              : [new Paragraph('')],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
                children: [new TextRun({ text: 'SERVICIOS ASOCIADOS SAS.', bold: true, size: 22 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [new TextRun({ text: 'Seguimiento a estados de vias', bold: true, size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Periodo: ${MONTHS[month - 1]} ${year}`, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Fecha de informe: ${new Date().toLocaleDateString('es-CO')}`, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Campo: ${fieldName}`, size: 18 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: logoRightBuf
              ? [new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new ImageRun({ type: 'png', data: logoRightBuf, transformation: { width: 130, height: 65 } })],
                })]
              : [new Paragraph('')],
          }),
        ],
      }),
    ],
  })

  const separator = new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 14, color: '1E4A8A' } },
    spacing: { after: 300 },
  })

  const body: (Paragraph | Table)[] = [headerTable, separator]

  for (const report of reports) {
    body.push(new Paragraph({
      children: [
        new TextRun({
          text: report.type === 'mensual' ? '■ INFORME MENSUAL' : '■ INFORME URGENTE',
          bold: true, size: 24,
          color: report.type === 'mensual' ? '065F46' : '991B1B',
        }),
        new TextRun({
          text: `   ${new Date(report.created_at).toLocaleDateString('es-CO')}`,
          size: 20, color: '888888',
        }),
      ],
      spacing: { before: 360, after: 140 },
    }))

    if (report.general_observations) {
      body.push(new Paragraph({
        children: [
          new TextRun({ text: 'Observaciones generales: ', bold: true, size: 20 }),
          new TextRun({ text: report.general_observations, size: 20, italics: true }),
        ],
        spacing: { after: 200 },
      }))
    }

    for (const item of report.items ?? []) {
      body.push(new Paragraph({
        children: [
          new TextRun({ text: item.via_name, bold: true, size: 22 }),
          new TextRun({ text: `   [${VIA_STATE_LABELS[item.state]}]`, size: 20, color: '555555' }),
        ],
        spacing: { before: 260, after: 80 },
      }))

      if (item.observations) {
        body.push(new Paragraph({
          children: [new TextRun({ text: item.observations, size: 18, italics: true, color: '444444' })],
          spacing: { after: 120 },
        }))
      }

      for (const img of item.capture_group?.images ?? []) {
        const buf = await fetchBuffer(img.url)
        if (!buf) continue
        body.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ type: imgType(img.url), data: buf, transformation: { width: 340, height: 230 } })],
          spacing: { after: 120 },
        }))
      }
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children: body }] })
  return Packer.toBlob(doc)
}

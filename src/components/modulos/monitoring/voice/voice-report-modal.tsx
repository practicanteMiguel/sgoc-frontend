'use client'

import { useState } from 'react'
import { X, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useGenerateVoiceReport, VoiceReport } from '@/src/hooks/monitoring/use-voice-logs'

interface UserInfo {
  name:     string
  position: string
  field:    string | null
}

interface Props {
  ids:      string[]
  userInfo: UserInfo
  onClose:  () => void
}

function formatDate(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function buildTableRows(data: VoiceReport): string {
  return data.days.map((day) => {
    const entriesHtml = day.entries.length === 1
      ? `<p style="margin:0;font-size:11px;line-height:1.7;color:#111">${day.entries[0]}</p>`
      : `<ul style="margin:0;padding-left:16px">${day.entries.map((e) => `<li style="font-size:11px;line-height:1.7;color:#111;margin-bottom:2px">${e}</li>`).join('')}</ul>`

    return `<tr>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #d1d5db;white-space:nowrap">
        <strong style="font-size:11px;color:#111">Dia ${day.dayNumber}</strong><br>
        <span style="font-size:10px;color:#6b7280">${formatDate(day.date)}</span>
      </td>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #d1d5db">
        ${entriesHtml}
      </td>
    </tr>`
  }).join('\n')
}

function buildUserBlock(userInfo: UserInfo): string {
  const lines = [
    ['Nombre', userInfo.name     || '—'],
    ['Cargo',  userInfo.position || '—'],
    ['Planta', userInfo.field    || '—'],
  ]
  return `<div style="margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e5e7eb">
    ${lines.map(([label, value]) =>
      `<p style="margin:0 0 4px;font-size:11px;color:#111"><strong style="color:#374151">${label}:</strong> ${value}</p>`
    ).join('')}
  </div>`
}

function buildPdfBody(data: VoiceReport, resolvedTitle: string, userInfo: UserInfo): string {
  const now = format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })
  return `
    <div style="border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:20px">
      <h1 style="font-size:20px;font-weight:700;margin:0 0 4px">${resolvedTitle}</h1>
      <span style="font-size:10px;color:#6b7280">${data.sources} fuente${data.sources !== 1 ? 's' : ''} &nbsp;·&nbsp; Generado el ${now}</span>
    </div>
    ${buildUserBlock(userInfo)}
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      <thead>
        <tr>
          <th style="background:#1a3a3a;color:#fff;padding:9px 12px;font-size:11px;text-align:left;border:1px solid #1a3a3a;width:22%">Dia</th>
          <th style="background:#1a3a3a;color:#fff;padding:9px 12px;font-size:11px;text-align:left;border:1px solid #1a3a3a">Descripcion</th>
        </tr>
      </thead>
      <tbody>
        ${buildTableRows(data)}
      </tbody>
    </table>
    <div style="margin-top:36px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;display:flex;justify-content:space-between">
      <span>${resolvedTitle}</span>
      <span>Generado el ${now}</span>
    </div>`
}

async function downloadReport(data: VoiceReport, resolvedTitle: string, userInfo: UserInfo): Promise<void> {
  const body = buildPdfBody(data, resolvedTitle, userInfo)
  const html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;padding:32px 40px;color:#111;background:#fff;max-width:760px">${body}</div>`
  const { default: html2pdf } = await import('html2pdf.js')
  await html2pdf().set({
    margin:      10,
    filename:    `${resolvedTitle}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(html).save()
}

export function VoiceReportModal({ ids, userInfo, onClose }: Props) {
  const [title,       setTitle]       = useState('')
  const [downloading, setDownloading] = useState(false)
  const generate = useGenerateVoiceReport()

  async function handleGenerate() {
    const resolvedTitle = title.trim() || 'Informe de transcripciones'
    generate.mutate({ ids, title: resolvedTitle }, {
      onSuccess: async (data) => {
        setDownloading(true)
        try {
          await downloadReport(data, resolvedTitle, userInfo)
          onClose()
        } finally {
          setDownloading(false)
        }
      },
      onError: () => toast.error('Error al generar el informe'),
    })
  }

  const busy = generate.isPending || downloading

  return (
    <ModalPortal onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
          width:      '480px',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-secundary)' }}>Generar informe tecnico</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {ids.length} transcripcion{ids.length !== 1 ? 'es' : ''} seleccionada{ids.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-400)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-400)' }}>
              Titulo del informe (opcional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Informe semanal abril 2026"
              className="w-full outline-none rounded-lg px-3 py-2.5 text-sm"
              style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-900)' }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !busy) handleGenerate() }}
            />
          </div>

          {busy ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                {generate.isPending ? 'Generando informe con IA...' : 'Descargando PDF...'}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Esto puede tardar unos segundos</p>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <FileText size={14} />
              Generar y descargar PDF
            </button>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

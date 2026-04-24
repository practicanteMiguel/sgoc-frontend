'use client'

import { useState } from 'react'
import { X, Loader2, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useGenerateVoiceReport } from '@/src/hooks/monitoring/use-voice-logs'

interface Props {
  ids:     string[]
  onClose: () => void
}

function markdownToHtml(text: string): string {
  const lines  = text.split('\n')
  const result: string[] = []
  let inList   = false

  for (const raw of lines) {
    const line = raw.trim()

    if (line.startsWith('# ')) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<h1>${line.slice(2)}</h1>`)
    } else if (line.startsWith('## ')) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<h2>${line.slice(3)}</h2>`)
    } else if (line.startsWith('### ')) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<h3>${line.slice(4)}</h3>`)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) { result.push('<ul>'); inList = true }
      result.push(`<li>${line.slice(2)}</li>`)
    } else if (line === '') {
      if (inList) { result.push('</ul>'); inList = false }
      result.push('<br>')
    } else {
      if (inList) { result.push('</ul>'); inList = false }
      // strip remaining bold/italic markers
      const clean = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '$1')
      result.push(`<p>${clean}</p>`)
    }
  }

  if (inList) result.push('</ul>')
  return result.join('\n')
}

function buildPdfHtml(title: string, body: string, sources: number): string {
  const now = format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })
  return `<!DOCTYPE html><html lang="es">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#111;padding:36px 42px;max-width:760px;margin:0 auto}
.header{border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:24px}
.header h1{font-size:22px;font-weight:700;margin-bottom:4px}
.meta{font-size:10px;color:#6b7280}
h1{font-size:18px;font-weight:700;margin:20px 0 8px;color:#111}
h2{font-size:15px;font-weight:700;margin:18px 0 6px;color:#111;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
h3{font-size:13px;font-weight:600;margin:14px 0 5px;color:#374151}
p{font-size:12px;line-height:1.7;margin-bottom:8px;color:#111}
ul{padding-left:20px;margin:6px 0 10px}
li{font-size:12px;line-height:1.7;margin-bottom:3px;color:#111}
strong{font-weight:700}
br{display:block;content:'';margin:6px 0}
.footer{margin-top:36px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;display:flex;justify-content:space-between}
@media print{body{padding:0}}
</style>
</head>
<body>
<div class="header">
  <h1>${title}</h1>
  <div class="meta">${sources} fuente${sources !== 1 ? 's' : ''} &nbsp;·&nbsp; Generado el ${now}</div>
</div>
${markdownToHtml(body)}
<div class="footer">
  <span>${title}</span>
  <span>Generado el ${now}</span>
</div>
</body></html>`
}

export function VoiceReportModal({ ids, onClose }: Props) {
  const [title,   setTitle]   = useState('')
  const [printed, setPrinted] = useState(false)
  const generate = useGenerateVoiceReport()

  function handleGenerate() {
    const resolvedTitle = title.trim() || 'Informe de transcripciones'
    generate.mutate({ ids, title: resolvedTitle }, {
      onSuccess: (data) => {
        const html = buildPdfHtml(data.title || resolvedTitle, data.report, data.sources)
        const win  = window.open('', '_blank')
        if (win) {
          win.document.write(html)
          win.document.close()
          setTimeout(() => win.print(), 400)
        }
        setPrinted(true)
      },
    })
  }

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
          {printed ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'var(--color-secondary-muted)', color: 'var(--color-secondary)' }}
              >
                <FileText size={22} />
              </div>
              <p className="text-sm font-semibold text-center" style={{ color: 'var(--color-secundary)' }}>
                Informe abierto
              </p>
              <p className="text-xs text-center" style={{ color: 'var(--color-text-400)' }}>
                Se abrio el dialogo de impresion en una nueva pestana.
                Guarda como PDF desde ahi.
              </p>
              <button
                onClick={onClose}
                className="mt-2 w-full py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
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
                  onKeyDown={(e) => { if (e.key === 'Enter' && !generate.isPending) handleGenerate() }}
                />
              </div>

              {generate.isPending ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Generando informe con IA...</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Esto puede tardar unos segundos</p>
                </div>
              ) : (
                <button
                  onClick={handleGenerate}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                >
                  <FileText size={14} />
                  Generar y exportar PDF
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

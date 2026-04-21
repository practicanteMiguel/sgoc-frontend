'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  ArrowLeft, Loader2, Save, FileDown, Mail, CheckCircle2, AlertCircle,
  Calendar, ChevronDown, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLog } from '@/src/hooks/activities/use-logbook'
import {
  useTechnicalReports,
  useCreateTechnicalReport,
  useUpdateTechnicalReport,
} from '@/src/hooks/activities/use-technical-reports'
import { REQUIREMENT_OPTIONS } from '@/src/types/activities.types'
import type { TechnicalReport, Activity } from '@/src/types/activities.types'
import { ReportSummaryStats } from './charts/report-summary-stats'

interface Props {
  logId:     string
  crewId:    string
  fieldName?: string
  onBack:    () => void
}

export interface ActivityForm {
  requirement:        string
  additional_resource: string
  progress:           string
  is_scheduled:       boolean
}

export type ActivityForms = Record<string, ActivityForm>

export function emptyForm(): ActivityForm {
  return { requirement: '', additional_resource: '', progress: '', is_scheduled: true }
}

function fmt(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function buildGanttHtml(activities: Activity[], forms: ActivityForms, weekNumber: number): string {
  const BASE  = Date.UTC(2025, 11, 29)
  const dates = Array.from({ length: 7 }, (_, i) => {
    const ms = BASE + ((weekNumber - 1) * 7 + i) * 86400000
    return new Date(ms).toISOString().slice(0, 10)
  })
  const DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

  const header = dates
    .map((d, i) => `<th style="padding:6px 4px;text-align:center;font-size:10px;border:1px solid #d1d5db;min-width:54px;">
      ${DAYS[i]}<br><span style="font-weight:normal;font-size:9px;">${d.slice(8,10)}/${d.slice(5,7)}</span></th>`)
    .join('')

  const bodyRows = activities.map((act, actIdx) => {
    const start = act.start_date
    const end   = act.end_date ?? act.start_date
    let si = -1, ei = -1
    for (let i = 0; i < 7; i++) {
      if (dates[i] >= start && dates[i] <= end) { if (si === -1) si = i; ei = i }
    }
    if (si === -1) return ''
    const raw  = parseFloat(forms[act.id]?.progress ?? act.progress ?? '0')
    const p    = isNaN(raw) ? 0 : Math.min(100, Math.max(0, raw))
    const col  = p >= 75 ? '#10b981' : p >= 40 ? '#f59e0b' : '#ef4444'
    const span = ei - si + 1
    const cells = Array.from({ length: 7 }, (_, di) => {
      if (di < si || di > ei) return `<td style="border:1px solid #e5e7eb;"></td>`
      const isStart  = di === si
      const isEnd    = di === ei
      const isSingle = si === ei
      const br = isSingle ? '3px' : isStart ? '3px 0 0 3px' : isEnd ? '0 3px 3px 0' : '0'
      const pos   = di - si
      const cellS = pos / span
      const cellE = (pos + 1) / span
      const pFrac = p / 100
      let fill = 0
      if (pFrac >= cellE) fill = 100
      else if (pFrac > cellS) fill = ((pFrac - cellS) * span) * 100
      const pad = `padding:4px ${isEnd ? '4px' : '0'} 4px ${isStart ? '4px' : '0'}`
      return `<td style="border:1px solid #e5e7eb;${pad};">
        <div style="position:relative;background:#1e3a5f;height:18px;border-radius:${br};overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <div style="position:absolute;left:0;top:0;bottom:0;width:${fill}%;background:${col};opacity:0.85;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
          ${isEnd ? `<span style="position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:8px;font-weight:bold;color:white;">${p}%</span>` : ''}
        </div></td>`
    }).join('')
    return `<tr>
      <td style="border:1px solid #e5e7eb;padding:5px 8px;font-size:11px;text-align:center;font-weight:bold;">${actIdx + 1}</td>
      ${cells}</tr>`
  }).join('')

  return `<h3 style="font-size:13px;color:#1a3a3a;margin:24px 0 8px;">Cronograma de actividades</h3>
  <table style="width:100%;border-collapse:collapse;">
    <thead><tr style="background:#1a3a3a;color:white;">
      <th style="padding:8px;text-align:center;font-size:11px;border:1px solid #d1d5db;width:36px;">#</th>
      ${header}
    </tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>`
}

function buildBarChartSvg(activities: Activity[], forms: ActivityForms, weekNumber: number): string {
  const BASE   = Date.UTC(2025, 11, 29)
  const wDates = Array.from({ length: 7 }, (_, i) => {
    const ms = BASE + ((weekNumber - 1) * 7 + i) * 86400000
    return new Date(ms).toISOString().slice(0, 10)
  })
  const DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
  const total = activities.length
  const wt    = total > 0 ? 100 / total : 0
  let cumP = 0, cumE = 0
  const data = wDates.map((ds, wi) => {
    let pl = 0, ex = 0, dp = 0, de = 0
    for (const act of activities) {
      const s = act.start_date, e = act.end_date ?? s
      if (ds >= s && ds <= e) {
        pl++
        const dur = Math.round((Date.UTC(+e.slice(0,4),+e.slice(5,7)-1,+e.slice(8,10)) - Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10)))/86400000)+1
        const dw  = wt / dur
        dp += dw
        const raw = parseFloat(forms[act.id]?.progress ?? act.progress ?? '0')
        const p   = isNaN(raw) ? 0 : Math.min(100, Math.max(0, raw))
        if (p > 75) { ex++; de += dw * (p / 100) }
      }
    }
    cumP += dp; cumE += de
    return { day: DAYS[wi], date: ds, pl, ex, proj: Math.round(cumP), exec: Math.round(cumE) }
  })

  const W = 500, H = 200
  const mT = 22, mR = 46, mB = 50, mL = 26
  const pW = W - mL - mR, pH = H - mT - mB
  const maxBar  = Math.max(...data.map(d => d.pl), 1)
  const yBarMax = Math.ceil(maxBar * 1.6) || 4
  const dayW    = pW / 7
  const cx      = (i: number) => mL + (i + 0.5) * dayW
  const yB      = (v: number) => mT + pH - (v / yBarMax) * pH
  const yP      = (v: number) => mT + pH - (v / 100) * pH
  const bW      = Math.min(10, dayW * 0.3)

  const grid = [0, 25, 50, 75, 100].map(p =>
    `<line x1="${mL}" y1="${yP(p)}" x2="${W - mR}" y2="${yP(p)}" stroke="#e5e7eb" stroke-width="1"/>`
  ).join('')

  const yLeft = Array.from({ length: yBarMax + 1 }, (_, v) =>
    `<text x="${mL - 4}" y="${yB(v) + 3}" text-anchor="end" font-size="8" fill="#9ca3af">${v}</text>`
  ).join('')

  const yRight = [0, 25, 50, 75, 100].map(p =>
    `<text x="${W - mR + 4}" y="${yP(p) + 3}" text-anchor="start" font-size="8" fill="#9ca3af">${p}%</text>`
  ).join('')

  const bars = data.map((d, i) => {
    const pH2 = (v: number) => (v / yBarMax) * pH
    const r1 = d.pl > 0 ? `<rect x="${cx(i) - bW - 1}" y="${yB(d.pl)}" width="${bW}" height="${pH2(d.pl)}" fill="#334155" rx="2"/>` : ''
    const r2 = d.ex > 0 ? `<rect x="${cx(i) + 1}" y="${yB(d.ex)}" width="${bW}" height="${pH2(d.ex)}" fill="#10b981" rx="2"/>` : ''
    return r1 + r2
  }).join('')

  const xLabels = data.map((d, i) => [
    `<text x="${cx(i)}" y="${mT + pH + 13}" text-anchor="middle" font-size="10" fill="#6b7280">${d.day}</text>`,
    `<text x="${cx(i) - 6}" y="${mT + pH + 24}" text-anchor="middle" font-size="8" font-weight="600" fill="#334155">${d.pl}</text>`,
    `<text x="${cx(i) + 6}" y="${mT + pH + 24}" text-anchor="middle" font-size="8" font-weight="600" fill="#10b981">${d.ex}</text>`,
  ].join('')).join('')

  const projPts  = data.map((d, i) => `${cx(i)},${yP(d.proj)}`).join(' ')
  const execPts  = data.map((d, i) => `${cx(i)},${yP(d.exec)}`).join(' ')
  const projDots = data.map((d, i) => `<circle cx="${cx(i)}" cy="${yP(d.proj)}" r="3" fill="#0ea5e9"/>`).join('')
  const execDots = data.map((d, i) => `<circle cx="${cx(i)}" cy="${yP(d.exec)}" r="2.5" fill="#10b981" opacity="0.8"/>`).join('')
  const projLbls = data.map((d, i) => d.proj > 0 ? `<text x="${cx(i)}" y="${yP(d.proj) - 5}" text-anchor="middle" font-size="7" fill="#0ea5e9">${d.proj}%</text>` : '').join('')
  const execLbls = data.map((d, i) => d.exec > 0 ? `<text x="${cx(i)}" y="${yP(d.exec) + 14}" text-anchor="middle" font-size="7" fill="#10b981">${d.exec}%</text>` : '').join('')

  const legend = [
    { x: mL,       col: '#334155', label: 'Planeadas',       type: 'rect' },
    { x: mL + 68,  col: '#10b981', label: 'Ejecutadas',      type: 'rect' },
    { x: mL + 140, col: '#0ea5e9', label: 'Proyectado',      type: 'solid' },
    { x: mL + 208, col: '#10b981', label: 'Ejecutado acum.', type: 'dashed' },
  ].map(({ x, col, label, type }) => {
    const lY = mT - 8
    const sym = type === 'rect'
      ? `<rect x="${x}" y="${lY - 4}" width="10" height="8" fill="${col}" rx="1"/>`
      : type === 'solid'
        ? `<line x1="${x}" y1="${lY}" x2="${x + 12}" y2="${lY}" stroke="${col}" stroke-width="2"/><circle cx="${x + 6}" cy="${lY}" r="2" fill="${col}"/>`
        : `<line x1="${x}" y1="${lY}" x2="${x + 12}" y2="${lY}" stroke="${col}" stroke-width="2" stroke-dasharray="4 3"/>`
    return sym + `<text x="${x + 14}" y="${lY + 4}" font-size="8" fill="#6b7280">${label}</text>`
  }).join('')

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${grid}${yLeft}${yRight}${bars}
    <polyline points="${projPts}" fill="none" stroke="#0ea5e9" stroke-width="2"/>
    ${projDots}${projLbls}
    <polyline points="${execPts}" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="5 4"/>
    ${execDots}${execLbls}
    ${xLabels}${legend}
  </svg>`
}

export function buildPdfBody(
  crewName:   string,
  weekNumber: number,
  year:       number,
  fieldName:  string,
  activities: Activity[],
  forms:      ActivityForms,
): string {
  // --- Stats ---
  const total = activities.length
  let execSum = 0, execCount = 0
  for (const act of activities) {
    const raw = parseFloat(forms[act.id]?.progress ?? act.progress ?? '0')
    const p   = isNaN(raw) ? 0 : Math.min(100, Math.max(0, raw))
    if (p > 75) { execSum += p; execCount++ }
  }
  const rend = total > 0 && execCount > 0 ? Math.round((execSum / (total * 100)) * 100) : 0
  const rcol = rend >= 80 ? '#10b981' : rend >= 50 ? '#f59e0b' : '#ef4444'
  const R    = 38
  const circ = +(2 * Math.PI * R).toFixed(2)
  const dash = +((circ * rend) / 100).toFixed(2)

  const statsHtml = `
  <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:20px;">
    <!-- Left 25%: cards + donut -->
    <div style="flex:0 0 22%;min-width:130px;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;gap:8px;">
        <div style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;">
          <div style="font-size:20px;font-weight:bold;color:#111;">${total}</div>
          <div style="font-size:9px;color:#6b7280;line-height:1.3;">Actividades<br>Planeadas</div>
        </div>
        <div style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;">
          <div style="font-size:20px;font-weight:bold;color:${rcol};">${execCount}</div>
          <div style="font-size:9px;color:#6b7280;line-height:1.3;">Actividades<br>Ejecutadas</div>
        </div>
      </div>
      <div style="display:flex;justify-content:center;align-items:center;padding:4px 0;">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="${R}" fill="none" stroke="#e5e7eb" stroke-width="14"/>
          <circle cx="50" cy="50" r="${R}" fill="none" stroke="${rcol}" stroke-width="14"
            stroke-dasharray="${dash} ${circ}" transform="rotate(-90 50 50)"/>
          <text x="50" y="47" text-anchor="middle" font-size="14" font-weight="bold" fill="${rcol}">${rend}%</text>
          <text x="50" y="60" text-anchor="middle" font-size="8" fill="#9ca3af">rendimiento</text>
        </svg>
      </div>
    </div>
    <!-- Right 75%: bar chart -->
    <div style="flex:1;">
      <p style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Cumplimiento de la semana</p>
      ${buildBarChartSvg(activities, forms, weekNumber)}
    </div>
  </div>`

  const rows = activities.map((act, idx) => {
    const f = forms[act.id] ?? emptyForm()
    const progress = f.progress || act.progress || '-'
    const progressDisplay = progress !== '-' ? `${progress}%` : '-'
    return `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px 10px; font-size:11px; text-align:center; font-weight:bold;">${idx + 1}</td>
      <td style="padding:8px 10px; font-size:12px;">${act.description}</td>
      <td style="padding:8px 10px; font-size:11px;">${f.additional_resource || act.additional_resource || '-'}</td>
      <td style="padding:8px 10px; font-size:11px;">${f.requirement || act.requirement || '-'}</td>
      <td style="padding:8px 10px; font-size:12px; white-space:nowrap;">${fmt(act.start_date)}${act.end_date !== act.start_date ? ` - ${fmt(act.end_date)}` : ''}</td>
      <td style="padding:8px 10px; font-size:12px; text-align:center;">${progressDisplay}</td>
      <td style="padding:8px 10px; font-size:11px; text-align:center;">
        <span style="padding:2px 8px; border-radius:9999px; font-size:10px; font-weight:600;
          background:${f.is_scheduled ? '#d1fae5' : '#fee2e2'};
          color:${f.is_scheduled ? '#065f46' : '#991b1b'};">
          ${f.is_scheduled ? 'Prog.' : 'No prog.'}
        </span>
      </td>
    </tr>
  `}).join('')

  return `
  <h1>Informe Tecnico Semanal</h1>
  <p class="sub">
    Planta: <strong>${fieldName}</strong> &nbsp;&middot;&nbsp;
    Cuadrilla: <strong>${crewName}</strong> &nbsp;&middot;&nbsp;
    Semana <strong>${weekNumber}</strong> &middot; <strong>${year}</strong>
  </p>
  ${statsHtml}
  <table>
    <thead>
      <tr>
        <th style="width:36px;text-align:center;">#</th>
        <th>Actividad</th>
        <th>Recurso Adicional</th>
        <th>Requerimiento</th>
        <th>Fechas</th>
        <th>Avance</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  ${buildGanttHtml(activities, forms, weekNumber)}`
}

export const PDF_STYLES = `
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111; }
  h1   { font-size: 20px; margin-bottom: 4px; color: #1a3a3a; }
  .sub { font-size: 13px; color: #555; margin-bottom: 20px; }
  table  { width:100%; border-collapse:collapse; margin-top:20px; }
  thead tr { background:#1a3a3a; color:#fff; }
  thead th { padding:10px; font-size:12px; text-align:left; }
  .page-break { page-break-after: always; }
`

export function openPrintWindow(bodyHtml: string, title: string, styles: string = PDF_STYLES): void {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${title}</title>
  <style>${styles}</style></head><body>
  ${bodyHtml}
  </body></html>`
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 400)
}

export function ReportGenerate({ logId, crewId, fieldName = '', onBack }: Props) {
  const { data: log, isLoading: loadingLog } = useLog(logId)

  const { data: crewReports = [], isLoading: loadingReports } = useTechnicalReports({ crew_id: crewId })

  const existingReport = useMemo(() => {
    return (crewReports as TechnicalReport[]).find((r) => r.weekly_log?.id === logId) ?? null
  }, [crewReports, logId])

  const createReport = useCreateTechnicalReport()
  const updateReport = useUpdateTechnicalReport()

  const [reportId,    setReportId]    = useState<string | null>(null)
  const [forms,       setForms]       = useState<ActivityForms>({})
  const [saved,       setSaved]       = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [generating,  setGenerating]  = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    if (!log || loadingReports || initialized.current) return
    initialized.current = true

    const initial: ActivityForms = {}
    for (const act of log.activities ?? []) {
      initial[act.id] = {
        requirement:         act.requirement         ?? '',
        additional_resource: act.additional_resource ?? '',
        progress:            act.progress            ?? '',
        is_scheduled:        act.is_scheduled ?? true,
      }
    }
    setForms(initial)

    if (existingReport) {
      setReportId(existingReport.id)
      setSaved(true)
      const overlay: ActivityForms = { ...initial }
      for (const act of existingReport.weekly_log?.activities ?? []) {
        overlay[act.id] = {
          requirement:         act.requirement         ?? '',
          additional_resource: act.additional_resource ?? '',
          progress:            act.progress            ?? '',
          is_scheduled:        act.is_scheduled        ?? true,
        }
      }
      setForms(overlay)
    }
  }, [log, existingReport, loadingReports])

  function toggleExpand(actId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(actId)) next.delete(actId)
      else next.add(actId)
      return next
    })
  }

  function setActivityField<K extends keyof ActivityForm>(actId: string, key: K, val: ActivityForm[K]) {
    setForms((prev) => ({
      ...prev,
      [actId]: { ...(prev[actId] ?? emptyForm()), [key]: val },
    }))
    setSaved(false)
  }

  function handleProgressChange(actId: string, raw: string) {
    const n = parseInt(raw, 10)
    if (raw === '') { setActivityField(actId, 'progress', ''); return }
    if (!isNaN(n)) setActivityField(actId, 'progress', String(Math.min(100, Math.max(0, n))))
  }

  function buildActivitiesPayload(activities: Activity[]) {
    return activities.map((act) => {
      const f = forms[act.id] ?? emptyForm()
      return {
        activity_id:         act.id,
        requirement:         f.requirement         || undefined,
        additional_resource: f.additional_resource || undefined,
        progress:            f.progress            || undefined,
        is_scheduled:        f.is_scheduled,
      }
    })
  }

  async function handleGenerate() {
    if (!log) return
    const acts = log.activities ?? []
    if (acts.length === 0) { toast.error('La bitacora no tiene actividades'); return }
    setGenerating(true)
    try {
      const report = await createReport.mutateAsync({
        log_id:     logId,
        activities: buildActivitiesPayload(acts),
      })
      setReportId(report.id)
      setSaved(true)
      toast.success('Informe generado')
    } catch {}
    setGenerating(false)
  }

  async function handleSave() {
    if (!reportId || !log) return
    setSaving(true)
    try {
      await updateReport.mutateAsync({
        id:   reportId,
        data: { activities: buildActivitiesPayload(log.activities ?? []) },
      })
      setSaved(true)
      toast.success('Guardado')
    } catch {}
    setSaving(false)
  }

  function handlePdf() {
    if (!log) return
    const body = buildPdfBody(
      log.crew.name,
      log.week_number,
      log.year,
      fieldName || log.crew.field?.name || '',
      log.activities ?? [],
      forms,
    )
    openPrintWindow(body, `Informe Tecnico - ${log.crew.name} - Semana ${log.week_number}`)
  }

  const isLoading  = loadingLog || loadingReports
  const hasReport  = !!reportId
  const activities = log?.activities ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
      </div>
    )
  }

  if (!log) return null

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-secundary)' }}>
              Informe tecnico
            </h3>
            <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              <Calendar size={11} />
              {log.crew.name} &middot; Semana {log.week_number} &middot; {log.year}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!hasReport && (
            <button
              onClick={handleGenerate}
              disabled={generating || activities.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
              style={{
                background: 'var(--color-primary)',
                color:      '#fff',
                opacity:    (generating || activities.length === 0) ? 0.6 : 1,
              }}
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              {generating ? 'Generando...' : 'Generar informe'}
            </button>
          )}
          {hasReport && !saved && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-primary)', color: '#fff', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
          {hasReport && (
            <>
              <button
                onClick={handlePdf}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)', border: '1px solid var(--color-border)' }}
              >
                <FileDown size={13} /> Exportar PDF
              </button>
              <button
                onClick={() => toast.info('Envio por correo: funcionalidad pendiente de configurar en el servidor')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)', border: '1px solid var(--color-border)' }}
              >
                <Mail size={13} /> Enviar por correo
              </button>
            </>
          )}
        </div>
      </div>

      {/* No activities */}
      {activities.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <AlertCircle size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Bitacora sin actividades</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
            Regresa a la bitacora y agrega actividades antes de generar el informe.
          </p>
        </div>
      )}

      {activities.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Summary stats + donut */}
          <ReportSummaryStats activities={activities} forms={forms} weekNumber={log.week_number} />

          {/* Save status */}
          {hasReport && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
            >
              {saved
                ? <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                : <AlertCircle  size={14} style={{ color: 'var(--color-text-400)' }} />}
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-700)' }}>
                {saved ? 'Informe guardado - puedes modificar los datos y guardar de nuevo' : 'Cambios sin guardar'}
              </span>
            </div>
          )}

          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-400)' }}>
            {hasReport ? 'Actividades del informe' : `Completa los datos de las ${activities.length} actividades`}
          </h4>

          {/* Activity cards - collapsible */}
          {activities.map((act, i) => {
            const f        = forms[act.id] ?? emptyForm()
            const expanded = expandedIds.has(act.id)
            const progress = f.progress || act.progress || ''
            return (
              <div
                key={act.id}
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--color-border)' }}
              >
                {/* Collapsed header - always visible */}
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ background: 'var(--color-surface-1)' }}
                >
                  {/* Number */}
                  <span
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}
                  >
                    {i + 1}
                  </span>

                  {/* Description */}
                  <p className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                    {act.description}
                  </p>

                  {/* Programada toggle */}
                  <button
                    onClick={() => setActivityField(act.id, 'is_scheduled', !f.is_scheduled)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: f.is_scheduled ? '#d1fae5' : '#fee2e2',
                      color:      f.is_scheduled ? '#065f46' : '#991b1b',
                    }}
                  >
                    {f.is_scheduled
                      ? <><CheckCircle2 size={10} /> Prog.</>
                      : <><AlertCircle  size={10} /> No prog.</>}
                  </button>

                  {/* Expand chevron */}
                  <button
                    onClick={() => toggleExpand(act.id)}
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-400)' }}
                  >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>

                {/* Expanded content */}
                {expanded && (
                  <div
                    className="px-4 py-3 flex flex-col gap-3"
                    style={{ background: 'var(--color-surface-0)', borderTop: '1px solid var(--color-border)' }}
                  >
                    {/* Date */}
                    <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                      {fmt(act.start_date)}{act.end_date !== act.start_date && ` - ${fmt(act.end_date)}`}
                    </p>

                    {/* Requerimiento */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-400)' }}>
                        Requerimiento
                      </label>
                      <select
                        value={f.requirement}
                        onChange={(e) => setActivityField(act.id, 'requirement', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                        style={{
                          background: 'var(--color-surface-1)',
                          border:     '1.5px solid var(--color-border)',
                          color:      f.requirement ? 'var(--color-text-900)' : 'var(--color-text-400)',
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {REQUIREMENT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Recurso adicional */}
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-400)' }}>
                          Recurso adicional
                        </label>
                        <input
                          value={f.additional_resource}
                          onChange={(e) => setActivityField(act.id, 'additional_resource', e.target.value)}
                          placeholder="Ej. Retroexcavadora..."
                          className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                          style={{
                            background: 'var(--color-surface-1)',
                            border:     '1.5px solid var(--color-border)',
                            color:      'var(--color-text-900)',
                          }}
                        />
                      </div>

                      {/* Avance */}
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-400)' }}>
                          Avance
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={progress}
                            onChange={(e) => handleProgressChange(act.id, e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                            style={{
                              background: 'var(--color-surface-1)',
                              border:     '1.5px solid var(--color-border)',
                              color:      'var(--color-text-900)',
                            }}
                          />
                          <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--color-text-400)' }}>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

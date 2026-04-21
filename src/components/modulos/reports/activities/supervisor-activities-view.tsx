'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Plus, Users, BookOpen, FileText, Loader2, Trash2, Pencil,
  ChevronRight, ChevronDown, Calendar, Lock, Download, CheckSquare, Square, Check, FileSpreadsheet,
} from 'lucide-react'
import { useAuthStore } from '@/src/stores/auth.store'
import { useField } from '@/src/hooks/reports/use-fields'
import { useCrews, useDeleteCrew } from '@/src/hooks/activities/use-crews'
import { useLogs, useCreateLog } from '@/src/hooks/activities/use-logbook'
import { useTechnicalReports } from '@/src/hooks/activities/use-technical-reports'
import { CrewModal } from './crew-modal'
import { LogbookDetail } from './logbook-detail'
import { ReportGenerate, buildPdfBody, openPrintWindow, PDF_STYLES } from './report-generate'
import type { ActivityForms } from './report-generate'
import type { Crew, WeeklyLog, WeeklyLogSummary, TechnicalReport } from '@/src/types/activities.types'

type SubTab = 'cuadrillas' | 'bitacoras' | 'informes'

type DrillView =
  | null
  | { type: 'logbook'; logId: string; crewId: string }
  | { type: 'report';  logId: string; crewId: string }

const NOW     = new Date()
const BASE_MS = Date.UTC(2025, 11, 29)
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function weekToMonthInfo(weekNumber: number) {
  const ms = BASE_MS + ((weekNumber - 1) * 7 + 3) * 86400000
  const d  = new Date(ms)
  return { month: d.getUTCMonth(), year: d.getUTCFullYear() }
}

function getWeekNumber(d: Date) {
  const date   = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function expandDates(start: string, end: string): string {
  try {
    const [sy, sm, sd] = start.split('-').map(Number)
    const [ey, em, ed] = end.split('-').map(Number)
    const startMs = Date.UTC(sy, sm - 1, sd)
    const endMs   = Date.UTC(ey, em - 1, ed)
    const dates: string[] = []
    for (let ms = startMs; ms <= endMs; ms += 86400000) {
      const d = new Date(ms)
      dates.push(`${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`)
    }
    return dates.join('\n')
  } catch {
    return start
  }
}

async function generateWeekExcel(
  logSummaries: WeeklyLogSummary[],
  fieldName: string,
  weekNumber: number,
  setExporting: (v: boolean) => void,
) {
  setExporting(true)
  try {
    const { api } = await import('@/src/lib/axios')
    const fullLogs = await Promise.all(
      logSummaries.map((s) => api.get<WeeklyLog>(`/logbook/${s.id}`).then((r) => r.data)),
    )

    const ExcelJSModule = await import('exceljs')
    const ExcelJS = (ExcelJSModule as any).default ?? ExcelJSModule
    const wb = new ExcelJS.Workbook()

    const HEADERS    = ['Descripción de Actividad', 'Fecha', 'Antes', 'Durante', 'Después', 'Comentarios/Observaciones']
    const COL_WIDTHS = [35, 15, 43, 43, 43, 28]
    const IMG_COLS   = [2, 3, 4] // 0-indexed col positions (C, D, E)
    const ROW_H      = 160

    const borderSide = { style: 'thin' } as const
    const allBorders = { top: borderSide, bottom: borderSide, left: borderSide, right: borderSide }

    for (const log of fullLogs) {
      if (!log?.activities?.length) continue

      const ws = wb.addWorksheet(log.crew.name.slice(0, 31))
      ws.columns = HEADERS.map((header, i) => ({ header, width: COL_WIDTHS[i] }))

      const headerRow = ws.getRow(1)
      headerRow.height = 28
      headerRow.eachCell((cell: any) => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } }
        cell.font      = { bold: true, size: 10, color: { argb: 'FF000000' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        cell.border    = allBorders
      })

      let rowIdx = 2
      for (const act of log.activities) {
        const row  = ws.getRow(rowIdx)
        row.height = ROW_H

        row.getCell(1).value     = act.description
        row.getCell(1).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }

        row.getCell(2).value     = expandDates(act.start_date, act.end_date)
        row.getCell(2).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }

        row.getCell(6).value     = act.notes ?? ''
        row.getCell(6).alignment = { wrapText: true, vertical: 'middle' }

        for (let c = 1; c <= 6; c++) row.getCell(c).border = allBorders

        const imgUrls = [act.image_before, act.image_during, act.image_after]
        for (let i = 0; i < imgUrls.length; i++) {
          const url = imgUrls[i]
          if (!url) continue
          try {
            const res = await fetch(url)
            const buf = await res.arrayBuffer()
            const ct  = res.headers.get('content-type') ?? ''
            const ext = ct.includes('png') ? 'png' : 'jpeg'
            const imgId = wb.addImage({ buffer: buf, extension: ext })
            ws.addImage(imgId, {
              tl: { col: IMG_COLS[i] + 0.05, row: rowIdx - 1 + 0.05 },
              br: { col: IMG_COLS[i] + 1, row: rowIdx - 1 + 0.95 },
            })
          } catch { /* CORS o error de red - se omite la imagen */ }
        }

        rowIdx++
      }
    }

    const buffer = await wb.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = `${fieldName}-Semana${weekNumber}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    setExporting(false)
  }
}

function generateMonthlyDoc(selectedReports: TechnicalReport[], fieldName: string, crewsMap: Map<string, Crew>) {
  // Determine dominant month from the weeks covered by selected reports
  const weekNums = selectedReports.map((r) => r.weekly_log?.week_number).filter(Boolean) as number[]
  const monthMap = new Map<string, { count: number; name: string; year: number }>()
  for (const w of weekNums) {
    const { month, year } = weekToMonthInfo(w)
    const key = `${year}-${month}`
    const ex  = monthMap.get(key)
    if (ex) ex.count++
    else monthMap.set(key, { count: 1, name: MONTH_NAMES[month], year })
  }
  let periodName = 'Mensual'
  let periodYear = NOW.getFullYear()
  let maxCount   = 0
  for (const [, v] of monthMap) {
    if (v.count > maxCount) { maxCount = v.count; periodName = v.name; periodYear = v.year }
  }

  const weeksLabel   = [...new Set(weekNums)].sort((a, b) => a - b).map((w) => `Sem. ${w}`).join(', ')
  const fieldUpper   = fieldName.toUpperCase()

  // Split reports by crew type - use crewsMap for is_soldadura since API may not embed it
  const facilReports = selectedReports.filter((r) => !crewsMap.get(r.crew?.id ?? '')?.is_soldadura)
  const soldReports  = selectedReports.filter((r) => !!crewsMap.get(r.crew?.id ?? '')?.is_soldadura)

  function buildActivities(group: typeof selectedReports): string[] {
    const seen = new Set<string>()
    const list: string[] = []
    for (const r of group) {
      for (const act of r.weekly_log?.activities ?? []) {
        if (!seen.has(act.description)) { seen.add(act.description); list.push(act.description) }
      }
    }
    return list
  }

  function buildSection(sectionTitle: string, crews: string[], acts: string[]): string {
    if (acts.length === 0) return ''
    const items = acts.map((a) => `<p style="margin:0 0 4pt 18pt;text-indent:-18pt;">-&nbsp;&nbsp;&nbsp;${a}</p>`).join('')
    return `
      <h1>${sectionTitle}</h1>
      <p class="sub">${periodName} ${periodYear} &nbsp;&bull;&nbsp; ${weeksLabel} &nbsp;&bull;&nbsp; ${crews.join(' &bull; ')}</p>
      ${items}`
  }

  const facilCrews = [...new Set(facilReports.map((r) => r.crew?.name).filter(Boolean))] as string[]
  const soldCrews  = [...new Set(soldReports.map((r) => r.crew?.name).filter(Boolean))]  as string[]

  const facilSection = buildSection(`CUADRILLA DE FACILIDADES ${fieldUpper}`, facilCrews, buildActivities(facilReports))
  const soldSection  = buildSection(`CUADRILLA DE SOLDADURA ${fieldUpper}`,   soldCrews,  buildActivities(soldReports))

  const docTitle = facilSection
    ? `CUADRILLA DE FACILIDADES ${fieldUpper}`
    : `CUADRILLA DE SOLDADURA ${fieldUpper}`

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>${docTitle}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11pt; margin: 2cm; }
      h1   { font-size: 13pt; font-weight: bold; text-align: center; margin-bottom: 6pt; margin-top: 24pt; }
      .sub { font-size: 10pt; color: #555; text-align: center; margin-bottom: 14pt; }
    </style>
    </head>
    <body>
      ${facilSection}
      ${soldSection}
    </body>
    </html>`

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `Informe_Mensual_${periodName}_${periodYear}.doc`
  a.click()
  URL.revokeObjectURL(url)
}

function LogbookCreateForm({
  crews,
  onCreated,
}: {
  crews:     Crew[]
  onCreated: (log: WeeklyLog) => void
}) {
  const [crewId,     setCrewId]     = useState(crews[0]?.id ?? '')
  const [weekNumber, setWeekNumber] = useState(getWeekNumber(NOW))
  const [year,       setYear]       = useState(NOW.getFullYear())
  const createLog = useCreateLog()

  function handleCreate() {
    if (!crewId) return
    createLog.mutate(
      { crew_id: crewId, week_number: weekNumber, year },
      { onSuccess: (newLog) => onCreated(newLog) },
    )
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-wrap items-end gap-3"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex-1 min-w-36">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-400)' }}>
          Cuadrilla
        </label>
        <select
          value={crewId}
          onChange={(e) => setCrewId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-900)' }}
        >
          <option value="">Seleccionar...</option>
          {crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-400)' }}>
          Semana
        </label>
        <input
          type="number"
          min={1}
          max={53}
          value={weekNumber}
          onChange={(e) => setWeekNumber(Number(e.target.value))}
          className="w-20 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-900)' }}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-400)' }}>
          Año
        </label>
        <input
          type="number"
          min={2020}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--color-surface-1)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-900)' }}
        />
      </div>
      <button
        onClick={handleCreate}
        disabled={!crewId || createLog.isPending}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
        style={{ background: 'var(--color-primary)', color: '#fff', opacity: (!crewId || createLog.isPending) ? 0.6 : 1 }}
      >
        {createLog.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Crear y abrir bitacora
      </button>
    </div>
  )
}

export function SupervisorActivitiesView() {
  const { user }   = useAuthStore()
  const fieldId    = user?.field_id ?? null
  const { data: field } = useField(fieldId)

  const [subTab,          setSubTab]          = useState<SubTab>('cuadrillas')
  const [drillView,       setDrillView]       = useState<DrillView>(null)
  const [crewModal,       setCrewModal]       = useState<{ open: boolean; crew?: Crew | null }>({ open: false })
  const [showLogForm,     setShowLogForm]     = useState(false)
  const [deletingCrewId,  setDeletingCrewId]  = useState<string | null>(null)
  const [selectedCrewId,  setSelectedCrewId]  = useState<string>('')
  const [logWeekFilter,    setLogWeekFilter]    = useState<number | null>(null)
  const [reportWeekFilters, setReportWeekFilters] = useState<number[]>([])
  const [monthlyMode,       setMonthlyMode]       = useState(false)
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set())
  const [weekDropOpen,      setWeekDropOpen]      = useState(false)
  const [logWeekDropOpen,   setLogWeekDropOpen]   = useState(false)
  const [exportingExcel,    setExportingExcel]    = useState(false)
  const weekDropRef    = useRef<HTMLDivElement>(null)
  const logWeekDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (weekDropRef.current && !weekDropRef.current.contains(e.target as Node)) {
        setWeekDropOpen(false)
      }
      if (logWeekDropRef.current && !logWeekDropRef.current.contains(e.target as Node)) {
        setLogWeekDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (reportWeekFilters.length <= 1 && monthlyMode) {
      setMonthlyMode(false)
      setSelectedReportIds(new Set())
    }
  }, [reportWeekFilters, monthlyMode])

  const { data: crewsData, isLoading: loadingCrews } = useCrews({ field_id: fieldId ?? undefined })
  const crews = crewsData?.data ?? []

  const { data: logs = [], isLoading: loadingLogs } = useLogs()
  const { data: reports = [], isLoading: loadingReports } = useTechnicalReports()
  const deleteCrew = useDeleteCrew()

  const fieldCrewIds = useMemo(() => new Set(crews.map((c) => c.id)), [crews])

  const fieldLogs = useMemo(
    () => (logs as WeeklyLogSummary[]).filter((l) => fieldCrewIds.has(l.crew.id)),
    [logs, fieldCrewIds],
  )

  // Distinct week numbers present in logbooks
  const logWeeks = useMemo(() => {
    const s = new Set<number>()
    for (const l of fieldLogs) s.add(l.week_number)
    return [...s].sort((a, b) => b - a)
  }, [fieldLogs])

  const visibleLogs = useMemo(() => {
    let list = selectedCrewId ? fieldLogs.filter((l) => l.crew.id === selectedCrewId) : fieldLogs
    if (logWeekFilter !== null) list = list.filter((l) => l.week_number === logWeekFilter)
    return list
  }, [fieldLogs, selectedCrewId, logWeekFilter])

  const reportedLogbookIds = useMemo(() => {
    const ids = new Set<string>()
    for (const r of reports as TechnicalReport[]) {
      if (r.weekly_log?.id) ids.add(r.weekly_log.id)
    }
    return ids
  }, [reports])

  const fieldReports = useMemo(
    () => (reports as TechnicalReport[]).filter((r) => fieldCrewIds.has(r.crew?.id ?? '')),
    [reports, fieldCrewIds],
  )

  // Distinct weeks in reports
  const reportWeeks = useMemo(() => {
    const s = new Set<number>()
    for (const r of fieldReports) if (r.weekly_log?.week_number) s.add(r.weekly_log.week_number)
    return [...s].sort((a, b) => b - a)
  }, [fieldReports])

  const visibleReports = useMemo(() => {
    if (reportWeekFilters.length === 0) return fieldReports
    return fieldReports.filter((r) => reportWeekFilters.includes(r.weekly_log?.week_number ?? -1))
  }, [fieldReports, reportWeekFilters])

  function toggleReportSelection(id: string) {
    setSelectedReportIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleGenerateMonthly() {
    const selected = visibleReports.filter((r) => selectedReportIds.has(r.id))
    if (selected.length === 0) return
    const crewsMap = new Map(crews.map((c) => [c.id, c]))
    generateMonthlyDoc(selected, field?.name ?? '', crewsMap)
  }

  function handleGenerateGeneralizado() {
    if (visibleReports.length === 0) return
    const sections = visibleReports.map((report) => {
      const acts = report.weekly_log?.activities ?? []
      const forms: ActivityForms = {}
      for (const act of acts) {
        forms[act.id] = {
          requirement:         act.requirement         ?? '',
          additional_resource: act.additional_resource ?? '',
          progress:            act.progress            ?? '',
          is_scheduled:        act.is_scheduled        ?? true,
        }
      }
      return buildPdfBody(
        report.crew?.name ?? '',
        report.weekly_log?.week_number ?? 0,
        report.weekly_log?.year ?? 0,
        field?.name ?? '',
        acts,
        forms,
      )
    })
    const body = sections.join('<div class="page-break"></div>')
    openPrintWindow(body, `Informe Generalizado - Semana ${reportWeekFilters[0]}`, PDF_STYLES)
  }

  function handleDeleteCrew(crew: Crew) {
    setDeletingCrewId(crew.id)
    deleteCrew.mutate(crew.id, { onSettled: () => setDeletingCrewId(null) })
  }

  if (drillView?.type === 'logbook') {
    return (
      <LogbookDetail
        logId={drillView.logId}
        onBack={() => setDrillView(null)}
        onGenerateReport={(logId, crewId) => setDrillView({ type: 'report', logId, crewId })}
      />
    )
  }

  if (drillView?.type === 'report') {
    return (
      <ReportGenerate
        logId={drillView.logId}
        crewId={drillView.crewId}
        fieldName={field?.name}
        onBack={() => setDrillView({ type: 'logbook', logId: drillView.logId, crewId: drillView.crewId })}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div
          className="flex items-center gap-1 rounded-xl p-1 w-fit"
          style={{ background: 'var(--color-surface-2)' }}
        >
          {(['cuadrillas', 'bitacoras', 'informes'] as SubTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={{
                background: subTab === t ? 'var(--color-surface-0)' : 'transparent',
                color:      subTab === t ? 'var(--color-text-900)' : 'var(--color-text-400)',
              }}
            >
              {t === 'cuadrillas' ? 'Cuadrillas' : t === 'bitacoras' ? 'Bitacoras' : 'Informes'}
            </button>
          ))}
        </div>

        {subTab === 'cuadrillas' && (
          <button
            onClick={() => setCrewModal({ open: true, crew: null })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <Plus size={13} /> Nueva cuadrilla
          </button>
        )}
        {subTab === 'bitacoras' && (
          <button
            onClick={() => setShowLogForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              background: showLogForm ? 'var(--color-surface-2)' : 'var(--color-primary)',
              color:      showLogForm ? 'var(--color-text-700)' : '#fff',
              border:     showLogForm ? '1px solid var(--color-border)' : 'none',
            }}
          >
            <Plus size={13} /> Nueva bitacora
          </button>
        )}
        {subTab === 'informes' && !loadingReports && fieldReports.length > 0 && reportWeekFilters.length > 1 && (
          <button
            onClick={() => {
              setMonthlyMode((v) => !v)
              setSelectedReportIds(new Set())
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              background: monthlyMode ? 'var(--color-surface-2)' : 'var(--color-primary)',
              color:      monthlyMode ? 'var(--color-text-700)' : '#fff',
              border:     monthlyMode ? '1px solid var(--color-border)' : 'none',
            }}
          >
            <Download size={13} /> Informe mensual
          </button>
        )}
        {subTab === 'informes' && !loadingReports && fieldReports.length > 0 && reportWeekFilters.length === 1 && (
          <button
            onClick={handleGenerateGeneralizado}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <FileText size={13} /> Informe generalizado
          </button>
        )}
      </div>

      {/* ── CUADRILLAS TAB ── */}
      {subTab === 'cuadrillas' && (
        <div className="flex flex-col gap-3">
          {loadingCrews ? (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : crews.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 rounded-xl"
              style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
            >
              <Users size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin cuadrillas</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
                Crea la primera cuadrilla con el boton "Nueva cuadrilla".
              </p>
            </div>
          ) : (
            crews.map((crew) => (
              <div
                key={crew.id}
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-surface-2)' }}
                >
                  <Users size={16} style={{ color: 'var(--color-text-400)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
                    {crew.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                    {crew.employees.length} empleado{crew.employees.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setCrewModal({ open: true, crew })}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
                  >
                    <Pencil size={12} /> Gestionar
                  </button>
                  <button
                    onClick={() => handleDeleteCrew(crew)}
                    disabled={deletingCrewId === crew.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--color-error, #ef4444)' }}
                  >
                    {deletingCrewId === crew.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── BITACORAS TAB ── */}
      {subTab === 'bitacoras' && (
        <div className="flex flex-col gap-3">
          {showLogForm && crews.length > 0 && (
            <LogbookCreateForm
              crews={crews}
              onCreated={(newLog) => {
                setShowLogForm(false)
                setDrillView({ type: 'logbook', logId: newLog.id, crewId: newLog.crew.id })
              }}
            />
          )}

          {!showLogForm && (
            <div className="flex flex-col gap-2">
              {/* Crew filter */}
              {crews.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  <button
                    onClick={() => setSelectedCrewId('')}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: selectedCrewId === '' ? 'var(--color-surface-0)' : 'transparent',
                      color:      selectedCrewId === '' ? 'var(--color-text-900)' : 'var(--color-text-400)',
                      border:     selectedCrewId === '' ? '1px solid var(--color-border)' : '1px solid transparent',
                    }}
                  >
                    Todas
                  </button>
                  {crews.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCrewId(c.id)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: selectedCrewId === c.id ? 'var(--color-surface-0)' : 'transparent',
                        color:      selectedCrewId === c.id ? 'var(--color-text-900)' : 'var(--color-text-400)',
                        border:     selectedCrewId === c.id ? '1px solid var(--color-border)' : '1px solid transparent',
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Week filter + export */}
              {logWeeks.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs shrink-0" style={{ color: 'var(--color-text-400)' }}>Semana:</span>
                  <div ref={logWeekDropRef} style={{ position: 'relative' }}>
                    <button
                      onClick={() => setLogWeekDropOpen((v) => !v)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        background: 'var(--color-surface-1)',
                        border: '1.5px solid var(--color-border)',
                        color: 'var(--color-text-900)',
                        minWidth: '160px',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span className="truncate">
                        {logWeekFilter === null ? 'Todas las semanas' : `Sem. ${logWeekFilter}`}
                      </span>
                      <ChevronDown size={12} style={{ flexShrink: 0, color: 'var(--color-text-400)' }} />
                    </button>

                    {logWeekDropOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          zIndex: 50,
                          minWidth: '160px',
                          background: 'var(--color-surface-0)',
                          border: '1.5px solid var(--color-border)',
                          borderRadius: '10px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                          padding: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <button
                          onClick={() => { setLogWeekFilter(null); setLogWeekDropOpen(false) }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-all"
                          style={{
                            background: logWeekFilter === null ? 'var(--color-surface-2)' : 'transparent',
                            color: logWeekFilter === null ? 'var(--color-text-900)' : 'var(--color-text-600)',
                            fontWeight: logWeekFilter === null ? 600 : 400,
                          }}
                        >
                          <span
                            style={{
                              width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: logWeekFilter === null ? 'var(--color-primary)' : 'transparent',
                              border: `1.5px solid ${logWeekFilter === null ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            }}
                          >
                            {logWeekFilter === null && <Check size={9} color="#fff" strokeWidth={3} />}
                          </span>
                          Todas
                        </button>
                        {logWeeks.map((w) => {
                          const active = logWeekFilter === w
                          return (
                            <button
                              key={w}
                              onClick={() => { setLogWeekFilter(w); setLogWeekDropOpen(false) }}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-all"
                              style={{
                                background: active ? 'var(--color-surface-2)' : 'transparent',
                                color: active ? 'var(--color-text-900)' : 'var(--color-text-600)',
                                fontWeight: active ? 600 : 400,
                              }}
                            >
                              <span
                                style={{
                                  width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: active ? 'var(--color-primary)' : 'transparent',
                                  border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                }}
                              >
                                {active && <Check size={9} color="#fff" strokeWidth={3} />}
                              </span>
                              Sem. {w}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Export Excel - only when all crews + a week is selected */}
                  {logWeekFilter !== null && selectedCrewId === '' && (
                    <button
                      onClick={() => generateWeekExcel(visibleLogs, field?.name ?? '', logWeekFilter, setExportingExcel)}
                      disabled={exportingExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{
                        background: 'var(--color-primary)',
                        color: '#fff',
                        opacity: exportingExcel ? 0.6 : 1,
                      }}
                    >
                      {exportingExcel
                        ? <Loader2 size={12} className="animate-spin" />
                        : <FileSpreadsheet size={12} />}
                      {exportingExcel ? 'Generando...' : 'Exportar Excel'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {loadingLogs ? (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : visibleLogs.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 rounded-xl"
              style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
            >
              <BookOpen size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin bitacoras</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
                {selectedCrewId ? 'Esta cuadrilla no tiene bitacoras.' : logWeekFilter ? `Sin bitacoras en semana ${logWeekFilter}.` : 'Crea la primera bitacora semanal.'}
              </p>
            </div>
          ) : (
            visibleLogs.map((log) => {
              const locked = reportedLogbookIds.has(log.id)
              return (
                <button
                  key={log.id}
                  onClick={() => setDrillView({ type: 'logbook', logId: log.id, crewId: log.crew.id })}
                  className="flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:opacity-90"
                  style={{
                    background: 'var(--color-surface-0)',
                    border:     `1px solid ${locked ? '#6ee7b7' : 'var(--color-border)'}`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: locked ? '#d1fae5' : 'var(--color-surface-2)' }}
                  >
                    {locked
                      ? <Lock size={15} style={{ color: '#065f46' }} />
                      : <Calendar size={16} style={{ color: 'var(--color-text-400)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
                      {log.crew.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                      Semana {log.week_number} &middot; {log.year}
                    </p>
                  </div>
                  {locked && (
                    <span
                      className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#d1fae5', color: '#065f46' }}
                    >
                      Informe generado
                    </span>
                  )}
                  <ChevronRight size={16} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                </button>
              )
            })
          )}
        </div>
      )}

      {/* ── INFORMES TAB ── */}
      {subTab === 'informes' && (
        <div className="flex flex-col gap-3">
          {loadingReports ? (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : fieldReports.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 rounded-xl"
              style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
            >
              <FileText size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin informes</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
                Abre una bitacora y usa "Generar informe" para crear el primero.
              </p>
            </div>
          ) : (
            <>
              {/* Week filter - custom multi-select dropdown */}
              {reportWeeks.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs shrink-0" style={{ color: 'var(--color-text-400)' }}>Semanas:</span>
                  <div ref={weekDropRef} style={{ position: 'relative' }}>
                    {/* Trigger button */}
                    <button
                      onClick={() => setWeekDropOpen((v) => !v)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        background: 'var(--color-surface-1)',
                        border: '1.5px solid var(--color-border)',
                        color: 'var(--color-text-900)',
                        minWidth: '160px',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span className="truncate">
                        {reportWeekFilters.length === 0
                          ? 'Todas las semanas'
                          : reportWeekFilters.length === 1
                            ? `Sem. ${reportWeekFilters[0]}`
                            : `${reportWeekFilters.length} semanas seleccionadas`}
                      </span>
                      <ChevronDown size={12} style={{ flexShrink: 0, color: 'var(--color-text-400)' }} />
                    </button>

                    {/* Dropdown panel */}
                    {weekDropOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          zIndex: 50,
                          minWidth: '160px',
                          background: 'var(--color-surface-0)',
                          border: '1.5px solid var(--color-border)',
                          borderRadius: '10px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                          padding: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        {reportWeeks.map((w) => {
                          const active = reportWeekFilters.includes(w)
                          return (
                            <button
                              key={w}
                              onClick={() => {
                                const next = active
                                  ? reportWeekFilters.filter((x) => x !== w)
                                  : [...reportWeekFilters, w]
                                setReportWeekFilters(next)
                                setSelectedReportIds(new Set())
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-all"
                              style={{
                                background: active ? 'var(--color-surface-2)' : 'transparent',
                                color: active ? 'var(--color-text-900)' : 'var(--color-text-600)',
                                fontWeight: active ? 600 : 400,
                              }}
                            >
                              <span
                                style={{
                                  width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: active ? 'var(--color-primary)' : 'transparent',
                                  border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                }}
                              >
                                {active && <Check size={9} color="#fff" strokeWidth={3} />}
                              </span>
                              Sem. {w}
                            </button>
                          )
                        })}
                        {reportWeekFilters.length > 0 && (
                          <>
                            <div style={{ height: 1, background: 'var(--color-border)', margin: '2px 4px' }} />
                            <button
                              onClick={() => { setReportWeekFilters([]); setSelectedReportIds(new Set()) }}
                              className="px-3 py-1.5 rounded-lg text-xs text-left"
                              style={{ color: 'var(--color-text-400)' }}
                            >
                              Limpiar seleccion
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Monthly mode banner */}
              {monthlyMode && (
                <div
                  className="rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap"
                  style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-xs" style={{ color: 'var(--color-text-700)' }}>
                      Selecciona los informes a fusionar ({selectedReportIds.size} seleccionado{selectedReportIds.size !== 1 ? 's' : ''})
                    </p>
                    <button
                      onClick={() => {
                        const allSelected = visibleReports.every((r) => selectedReportIds.has(r.id))
                        setSelectedReportIds(allSelected ? new Set() : new Set(visibleReports.map((r) => r.id)))
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                      style={{
                        background: 'var(--color-surface-2)',
                        color: 'var(--color-text-700)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {visibleReports.every((r) => selectedReportIds.has(r.id)) && visibleReports.length > 0
                        ? <><Square size={11} /> Deseleccionar todos</>
                        : <><CheckSquare size={11} /> Seleccionar todos</>}
                    </button>
                  </div>
                  <button
                    onClick={handleGenerateMonthly}
                    disabled={selectedReportIds.size === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
                    style={{
                      background: 'var(--color-primary)',
                      color: '#fff',
                      opacity: selectedReportIds.size === 0 ? 0.4 : 1,
                    }}
                  >
                    <Download size={12} /> Descargar Word
                  </button>
                </div>
              )}

              {/* Report list */}
              {visibleReports.map((report) => {
                const wl       = report.weekly_log
                const acts     = wl?.activities ?? []
                const selected = selectedReportIds.has(report.id)
                return (
                  <button
                    key={report.id}
                    onClick={() =>
                      monthlyMode
                        ? toggleReportSelection(report.id)
                        : setDrillView({ type: 'report', logId: wl.id, crewId: report.crew.id })
                    }
                    className="flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:opacity-90"
                    style={{
                      background: 'var(--color-surface-0)',
                      border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: selected ? 'var(--color-primary)' : 'var(--color-surface-2)' }}
                    >
                      {monthlyMode
                        ? (selected
                            ? <CheckSquare size={16} style={{ color: '#fff' }} />
                            : <Square size={16} style={{ color: 'var(--color-text-400)' }} />)
                        : <FileText size={16} style={{ color: 'var(--color-text-400)' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
                        {report.crew?.name} &middot; {acts.length} actividad{acts.length !== 1 ? 'es' : ''}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                        Sem. {wl?.week_number ?? '-'} / {wl?.year ?? '-'}
                      </p>
                    </div>
                    {!monthlyMode && (
                      <ChevronRight size={16} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>
      )}

      {crewModal.open && fieldId && (
        <CrewModal
          fieldId={fieldId}
          existingCrew={crewModal.crew}
          allCrews={crews}
          onClose={() => setCrewModal({ open: false })}
        />
      )}
    </div>
  )
}

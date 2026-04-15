'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, Users, Building2,
  CheckCircle2, Clock, AlertCircle, BarChart3, ChevronLeft,
  ChevronRight, Loader2, Trophy, AlertTriangle, FileDown,
  Mail, Activity, CalendarCheck,
} from 'lucide-react'
import { useDeliverablesSummary, useDeliverables } from '@/src/hooks/compliance/use-deliverables'
import { useFields } from '@/src/hooks/reports/use-fields'
import { useEmployees } from '@/src/hooks/reports/use-employees'
import { ComplianceDashboard } from '../reports/compliance/coordinator/compliance-dashboard'
import { StatusBadge } from '../reports/compliance/shared/status-badge'

const MONTHS_SHORT  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MONTHS_FULL   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const FORMAT_LABELS: Record<string, string> = {
  taxi: 'Taxi', pernoctacion: 'Pernoctacion', disponibilidad: 'Disponibilidad',
  horas_extra: 'Horas Extra', schedule_6x6: 'Horario 6x6', schedule_5x2: 'Horario 5x2',
}
const PLANT_COLORS = [
  '#ff5f03','#6366f1','#0ea5e9','#16a34a','#ca8a04',
  '#ec4899','#14b8a6','#f97316','#8b5cf6','#64748b',
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function scoreColor(v: number | null) {
  if (v === null) return 'var(--color-text-400)'
  return v >= 90 ? '#16a34a' : v >= 70 ? '#ca8a04' : '#dc2626'
}
function scoreBg(v: number | null) {
  if (v === null) return 'transparent'
  return v >= 90 ? 'rgba(22,163,74,0.12)' : v >= 70 ? 'rgba(202,138,4,0.12)' : 'rgba(220,38,38,0.12)'
}
function linearRegression(pts: number[]) {
  const n = pts.length
  if (n < 2) return { slope: 0, intercept: pts[0] ?? 0 }
  const meanX = (n - 1) / 2
  const meanY = pts.reduce((a, b) => a + b, 0) / n
  const num = pts.reduce((s, y, i) => s + (i - meanX) * (y - meanY), 0)
  const den = pts.reduce((s, _, i) => s + (i - meanX) ** 2, 0)
  const slope = den === 0 ? 0 : num / den
  return { slope, intercept: meanY - slope * meanX }
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-lg text-xs flex flex-col gap-1"
         style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(4,24,24,0.2)' }}>
      <p className="font-semibold mb-0.5" style={{ color: 'var(--color-text-600)' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span style={{ color: 'var(--color-text-400)' }}>{p.name}:</span>
          <span className="font-semibold" style={{ color: 'var(--color-text-900)' }}>
            {typeof p.value === 'number'
              ? (['avg','proyeccion'].includes(p.dataKey) || p.dataKey.startsWith('score'))
                ? `${p.value.toFixed(1)}%` : p.value
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── PDF generator ──────────────────────────────────────────────────────────────
function buildPdfHtml(
  anio: number,
  fields: { id: string; name: string }[],
  employeesInFields: number,
  avgYear: number | null,
  yearTotals: { on_time: number; tarde: number; pendiente: number; no_aplica: number },
  byField: Record<string, { name: string; months: Record<number, any> }>,
) {
  const now  = new Date()
  const sc   = (s: string | number | null) => {
    if (s === null || s === undefined || s === '-') return ''
    const n = Number(s)
    return n >= 90 ? 'good' : n >= 70 ? 'mid' : 'bad'
  }
  const fmt  = (s: string | number | null) => (s !== null && s !== undefined && s !== '-') ? `${Number(s).toFixed(0)}%` : '-'

  const fieldIds  = Object.keys(byField)
  const fieldRows = fieldIds.map((fid) => {
    const f = byField[fid]
    const months = Array.from({ length: 12 }, (_, i) => {
      const row = f.months[i + 1]
      return row?.score !== undefined ? Number(row.score) : null
    })
    const validScores = months.filter((v): v is number => v !== null)
    const avg = validScores.length ? validScores.reduce((a, b) => a + b, 0) / validScores.length : null
    return { name: f.name, months, avg }
  })

  return `<!DOCTYPE html><html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Cumplimiento ${anio}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#111;padding:28px 32px}
h1{font-size:20px;font-weight:700;margin-bottom:2px}
.sub{color:#6b7280;font-size:10px;margin-bottom:22px}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
.kpi{padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px}
.kpi-lbl{font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em}
.kpi-val{font-size:22px;font-weight:700;margin-top:3px}
.section{font-size:13px;font-weight:700;margin:22px 0 10px;padding-bottom:6px;border-bottom:2px solid #111}
table{width:100%;border-collapse:collapse}
th{background:#f9fafb;border:1px solid #e5e7eb;padding:5px 7px;font-size:9px;font-weight:600;text-align:center}
th:first-child{text-align:left}
td{border:1px solid #e5e7eb;padding:5px 7px;font-size:10px;text-align:center}
td:first-child{text-align:left;font-weight:500}
.good{color:#16a34a;font-weight:700}
.mid{color:#ca8a04;font-weight:700}
.bad{color:#dc2626;font-weight:700}
.footer{margin-top:28px;font-size:9px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px}
@media print{body{padding:0}}
</style>
</head>
<body>
<h1>Informe de Cumplimiento ${anio}</h1>
<p class="sub">Generado el ${now.toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})} &nbsp;&middot;&nbsp; ${fields.length} plantas &nbsp;&middot;&nbsp; ${employeesInFields} empleados activos</p>

<div class="kpi-row">
  <div class="kpi"><div class="kpi-lbl">Plantas registradas</div><div class="kpi-val" style="color:#6366f1">${fields.length}</div></div>
  <div class="kpi"><div class="kpi-lbl">Empleados activos</div><div class="kpi-val" style="color:#0ea5e9">${employeesInFields}</div></div>
  <div class="kpi"><div class="kpi-lbl">Promedio anual</div><div class="kpi-val" style="color:${avgYear !== null ? (avgYear >= 90 ? '#16a34a' : avgYear >= 70 ? '#ca8a04' : '#dc2626') : '#6b7280'}">${avgYear !== null ? avgYear.toFixed(1) + '%' : 'N/A'}</div></div>
  <div class="kpi"><div class="kpi-lbl">A tiempo (total año)</div><div class="kpi-val" style="color:#16a34a">${yearTotals.on_time}</div></div>
</div>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-lbl">Entregados tarde</div><div class="kpi-val" style="color:#ca8a04">${yearTotals.tarde}</div></div>
  <div class="kpi"><div class="kpi-lbl">Pendientes</div><div class="kpi-val" style="color:#dc2626">${yearTotals.pendiente}</div></div>
  <div class="kpi"><div class="kpi-lbl">No aplica</div><div class="kpi-val" style="color:#6b7280">${yearTotals.no_aplica}</div></div>
  <div class="kpi"><div class="kpi-lbl">Meses con datos</div><div class="kpi-val" style="color:#111">${fieldRows[0]?.months.filter(v => v !== null).length ?? 0}</div></div>
</div>

<p class="section">Score mensual por planta &mdash; ${anio}</p>
<table>
  <thead>
    <tr>
      <th>Planta</th>
      ${MONTHS_SHORT.map(m => `<th>${m}</th>`).join('')}
      <th>Promedio</th>
    </tr>
  </thead>
  <tbody>
    ${fieldRows.map(r => `
    <tr>
      <td>${r.name}</td>
      ${r.months.map(s => `<td class="${sc(s)}">${fmt(s)}</td>`).join('')}
      <td class="${sc(r.avg)}">${fmt(r.avg)}</td>
    </tr>`).join('')}
  </tbody>
</table>

<p class="section">Totales por mes (todas las plantas)</p>
<table>
  <thead>
    <tr><th>Mes</th>${MONTHS_SHORT.map(m=>`<th>${m}</th>`).join('')}<th>Total</th></tr>
  </thead>
  <tbody>
    ${['on_time','tarde','pendiente'].map(key => {
      const label = key === 'on_time' ? 'A tiempo' : key === 'tarde' ? 'Tarde' : 'Pendiente'
      const vals  = Array.from({length:12},(_,i)=>
        fieldIds.reduce((s,fid)=>s+Number(byField[fid].months[i+1]?.[key]??0),0))
      const total = vals.reduce((a,b)=>a+b,0)
      const cls   = key === 'on_time' ? 'good' : key === 'tarde' ? 'mid' : 'bad'
      return `<tr>
        <td class="${cls}">${label}</td>
        ${vals.map(v=>`<td${v>0?' class="'+cls+'"':''}>${v||'-'}</td>`).join('')}
        <td class="${cls}">${total}</td>
      </tr>`
    }).join('')}
  </tbody>
</table>

${(() => {
    // ── Analysis paragraphs ───────────────────────────────────────────────────
    const validRows = fieldRows.filter(r => r.avg !== null) as { name: string; months: (number|null)[]; avg: number }[]
    const sorted    = [...validRows].sort((a, b) => b.avg - a.avg)
    const best      = sorted[0] ?? null
    const worst     = sorted[sorted.length - 1] ?? null
    const totalDelivs = yearTotals.on_time + yearTotals.tarde + yearTotals.pendiente
    const onTimeRate  = totalDelivs > 0 ? Math.round((yearTotals.on_time / totalDelivs) * 100) : null
    const tardeRate   = totalDelivs > 0 ? Math.round((yearTotals.tarde  / totalDelivs) * 100) : null
    const pendRate    = totalDelivs > 0 ? Math.round((yearTotals.pendiente / totalDelivs) * 100) : null

    // Trend: compare first half avg vs second half avg (by monthly global average)
    const allFieldScores = (m: number) => {
      let sum = 0; let cnt = 0
      for (const r of fieldRows) {
        const s = r.months[m - 1]
        if (s !== null) { sum += s; cnt++ }
      }
      return cnt > 0 ? sum / cnt : null
    }
    const firstHalf  = [1,2,3,4,5,6].map(allFieldScores).filter((v): v is number => v !== null)
    const secondHalf = [7,8,9,10,11,12].map(allFieldScores).filter((v): v is number => v !== null)
    const avgH1 = firstHalf.length  ? firstHalf.reduce((a,b)=>a+b,0)/firstHalf.length   : null
    const avgH2 = secondHalf.length ? secondHalf.reduce((a,b)=>a+b,0)/secondHalf.length : null
    const trendText = (avgH1 !== null && avgH2 !== null)
      ? avgH2 > avgH1 + 3
        ? `una tendencia de mejora en el segundo semestre (promedio ${avgH2.toFixed(1)}%) frente al primero (${avgH1.toFixed(1)}%)`
        : avgH2 < avgH1 - 3
          ? `una tendencia de deterioro en el segundo semestre (promedio ${avgH2.toFixed(1)}%) frente al primero (${avgH1.toFixed(1)}%)`
          : `estabilidad a lo largo del año (primer semestre ${avgH1.toFixed(1)}%, segundo semestre ${avgH2.toFixed(1)}%)`
      : null

    // Months at risk
    const monthsAtRisk = Array.from({length:12},(_,i)=>i+1)
      .filter(m => { const s = allFieldScores(m); return s !== null && s < 70 })
      .map(m => MONTHS_FULL[m-1])

    // Plants needing attention
    const atRisk  = validRows.filter(r => r.avg < 70)
    const needing = validRows.filter(r => r.avg >= 70 && r.avg < 85)

    const paras: string[] = []

    // P1: general overview
    if (avgYear !== null) {
      const level = avgYear >= 90 ? 'excelente' : avgYear >= 75 ? 'aceptable' : avgYear >= 60 ? 'por mejorar' : 'crítico'
      paras.push(`Durante el año ${anio}, el sistema de cumplimiento registró un promedio general de <strong>${avgYear.toFixed(1)}%</strong>, nivel considerado <strong>${level}</strong> según los umbrales establecidos (>=90% óptimo, >=70% aceptable). Este indicador consolida el desempeño de ${fields.length} plantas y ${employeesInFields} empleados activos.`)
    }

    // P2: on-time/late/pending analysis
    if (onTimeRate !== null) {
      const tardeNote = tardeRate !== null && tardeRate > 0 ? ` El ${tardeRate}% de los entregables fue entregado con retraso, lo cual representa un riesgo operativo que debe ser atendido.` : ''
      const pendNote  = pendRate  !== null && pendRate  > 0 ? ` Adicionalmente, el ${pendRate}% permaneció sin entregarse, lo que requiere seguimiento inmediato.` : ' No se registraron entregables pendientes al cierre del periodo.'
      paras.push(`Del total de entregables registrados (${totalDelivs}), el <strong>${onTimeRate}%</strong> fue entregado a tiempo.${tardeNote}${pendNote}`)
    }

    // P3: best / worst
    if (best && worst && best.name !== worst.name) {
      paras.push(`La planta con mejor desempeño fue <strong>${best.name}</strong> con un promedio anual de <strong>${best.avg.toFixed(1)}%</strong>. Por el contrario, <strong>${worst.name}</strong> obtuvo el promedio más bajo con <strong>${worst.avg.toFixed(1)}%</strong>${worst.avg < 70 ? ', situándose en zona crítica y requiriendo atención prioritaria' : ''}.`)
    } else if (best) {
      paras.push(`La planta con mayor desempeño durante ${anio} fue <strong>${best.name}</strong> con un promedio de <strong>${best.avg.toFixed(1)}%</strong>.`)
    }

    // P4: trend
    if (trendText) {
      paras.push(`El análisis semestral muestra <strong>${trendText}</strong>. ${avgH2 !== null && avgH1 !== null && avgH2 < avgH1 ? 'Se recomienda reforzar el acompañamiento durante el segundo semestre para revertir este comportamiento.' : 'Este comportamiento refleja un proceso de mejora continua que debe sostenerse.'}`)
    }

    // P5: at-risk plants
    if (atRisk.length > 0) {
      paras.push(`<strong style="color:#dc2626">Plantas en zona crítica (promedio &lt; 70%):</strong> ${atRisk.map(r=>`${r.name} (${r.avg.toFixed(1)}%)`).join(', ')}. Estas plantas requieren un plan de acción correctiva inmediato, revisión de procesos y mayor frecuencia de supervisión.`)
    }
    if (needing.length > 0) {
      paras.push(`<strong style="color:#ca8a04">Plantas en zona de atención (70-85%):</strong> ${needing.map(r=>`${r.name} (${r.avg.toFixed(1)}%)`).join(', ')}. Aunque se encuentran dentro del rango aceptable, existe margen de mejora significativo.`)
    }
    if (monthsAtRisk.length > 0) {
      paras.push(`Los meses con promedio global inferior al 70% fueron: <strong>${monthsAtRisk.join(', ')}</strong>. Se recomienda analizar los factores que incidieron en esos periodos para evitar su recurrencia.`)
    }

    // P6: recommendations
    const recs: string[] = []
    if (yearTotals.pendiente > 0) recs.push(`gestionar el cierre de los ${yearTotals.pendiente} entregables aún pendientes`)
    if (yearTotals.tarde > 0)     recs.push(`implementar alertas tempranas para reducir las ${yearTotals.tarde} entregas tardías`)
    if (atRisk.length > 0)        recs.push(`priorizar las plantas en zona crítica con planes de mejora documentados`)
    if (recs.length === 0)        recs.push(`mantener el nivel de cumplimiento alcanzado y establecer metas de mejora para el próximo periodo`)
    paras.push(`<strong>Recomendaciones:</strong> Se sugiere ${recs.join('; ')}.`)

    if (paras.length === 0) return ''
    return `
<p class="section">Análisis y Conclusiones</p>
<div style="display:flex;flex-direction:column;gap:10px">
  ${paras.map(p => `<p style="font-size:10.5px;line-height:1.65;color:#111">${p}</p>`).join('')}
</div>`
  })()}

<p class="footer">Este informe fue generado automáticamente desde el sistema de gestión. Los datos corresponden al año ${anio}.</p>
</body></html>`
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ReportsDashboardPanel() {
  const now          = new Date()
  const [anio, setAnio] = useState(now.getFullYear())
  const nowMonth     = now.getMonth() + 1
  const nowYear      = now.getFullYear()

  const { data: summary,           isLoading: loadSummary  } = useDeliverablesSummary({ anio })
  const { data: fieldsPage,        isLoading: loadFields   } = useFields(1, 100)
  const { data: empPage                                     } = useEmployees({ limit: 1000 })
  // Current real month deliverables (always today's month, independent of year selector)
  const { data: currentDelivs,     isLoading: loadCurrent  } = useDeliverables({ mes: nowMonth, anio: nowYear })

  const fields    = fieldsPage?.data ?? []
  const employees = empPage?.data    ?? []
  const rows      = summary          ?? []

  // ── Derived data ────────────────────────────────────────────────────────────
  const byField = useMemo(() => {
    const map: Record<string, { name: string; months: Record<number, typeof rows[0]> }> = {}
    for (const r of rows) {
      if (!map[r.field_id]) map[r.field_id] = { name: r.field_name, months: {} }
      map[r.field_id].months[Number(r.mes)] = r
    }
    return map
  }, [rows])

  const fieldIds = Object.keys(byField)

  // Year totals across all plants all months
  const yearTotals = useMemo(() => ({
    on_time:   rows.reduce((s, r) => s + Number(r.on_time), 0),
    tarde:     rows.reduce((s, r) => s + Number(r.tarde), 0),
    pendiente: rows.reduce((s, r) => s + Number(r.pendiente), 0),
    no_aplica: rows.reduce((s, r) => s + Number(r.no_aplica), 0),
  }), [rows])

  // Average score for whole year
  const allScores = rows.map(r => r.score !== null ? Number(r.score) : null).filter((v): v is number => v !== null)
  const avgYear   = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null

  // Monthly averages (for trend line)
  const monthlyAvg = useMemo(() => MONTHS_SHORT.map((label, i) => {
    const mes    = i + 1
    const scores = fieldIds.map(fid => byField[fid].months[mes]?.score)
      .filter((s): s is string => s !== null && s !== undefined).map(Number).filter(n => !isNaN(n))
    return {
      label, mes,
      avg:       scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      on_time:   fieldIds.reduce((s, fid) => s + Number(byField[fid].months[mes]?.on_time  ?? 0), 0),
      tarde:     fieldIds.reduce((s, fid) => s + Number(byField[fid].months[mes]?.tarde    ?? 0), 0),
      pendiente: fieldIds.reduce((s, fid) => s + Number(byField[fid].months[mes]?.pendiente?? 0), 0),
      hasData:   scores.length > 0,
    }
  }), [byField, fieldIds])

  // Regression projection
  const trendData = useMemo(() => {
    const withData = monthlyAvg.filter(m => m.hasData && m.avg !== null)
    if (withData.length < 2) return monthlyAvg
    const { slope, intercept } = linearRegression(withData.map(m => m.avg as number))
    const startIdx = monthlyAvg.findIndex(m => m.label === withData[0].label)
    let projShown = false
    return monthlyAvg.map((m, i) => {
      const relIdx = i - startIdx
      let proyeccion: number | undefined = undefined
      if (!m.hasData && !projShown && relIdx >= 0) {
        proyeccion = Math.max(0, Math.min(100, intercept + slope * withData.length))
        projShown = true
      }
      return { ...m, proyeccion }
    })
  }, [monthlyAvg])

  // Per-plant score (latest available month)
  const plantScores = useMemo(() => fieldIds.map(fid => {
    const f = byField[fid]
    let latestMes = anio === nowYear ? nowMonth : 12
    while (latestMes > 0 && !f.months[latestMes]) latestMes--
    const row = latestMes > 0 ? f.months[latestMes] : null
    return {
      name:     f.name.length > 14 ? f.name.slice(0, 12) + '…' : f.name,
      fullName: f.name,
      score:    row?.score !== undefined ? Number(row.score) : null,
    }
  }).filter(p => p.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)), [byField, fieldIds, anio, nowYear, nowMonth])

  // Current selected-month KPIs
  const displayMes   = anio === nowYear ? nowMonth : 12
  const currentMesData = useMemo(() => ({
    on_time:   fieldIds.reduce((s, fid) => s + Number(byField[fid].months[displayMes]?.on_time  ?? 0), 0),
    tarde:     fieldIds.reduce((s, fid) => s + Number(byField[fid].months[displayMes]?.tarde    ?? 0), 0),
    pendiente: fieldIds.reduce((s, fid) => s + Number(byField[fid].months[displayMes]?.pendiente?? 0), 0),
    no_aplica: fieldIds.reduce((s, fid) => s + Number(byField[fid].months[displayMes]?.no_aplica?? 0), 0),
    scores:    fieldIds.map(fid => byField[fid].months[displayMes]?.score)
                 .filter((s): s is string => s !== null && s !== undefined)
                 .map(Number).filter(n => !isNaN(n)),
  }), [byField, fieldIds, displayMes])

  const avgThisMes = currentMesData.scores.length
    ? currentMesData.scores.reduce((a, b) => a + b, 0) / currentMesData.scores.length : null

  // Previous month delta for trend icon
  const withDataMonths = monthlyAvg.filter(m => m.hasData && m.avg !== null)
  const trendDir = withDataMonths.length >= 2
    ? (withDataMonths.at(-1)!.avg ?? 0) - (withDataMonths.at(-2)!.avg ?? 0) : 0

  const withSupervisor    = fields.filter(f => f.supervisor).length
  const employeesInFields = employees.length
  const activeMonths      = monthlyAvg.filter(m => m.hasData)

  // Current month real deliverables for activity feed
  const recentActivity = useMemo(() => {
    if (!currentDelivs) return { submitted: [], pending: [] }
    const submitted = [...currentDelivs]
      .filter(d => d.submitted_at)
      .sort((a, b) => new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime())
      .slice(0, 8)
    const pending = [...currentDelivs]
      .filter(d => d.status === 'pendiente')
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      })
      .slice(0, 8)
    return { submitted, pending }
  }, [currentDelivs])

  // ── PDF export ──────────────────────────────────────────────────────────────
  const handlePdf = useCallback(() => {
    const html = buildPdfHtml(anio, fields, employeesInFields, avgYear, yearTotals, byField)
    const win  = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }, [anio, fields, employeesInFields, avgYear, yearTotals, byField])

  // ── Email share ─────────────────────────────────────────────────────────────
  const handleEmail = useCallback(() => {
    const subject = `Informe Cumplimiento ${anio}`
    const lines = [
      `Informe de Cumplimiento - ${anio}`,
      `Plantas: ${fields.length}  |  Empleados activos: ${employeesInFields}`,
      `Promedio anual: ${avgYear !== null ? avgYear.toFixed(1) + '%' : 'N/A'}`,
      `A tiempo: ${yearTotals.on_time}  |  Tarde: ${yearTotals.tarde}  |  Pendiente: ${yearTotals.pendiente}`,
      '',
      'Score por planta:',
      ...fieldIds.map(fid => {
        const f  = byField[fid]
        const ms = Object.entries(f.months)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([m, r]) => `${MONTHS_SHORT[Number(m)-1]}: ${r?.score !== null ? Number(r.score).toFixed(0)+'%' : '-'}`)
          .join(', ')
        return `  ${f.name}: ${ms}`
      }),
    ]
    const body = encodeURIComponent(lines.join('\n'))
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${body}`)
  }, [anio, fields, employees, avgYear, yearTotals, byField, fieldIds, employeesInFields])

  const tickStyle = { fontSize: 11, fill: 'var(--color-text-400)' }
  const isLoading = loadSummary || loadFields

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-text-900)' }}>
            Reportes &amp; Cumplimiento
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
            Panel de indicadores por planta
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year nav */}
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--color-surface-2)' }}>
            <button onClick={() => setAnio(y => y - 1)} className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-600)' }}><ChevronLeft size={14} /></button>
            <span className="px-4 py-1 rounded-md text-xs font-semibold w-16 text-center" style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}>{anio}</span>
            <button onClick={() => setAnio(y => y + 1)} className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-600)' }}><ChevronRight size={14} /></button>
          </div>
          {/* PDF */}
          <button
            onClick={handlePdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
          >
            <FileDown size={13} /> Exportar PDF
          </button>
          {/* Email */}
          <button
            onClick={handleEmail}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
          >
            <Mail size={13} /> Enviar informe
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-secondary)' }} /></div>
      ) : (
        <>
          {/* ── KPI row 1: plantas/empleados/promedio mes ─────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
            <KpiCard icon={<Building2 size={15} />} label="Plantas" value={String(fields.length)}
              sub={`${withSupervisor} con supervisor`} iconColor="#6366f1" iconBg="rgba(99,102,241,0.12)" />
            <KpiCard icon={<Users size={15} />} label="Empleados activos" value={String(employeesInFields)}
              sub="asignados a plantas" iconColor="#0ea5e9" iconBg="rgba(14,165,233,0.12)" />
            <KpiCard
              icon={trendDir > 0 ? <TrendingUp size={15}/> : trendDir < 0 ? <TrendingDown size={15}/> : <Minus size={15}/>}
              label={`Promedio ${MONTHS_FULL[displayMes - 1]}`}
              value={avgThisMes !== null ? `${avgThisMes.toFixed(1)}%` : 'N/A'}
              sub={trendDir !== 0 ? `${trendDir > 0 ? '+' : ''}${trendDir.toFixed(1)}% vs mes ant.` : 'sin variacion'}
              iconColor={trendDir > 0 ? '#16a34a' : trendDir < 0 ? '#dc2626' : 'var(--color-text-400)'}
              iconBg={trendDir > 0 ? 'rgba(22,163,74,0.12)' : trendDir < 0 ? 'rgba(220,38,38,0.12)' : 'var(--color-surface-2)'}
              valueColor={scoreColor(avgThisMes)}
            />
            <KpiCard icon={<CalendarCheck size={15} />} label="Promedio anual" value={avgYear !== null ? `${avgYear.toFixed(1)}%` : 'N/A'}
              sub={`${activeMonths.length} mes${activeMonths.length !== 1 ? 'es' : ''} con datos`}
              iconColor={scoreColor(avgYear)} iconBg={scoreBg(avgYear)} valueColor={scoreColor(avgYear)} />
          </div>

          {/* ── KPI row 2: year totals ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={<CheckCircle2 size={15} />} label="A tiempo (año)" value={String(yearTotals.on_time)}
              sub={`en ${anio}`} iconColor="#16a34a" iconBg="rgba(22,163,74,0.12)" />
            <KpiCard icon={<Clock size={15} />} label="Tarde (año)" value={String(yearTotals.tarde)}
              sub="entregados con retraso" iconColor={yearTotals.tarde > 0 ? '#ca8a04' : '#16a34a'} iconBg={yearTotals.tarde > 0 ? 'rgba(202,138,4,0.12)' : 'rgba(22,163,74,0.12)'} />
            <KpiCard icon={<AlertCircle size={15} />} label="Pendientes (año)" value={String(yearTotals.pendiente)}
              sub="sin entregar" iconColor={yearTotals.pendiente > 0 ? '#dc2626' : '#16a34a'} iconBg={yearTotals.pendiente > 0 ? 'rgba(220,38,38,0.12)' : 'rgba(22,163,74,0.12)'} />
            <KpiCard icon={<Minus size={15} />} label="No aplica (año)" value={String(yearTotals.no_aplica)}
              sub="justificados" iconColor="var(--color-text-400)" iconBg="var(--color-surface-2)" />
          </div>

          {/* ── No data ──────────────────────────────────────────────────────── */}
          {activeMonths.length === 0 && (
            <div className="flex flex-col items-center py-14 rounded-xl" style={{ background: 'var(--color-surface-1)', border: '1px dashed var(--color-border)' }}>
              <BarChart3 size={24} className="mb-2" style={{ color: 'var(--color-text-400)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>Sin datos de cumplimiento para {anio}</p>
            </div>
          )}

          {activeMonths.length > 0 && (
            <>
              {/* ── Charts row 1 ─────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Trend line */}
                <ChartCard title="Tendencia de cumplimiento" subtitle={`Promedio mensual ${anio} · con proyeccion lineal`}>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
                      <YAxis domain={[0,100]} tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                      <Tooltip content={<ChartTip />} />
                      <ReferenceLine y={90} stroke="rgba(22,163,74,0.25)" strokeDasharray="4 4" />
                      <ReferenceLine y={70} stroke="rgba(202,138,4,0.25)" strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="avg" name="Promedio" stroke="var(--color-secondary)" strokeWidth={2.5}
                        dot={(p: any) => {
                          if (!p.payload.hasData || p.payload.avg === null) return <g key={`d-${p.cx}`}/>
                          return <circle key={`d-${p.cx}`} cx={p.cx} cy={p.cy} r={4} fill="var(--color-secondary)" stroke="var(--color-surface-0)" strokeWidth={2}/>
                        }}
                        connectNulls={false}
                      />
                      <Line type="monotone" dataKey="proyeccion" name="Proyeccion" stroke="rgba(255,95,3,0.4)" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-2 px-1">
                    <LDot color="var(--color-secondary)" label="Promedio real" />
                    <LDot color="rgba(255,95,3,0.5)" label="Proyeccion" dashed />
                    <div className="ml-auto flex items-center gap-3">
                      <LLine color="rgba(22,163,74,0.4)" label="90%" />
                      <LLine color="rgba(202,138,4,0.4)" label="70%" />
                    </div>
                  </div>
                </ChartCard>

                {/* Score por planta */}
                <ChartCard title="Score por planta" subtitle="Mes mas reciente con datos">
                  {plantScores.length === 0 ? (
                    <div className="flex items-center justify-center h-40"><p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin datos</p></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={plantScores} margin={{ top: 8, right: 16, bottom: 0, left: -20 }} barCategoryGap="30%">
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} />
                        <YAxis domain={[0,100]} tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                        <Tooltip content={<ChartTip />} />
                        <ReferenceLine y={90} stroke="rgba(22,163,74,0.3)" strokeDasharray="4 4" />
                        <ReferenceLine y={70} stroke="rgba(202,138,4,0.3)" strokeDasharray="4 4" />
                        <Bar dataKey="score" name="Score" radius={[4,4,0,0]}>
                          {plantScores.map((p, i) => <Cell key={i} fill={scoreColor(p.score)} fillOpacity={0.85} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>

              {/* ── Charts row 2 ─────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ChartCard title="Distribucion de estados" subtitle="Entregables por mes en todas las plantas">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={activeMonths} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                        <defs>
                          {[['gOT','#16a34a'],['gTD','#ca8a04'],['gPN','#dc2626']].map(([id,c]) => (
                            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={c} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={c} stopOpacity={0.02} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
                        <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTip />} />
                        <Area type="monotone" dataKey="on_time"   name="A tiempo"  stroke="#16a34a" fill="url(#gOT)" strokeWidth={2} />
                        <Area type="monotone" dataKey="tarde"     name="Tarde"     stroke="#ca8a04" fill="url(#gTD)" strokeWidth={2} />
                        <Area type="monotone" dataKey="pendiente" name="Pendiente" stroke="#dc2626" fill="url(#gPN)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-2 px-1">
                      <LDot color="#16a34a" label="A tiempo" />
                      <LDot color="#ca8a04" label="Tarde" />
                      <LDot color="#dc2626" label="Pendiente" />
                    </div>
                  </ChartCard>
                </div>

                {/* Insights column */}
                <div className="flex flex-col gap-3">
                  {plantScores[0] && (
                    <InsightCard icon={<Trophy size={13}/>} color="#16a34a" title="Mejor planta" name={plantScores[0].fullName} score={plantScores[0].score} />
                  )}
                  {plantScores.length > 1 && plantScores.at(-1) && (
                    <InsightCard icon={<AlertTriangle size={13}/>} color={scoreColor(plantScores.at(-1)!.score)} title="Menor score" name={plantScores.at(-1)!.fullName} score={plantScores.at(-1)!.score} />
                  )}
                  {(() => {
                    const sinDatos = fields.filter(f => !byField[f.id]?.months[displayMes]).length
                    if (!sinDatos) return null
                    return (
                      <div className="p-3 rounded-xl flex flex-col gap-1" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <div className="flex items-center gap-1.5">
                          <AlertCircle size={13} style={{ color: '#6366f1' }} />
                          <span className="text-xs font-semibold" style={{ color: '#6366f1' }}>Sin registro este mes</span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-text-600)' }}>{sinDatos} planta{sinDatos > 1 ? 's' : ''} sin datos</p>
                      </div>
                    )
                  })()}
                  {trendDir !== 0 && (
                    <div className="p-3 rounded-xl flex flex-col gap-1"
                         style={{ background: trendDir > 0 ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)', border: `1px solid ${trendDir > 0 ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}` }}>
                      <div className="flex items-center gap-1.5">
                        {trendDir > 0 ? <TrendingUp size={13} style={{ color: '#16a34a' }} /> : <TrendingDown size={13} style={{ color: '#dc2626' }} />}
                        <span className="text-xs font-semibold" style={{ color: trendDir > 0 ? '#16a34a' : '#dc2626' }}>
                          {trendDir > 0 ? 'Mejora sostenida' : 'Tendencia a la baja'}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--color-text-600)' }}>
                        {Math.abs(trendDir).toFixed(1)} pts respecto al mes anterior
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Multi-line per plant ──────────────────────────────────────── */}
              {fieldIds.length > 1 && (
                <ChartCard title="Evolucion por planta" subtitle={`Score mensual individual · ${anio}`}>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart
                      data={MONTHS_SHORT.map((label, i) => {
                        const mes = i + 1
                        const row: Record<string,any> = { label }
                        fieldIds.forEach(fid => {
                          const s = byField[fid].months[mes]?.score
                          row[fid] = s !== undefined ? Number(s) : null
                        })
                        return row
                      })}
                      margin={{ top: 8, right: 16, bottom: 0, left: -20 }}
                    >
                      <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
                      <YAxis domain={[0,100]} tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                      <Tooltip content={<ChartTip />} />
                      <ReferenceLine y={90} stroke="rgba(22,163,74,0.2)" strokeDasharray="4 4" />
                      <ReferenceLine y={70} stroke="rgba(202,138,4,0.2)" strokeDasharray="4 4" />
                      {fieldIds.map((fid, i) => (
                        <Line key={fid} type="monotone" dataKey={fid} name={byField[fid].name}
                          stroke={PLANT_COLORS[i % PLANT_COLORS.length]} strokeWidth={2} dot={false} connectNulls={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 px-1">
                    {fieldIds.map((fid, i) => <LDot key={fid} color={PLANT_COLORS[i % PLANT_COLORS.length]} label={byField[fid].name} />)}
                  </div>
                </ChartCard>
              )}

              {/* ── Actividad reciente ────────────────────────────────────────── */}
              {!loadCurrent && (recentActivity.submitted.length > 0 || recentActivity.pending.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Recently submitted */}
                  {recentActivity.submitted.length > 0 && (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                        <Activity size={14} style={{ color: '#16a34a' }} />
                        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>
                          Entregados recientemente &mdash; {MONTHS_FULL[nowMonth - 1]}
                        </p>
                      </div>
                      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {recentActivity.submitted.map(d => (
                          <div key={d.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                                {d.field.name}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                                {FORMAT_LABELS[d.format_type] ?? d.format_type} &middot; {d.submitted_at ? new Date(d.submitted_at).toLocaleDateString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '-'}
                              </p>
                            </div>
                            <StatusBadge status={d.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending this month */}
                  {recentActivity.pending.length > 0 && (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                        <AlertCircle size={14} style={{ color: '#dc2626' }} />
                        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>
                          Pendientes sin entregar &mdash; {MONTHS_FULL[nowMonth - 1]}
                        </p>
                      </div>
                      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {recentActivity.pending.map(d => {
                          const overdue = d.due_date && new Date(d.due_date + 'T23:59:59') < new Date()
                          return (
                            <div key={d.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                                  {d.field.name}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                                  {FORMAT_LABELS[d.format_type] ?? d.format_type}
                                  {d.due_date && (
                                    <> &middot; <span style={{ color: overdue ? '#dc2626' : 'var(--color-text-400)' }}>
                                      {overdue ? 'Vencido' : `Vence ${new Date(d.due_date+'T00:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short'})}`}
                                    </span></>
                                  )}
                                </p>
                              </div>
                              <span className="text-xs font-semibold shrink-0" style={{ color: overdue ? '#dc2626' : '#d97706' }}>
                                {overdue ? 'Vencido' : 'Pendiente'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Compliance matrix ─────────────────────────────────────────── */}
              <div className="rounded-xl p-5" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                <ComplianceDashboard />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, iconColor, iconBg, valueColor }: {
  icon: React.ReactNode; label: string; value: string; sub: string
  iconColor: string; iconBg: string; valueColor?: string
}) {
  return (
    <div className="p-4 rounded-xl flex flex-col gap-2" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <div>
        <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{label}</p>
        <p className="text-xl font-bold mt-0.5" style={{ color: valueColor ?? 'var(--color-text-900)' }}>{value}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{sub}</p>
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl flex flex-col gap-3" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
      <div>
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function InsightCard({ icon, color, title, name, score }: {
  icon: React.ReactNode; color: string; title: string; name: string; score: number | null
}) {
  return (
    <div className="p-3 rounded-xl flex flex-col gap-1.5"
         style={{ background: `${color}10`, border: `1px solid ${color}33` }}>
      <div className="flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs font-semibold" style={{ color }}>{title}</span>
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>{name}</p>
      <span className="self-start px-2 py-0.5 rounded-md text-sm font-bold"
            style={{ background: scoreBg(score), color: scoreColor(score) }}>
        {score?.toFixed(0)}%
      </span>
    </div>
  )
}

function LDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {dashed ? <div className="w-5 border-t-2 border-dashed" style={{ borderColor: color }} /> : <div className="w-2 h-2 rounded-full" style={{ background: color }} />}
      <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{label}</span>
    </div>
  )
}

function LLine({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5" style={{ height: 2, background: color }} />
      <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{label}</span>
    </div>
  )
}

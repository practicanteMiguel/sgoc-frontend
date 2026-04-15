'use client'

import { useState, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell,
} from 'recharts'
import {
  MapPin, TrendingUp, TrendingDown, Minus, Users,
  CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight,
  Loader2, PackageOpen, FolderArchive, CalendarCheck,
  Activity, ExternalLink,
} from 'lucide-react'
import { useDeliverables, useDeliverablesSummary } from '@/src/hooks/compliance/use-deliverables'
import { useEvidences } from '@/src/hooks/compliance/use-evidences'
import { useEmployees } from '@/src/hooks/reports/use-employees'
import { useField } from '@/src/hooks/reports/use-fields'
import { useAuthStore } from '@/src/stores/auth.store'
import { StatusBadge } from '../reports/compliance/shared/status-badge'
import { ScoreCell } from '../reports/compliance/shared/score-cell'
import type { EvidenceCategory } from '@/src/types/compliance.types'

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MONTHS_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const FORMAT_LABELS: Record<string, string> = {
  taxi: 'Taxi', pernoctacion: 'Pernoctacion', disponibilidad: 'Disponibilidad',
  horas_extra: 'Horas Extra', schedule_6x6: 'Horario 6x6', schedule_5x2: 'Horario 5x2',
}
const CAT_LABELS: Record<EvidenceCategory, string> = {
  ausentismo: 'Ausentismo', ley_50: 'Ley 50', dia_familia: 'Dia de la Familia',
  horas_extra: 'Horas Extra', cronograma: 'Cronograma', general: 'General',
}

function scoreColor(v: number | null) {
  if (v === null) return 'var(--color-text-400)'
  return v >= 90 ? '#16a34a' : v >= 70 ? '#ca8a04' : '#dc2626'
}
function scoreBg(v: number | null) {
  if (v === null) return 'transparent'
  return v >= 90 ? 'rgba(22,163,74,0.12)' : v >= 70 ? 'rgba(202,138,4,0.12)' : 'rgba(220,38,38,0.12)'
}

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
            {typeof p.value === 'number' && p.dataKey === 'score' ? `${p.value.toFixed(1)}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────────
export function SupervisorDashboardPanel() {
  const { user }     = useAuthStore()
  const fieldId      = user?.field_id ?? null

  const now          = new Date()
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())

  const { data: field,       isLoading: loadField   } = useField(fieldId)
  const { data: deliverables,isLoading: loadDelivs  } = useDeliverables({ field_id: fieldId ?? undefined, mes, anio })
  const { data: summary,     isLoading: loadSummary } = useDeliverablesSummary({ field_id: fieldId ?? undefined, anio })
  const { data: evidences,   isLoading: loadEvidences} = useEvidences({ field_id: fieldId ?? undefined, anio })
  const { data: empPage                              } = useEmployees({ limit: 1000 })

  function prevMonth() { if (mes === 1) { setMes(12); setAnio(y => y - 1) } else setMes(m => m - 1) }
  function nextMonth() { if (mes === 12) { setMes(1); setAnio(y => y + 1) } else setMes(m => m + 1) }

  // ── Computed ─────────────────────────────────────────────────────────────────
  const employees       = (empPage?.data ?? []).filter(e => (e.field_id ?? e.field?.id) === fieldId)
  const activeEmployees = employees.filter(e => e.is_active)
  const evidList    = evidences ?? []
  const delivsList  = deliverables ?? []

  // Current month counts
  const on_time   = delivsList.filter(d => d.status === 'entregado').length
  const tarde     = delivsList.filter(d => d.status === 'entregado_tarde').length
  const pendiente = delivsList.filter(d => d.status === 'pendiente').length
  const no_aplica = delivsList.filter(d => d.status === 'no_aplica').length
  const aplicables= delivsList.filter(d => d.status !== 'no_aplica').length

  // Score from summary row for this month
  const summaryRows = summary ?? []
  const thisMonthRow = summaryRows.find(r => Number(r.mes) === mes && Number(r.anio) === anio)
  const prevMes    = mes === 1 ? 12 : mes - 1
  const prevAnio   = mes === 1 ? anio - 1 : anio
  const prevRow    = summaryRows.find(r => Number(r.mes) === prevMes && Number(r.anio) === prevAnio)

  const scoreNow  = thisMonthRow?.score !== undefined ? Number(thisMonthRow.score) : null
  const scorePrev = prevRow?.score !== undefined ? Number(prevRow.score) : null
  const delta     = scoreNow !== null && scorePrev !== null ? scoreNow - scorePrev : null

  // Year trend data
  const trendData = useMemo(() => MONTHS_SHORT.map((label, i) => {
    const row = summaryRows.find(r => Number(r.mes) === i + 1 && Number(r.anio) === anio)
    return {
      label,
      score:     row?.score !== undefined ? Number(row.score) : null,
      on_time:   row ? Number(row.on_time)   : null,
      tarde:     row ? Number(row.tarde)     : null,
      pendiente: row ? Number(row.pendiente) : null,
      hasData:   !!row,
    }
  }), [summaryRows, anio])

  // Evidence summary by category
  const evidByCat = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of evidList) {
      const k = e.category ?? 'general'
      map[k] = (map[k] ?? 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [evidList])

  // Evidence by year (just count per year)
  const evidThisYear = evidList.filter(e => e.anio === anio).length
  const evidTotal    = evidList.length

  // Recent submissions
  const recentDelivs = [...delivsList]
    .filter(d => d.submitted_at)
    .sort((a, b) => new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime())
    .slice(0, 5)

  // Pending with countdown
  const pendingDelivs = delivsList.filter(d => d.status === 'pendiente')

  const tickStyle = { fontSize: 11, fill: 'var(--color-text-400)' }
  const isLoading = loadField || loadDelivs || loadSummary

  // ── No plant assigned ────────────────────────────────────────────────────────
  if (!fieldId) {
    return (
      <div className="flex flex-col items-center py-20 rounded-xl"
           style={{ background: 'var(--color-surface-1)', border: '1px dashed var(--color-border)' }}>
        <MapPin size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin planta asignada</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>Contacta al administrador para que te asigne una planta.</p>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-text-900)' }}>
            {loadField ? '...' : (field?.name ?? 'Mi Planta')}
          </h3>
          {field && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin size={12} style={{ color: 'var(--color-text-400)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{field.location}</span>
            </div>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
            Panel de seguimiento &mdash; {user?.first_name} {user?.last_name}
          </p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--color-surface-2)' }}>
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-600)' }}>
            <ChevronLeft size={15} />
          </button>
          <span className="px-4 py-1.5 rounded-lg text-xs font-semibold min-w-36 text-center"
                style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}>
            {MONTHS_FULL[mes - 1]} {anio}
          </span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-600)' }}>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
        </div>
      ) : (
        <>
          {/* ── KPI row 1: score + comparacion + conteos ─────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Score este mes */}
            <div className="p-4 rounded-xl flex flex-col gap-2 lg:col-span-1"
                 style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-1.5">
                <CalendarCheck size={14} style={{ color: 'var(--color-secondary)' }} />
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Score del mes</p>
              </div>
              <div className="mt-1">
                {scoreNow !== null
                  ? <span className="text-2xl font-bold tabular-nums" style={{ color: scoreColor(scoreNow) }}>{scoreNow.toFixed(0)}%</span>
                  : <span className="text-sm" style={{ color: 'var(--color-text-400)' }}>Sin datos</span>
                }
              </div>
              {delta !== null && (
                <div className="flex items-center gap-1">
                  {delta > 0 ? <TrendingUp size={12} style={{ color: '#16a34a' }} /> : delta < 0 ? <TrendingDown size={12} style={{ color: '#dc2626' }} /> : <Minus size={12} style={{ color: 'var(--color-text-400)' }} />}
                  <span className="text-xs font-medium" style={{ color: delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : 'var(--color-text-400)' }}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}% vs {MONTHS_SHORT[prevMes - 1]}
                  </span>
                </div>
              )}
            </div>

            {/* Mes anterior */}
            <div className="p-4 rounded-xl flex flex-col gap-2"
                 style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Mes anterior</p>
              <div className="mt-1">
                {scorePrev !== null
                  ? <span className="text-2xl font-bold tabular-nums" style={{ color: scoreColor(scorePrev) }}>{scorePrev.toFixed(0)}%</span>
                  : <span className="text-sm" style={{ color: 'var(--color-text-400)' }}>N/A</span>
                }
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{MONTHS_FULL[prevMes - 1]}</p>
            </div>

            {/* Entregados */}
            <div className="p-4 rounded-xl flex flex-col gap-2" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Entregados</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#16a34a' }}>
                {on_time + tarde}
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-400)' }}>/ {aplicables}</span>
              </p>
              {tarde > 0 && <p className="text-xs" style={{ color: '#ca8a04' }}>{tarde} con retraso</p>}
            </div>

            {/* Pendientes */}
            <div className="p-4 rounded-xl flex flex-col gap-2" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-1.5">
                <AlertCircle size={14} style={{ color: pendiente > 0 ? '#dc2626' : 'var(--color-text-400)' }} />
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Pendientes</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: pendiente > 0 ? '#dc2626' : 'var(--color-text-400)' }}>{pendiente}</p>
              {pendiente === 0 && <p className="text-xs" style={{ color: '#16a34a' }}>Todo entregado</p>}
            </div>

            {/* Evidencias */}
            <div className="p-4 rounded-xl flex flex-col gap-2" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-1.5">
                <FolderArchive size={14} style={{ color: '#6366f1' }} />
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Evidencias {anio}</p>
              </div>
              {loadEvidences ? (
                <Loader2 size={14} className="animate-spin mt-1" style={{ color: 'var(--color-text-400)' }} />
              ) : (
                <>
                  <p className="text-2xl font-bold" style={{ color: '#6366f1' }}>{evidThisYear}</p>
                  {evidTotal > evidThisYear && <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{evidTotal} total historico</p>}
                </>
              )}
            </div>

            {/* Empleados */}
            <div className="p-4 rounded-xl flex flex-col gap-2" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-1.5">
                <Users size={14} style={{ color: '#0ea5e9' }} />
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Empleados</p>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#0ea5e9' }}>{activeEmployees.length}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                activos &mdash; {employees.length} total
              </p>
            </div>
          </div>

          {/* ── No deliverables ──────────────────────────────────────────────── */}
          {delivsList.length === 0 && (
            <div className="flex flex-col items-center py-12 rounded-xl"
                 style={{ background: 'var(--color-surface-1)', border: '1px dashed var(--color-border)' }}>
              <PackageOpen size={24} className="mb-2" style={{ color: 'var(--color-text-400)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>
                Sin entregables para {MONTHS_FULL[mes - 1]} {anio}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>El coordinador aun no ha generado los entregables para este mes.</p>
            </div>
          )}

          {delivsList.length > 0 && (
            <>
              {/* ── Charts row ──────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Year trend */}
                <div className="p-4 rounded-xl flex flex-col gap-3" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>Tendencia de cumplimiento</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>Score mensual de tu planta &mdash; {anio}</p>
                  </div>
                  {trendData.filter(m => m.hasData).length === 0 ? (
                    <div className="flex items-center justify-center h-40">
                      <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin datos este ano</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
                        <YAxis domain={[0,100]} tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                        <Tooltip content={<ChartTip />} />
                        <ReferenceLine y={90} stroke="rgba(22,163,74,0.3)" strokeDasharray="4 4" />
                        <ReferenceLine y={70} stroke="rgba(202,138,4,0.3)" strokeDasharray="4 4" />
                        <Line
                          type="monotone" dataKey="score" name="Score" stroke="var(--color-secondary)" strokeWidth={2.5}
                          dot={(p: any) => {
                            if (!p.payload.hasData) return <g key={`d${p.cx}`}/>
                            const fill = p.payload.score !== null ? scoreColor(p.payload.score) : 'var(--color-secondary)'
                            return <circle key={`d${p.cx}`} cx={p.cx} cy={p.cy} r={5} fill={fill} stroke="var(--color-surface-0)" strokeWidth={2}/>
                          }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Deliverable status bars */}
                <div className="p-4 rounded-xl flex flex-col gap-3" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>Estado de entregables</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{MONTHS_FULL[mes - 1]} {anio} &mdash; por formato</p>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={delivsList.map(d => ({
                        name: FORMAT_LABELS[d.format_type] ?? d.format_type,
                        status: d.status,
                        val: 1,
                        color: d.status === 'entregado' ? '#16a34a' : d.status === 'entregado_tarde' ? '#ca8a04' : d.status === 'pendiente' ? '#dc2626' : '#94a3b8',
                      }))}
                      layout="vertical"
                      margin={{ top: 4, right: 16, bottom: 4, left: 60 }}
                    >
                      <XAxis type="number" hide domain={[0, 1]} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-400)' }} axisLine={false} tickLine={false} width={56} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload
                        return (
                          <div className="px-3 py-2 rounded-lg text-xs"
                               style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
                            <p className="font-semibold" style={{ color: 'var(--color-text-900)' }}>{d.name}</p>
                            <p style={{ color: d.color }}>
                              {d.status === 'entregado' ? 'A tiempo' : d.status === 'entregado_tarde' ? 'Tarde' : d.status === 'pendiente' ? 'Pendiente' : 'No aplica'}
                            </p>
                          </div>
                        )
                      }} />
                      <Bar dataKey="val" radius={[0,4,4,0]}>
                        {delivsList.map((d, i) => (
                          <Cell key={i} fill={d.status === 'entregado' ? '#16a34a' : d.status === 'entregado_tarde' ? '#ca8a04' : d.status === 'pendiente' ? '#dc2626' : '#94a3b8'} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── Deliverables detail + pending alerts ────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Deliverables table */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                    <CalendarCheck size={14} style={{ color: 'var(--color-secondary)' }} />
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>
                      Entregables &mdash; {MONTHS_FULL[mes - 1]} {anio}
                    </p>
                    {scoreNow !== null && (
                      <div className="ml-auto">
                        <ScoreCell score={scoreNow} size="md" />
                      </div>
                    )}
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                        <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--color-text-400)' }}>Formato</th>
                        <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--color-text-400)' }}>Estado</th>
                        <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--color-text-400)' }}>Vencimiento</th>
                        <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--color-text-400)' }}>Entregado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {delivsList.map(d => (
                        <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-900)' }}>
                            {FORMAT_LABELS[d.format_type] ?? d.format_type}
                          </td>
                          <td className="px-4 py-2.5"><StatusBadge status={d.status} /></td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--color-text-400)' }}>
                            {d.due_date ? new Date(d.due_date+'T00:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short'}) : '-'}
                          </td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--color-text-400)' }}>
                            {d.submitted_at ? new Date(d.submitted_at).toLocaleDateString('es-CO',{day:'2-digit',month:'short'}) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Pending alerts */}
                  {pendingDelivs.length > 0 && (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(220,38,38,0.3)' }}>
                      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(220,38,38,0.06)', borderBottom: '1px solid rgba(220,38,38,0.2)' }}>
                        <AlertCircle size={14} style={{ color: '#dc2626' }} />
                        <p className="text-xs font-semibold" style={{ color: '#dc2626' }}>Sin entregar ({pendingDelivs.length})</p>
                      </div>
                      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {pendingDelivs.map(d => {
                          const overdue = d.due_date && new Date(d.due_date+'T23:59:59') < new Date()
                          return (
                            <div key={d.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                              <p className="text-xs font-medium" style={{ color: 'var(--color-text-900)' }}>
                                {FORMAT_LABELS[d.format_type] ?? d.format_type}
                              </p>
                              <span className="text-xs font-semibold shrink-0" style={{ color: overdue ? '#dc2626' : '#d97706' }}>
                                {overdue ? 'Vencido' : d.due_date ? `Vence ${new Date(d.due_date+'T00:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short'})}` : 'Pendiente'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recent submissions */}
                  {recentDelivs.length > 0 && (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                        <Activity size={14} style={{ color: '#16a34a' }} />
                        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>Ultimas entregas</p>
                      </div>
                      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {recentDelivs.map(d => (
                          <div key={d.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-medium" style={{ color: 'var(--color-text-900)' }}>
                                {FORMAT_LABELS[d.format_type] ?? d.format_type}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                                {d.submitted_at ? new Date(d.submitted_at).toLocaleDateString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}
                              </p>
                            </div>
                            <StatusBadge status={d.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Evidences summary ─────────────────────────────────────────── */}
              {!loadEvidences && evidByCat.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-2">
                      <FolderArchive size={14} style={{ color: '#6366f1' }} />
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>
                        Evidencias cargadas &mdash; {anio} ({evidThisYear})
                      </p>
                    </div>
                    <a
                      href="/dashboard/reports"
                      className="flex items-center gap-1 text-xs font-medium hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--color-secondary)' }}
                    >
                      Ver todas <ExternalLink size={11} />
                    </a>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {evidByCat.map(([cat, count]) => (
                      <div key={cat} className="px-4 py-3 flex flex-col gap-0.5">
                        <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                          {CAT_LABELS[cat as EvidenceCategory] ?? cat}
                        </p>
                        <p className="text-lg font-bold" style={{ color: '#6366f1' }}>{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

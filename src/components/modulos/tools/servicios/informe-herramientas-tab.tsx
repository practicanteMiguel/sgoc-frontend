'use client'

import { useMemo, useState } from 'react'
import { Loader2, FileBarChart } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatCOP } from '@/src/lib/utils'
import { useServicios } from '@/src/hooks/servicios/use-servicios'
import {
  useInformeServicio, useInformeHistoricoServicio, useTendenciaMensualServicio,
} from '@/src/hooks/servicios/use-entregas-herramientas'
import { InformeGlobalCampoView } from './informe-global-campo-view'

type Vista = 'actual' | 'historico' | 'estadisticas'

const MESES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const CREW_COLORS = ['#1a6b6b', '#6366f1', '#0ea5e9', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6', '#64748b']
export const TOOLTIP_STYLE = { background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }

export function formatMes(mes: string) {
  const [anio, m] = mes.split('-')
  const idx = parseInt(m, 10) - 1
  return `${MESES_SHORT[idx] ?? m} ${anio.slice(2)}`
}

export function formatShort(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

export function SummaryCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
      <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{label}</span>
      <span className="text-lg font-bold font-display" style={{ color }}>{value}</span>
      {sub && <span className="text-xs font-medium" style={{ color }}>{sub}</span>}
    </div>
  )
}

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function InformeHerramientasTab() {
  const { data: serviciosData } = useServicios({ activo: true })
  const servicios = serviciosData?.data ?? []

  const [servicioId, setServicioId] = useState('')
  const [vista, setVista] = useState<Vista>('actual')
  const selected = servicios.find(s => s.id === servicioId) ?? null

  const { data: informeActual,    isLoading: loadingActual }    = useInformeServicio(servicioId || null)
  const { data: informeHistorico, isLoading: loadingHistorico } = useInformeHistoricoServicio(servicioId || null)
  const { data: tendencia = [],   isLoading: loadingTendencia } = useTendenciaMensualServicio(servicioId || null)

  const informe   = vista === 'historico' ? informeHistorico : informeActual
  const isLoading = vista === 'estadisticas'
    ? (loadingActual || loadingHistorico || loadingTendencia)
    : (vista === 'historico' ? loadingHistorico : loadingActual)

  const crews = informe?.crews ?? []
  const items = informe?.items ?? []
  const itemsActual = useMemo(() => informeActual?.items ?? [], [informeActual])
  const crewsActual = useMemo(() => informeActual?.crews ?? [], [informeActual])

  const totalLicitado     = informeActual?.totales.valor_total_contrato ?? 0
  const totalActual       = informeActual?.totales.valor_total_entregado ?? 0
  const totalHistorico    = informeHistorico?.totales.valor_total_entregado ?? 0
  const totalRetirado     = Math.max(0, totalHistorico - totalActual)
  const cumplimiento      = totalLicitado > 0 ? Math.round((totalActual / totalLicitado) * 100) : 0
  const colorCumplimiento = cumplimiento >= 80 ? '#16a34a' : cumplimiento >= 50 ? '#f59e0b' : '#ef4444'

  const totalDepreciado   = informeActual?.totales.valor_actual_depreciado ?? null
  const totalSinVidaUtil  = informeActual?.totales.valor_sin_vida_util_definida ?? 0
  const totalDevaluado    = totalDepreciado != null ? Math.max(0, totalActual - totalDepreciado) : 0
  const porcentajeDevaluado = totalDepreciado != null && totalActual > 0 ? Math.round((totalDevaluado / totalActual) * 100) : 0

  const donutData = [
    { value: Math.min(100, cumplimiento),     fill: colorCumplimiento },
    { value: Math.max(0, 100 - cumplimiento), fill: 'var(--color-surface-2)' },
  ]

  const barHerramientas = useMemo(() => {
    return [...itemsActual]
      .filter(it => !it.es_adicional)
      .sort((a, b) => b.valor_total_contrato - a.valor_total_contrato)
      .slice(0, 8)
      .map(it => ({
        name: it.herramienta?.descripcion ?? '-',
        Licitado: it.valor_total_contrato,
        Entregado: it.valor_total_entregado,
      }))
  }, [itemsActual])

  const barCuadrillas = useMemo(() => {
    const porCrew = new Map<string, number>()
    for (const it of itemsActual) {
      for (const [crewId, cantidad] of Object.entries(it.entregado_por_cuadrilla)) {
        porCrew.set(crewId, (porCrew.get(crewId) ?? 0) + cantidad * it.valor_unitario)
      }
    }
    return crewsActual
      .map(c => ({ name: c.name, valor: porCrew.get(c.id) ?? 0 }))
      .filter(c => c.valor > 0)
      .sort((a, b) => b.valor - a.valor)
  }, [itemsActual, crewsActual])

  const tendenciaData = useMemo(
    () => tendencia.map(t => ({ name: formatMes(t.mes), Invertido: t.valor_invertido, Acumulado: t.valor_acumulado })),
    [tendencia],
  )

  const th = "text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
  const td = "text-center px-3 py-2 text-sm whitespace-nowrap"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={servicioId}
          onChange={e => setServicioId(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', minWidth: 260 }}
        >
          <option value="">Todos los campos (global)</option>
          {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>

        {servicioId && (
          <div className="flex gap-1 p-1 rounded-lg min-w-0 max-w-full overflow-x-auto" style={{ background: 'var(--color-surface-2)' }}>
            {([
              { id: 'actual' as const,       label: 'Actual en campo' },
              { id: 'historico' as const,    label: 'Histórico de inversión' },
              { id: 'estadisticas' as const, label: 'Estadísticas' },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setVista(id)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0"
                style={
                  vista === id
                    ? { background: 'var(--color-surface-0)', color: 'var(--color-primary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                    : { color: 'var(--color-text-400)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {selected?.descripcion && (
          <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{selected.descripcion}</span>
        )}
      </div>

      <p className="text-xs -mt-2" style={{ color: 'var(--color-text-400)' }}>
        {!servicioId
          ? 'Totales agrupados por campo, cruzando todas las cuadrillas y servicios, más el total general de todos los campos.'
          : vista === 'actual'
          ? 'Lo que tiene cada cuadrilla en campo ahora mismo (descuenta lo que se ha sacado de funcionamiento).'
          : vista === 'historico'
          ? 'Todo lo entregado desde el inicio del servicio, sin descontar lo sacado de funcionamiento — para saber cuánto se ha invertido en total en herramientas.'
          : 'Panel visual: cumplimiento del contrato, tendencia de inversión mensual y distribución por herramienta y cuadrilla.'}
      </p>

      {!servicioId ? (
        <InformeGlobalCampoView />
      ) : isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-xl gap-2"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <FileBarChart size={28} style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>Este servicio no tiene herramientas exigidas ni entregas registradas</p>
        </div>
      ) : vista === 'estadisticas' ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <SummaryCard label="Total licitado" value={formatCOP(totalLicitado)} color="var(--color-text-900)" />
            <SummaryCard label="Actual en campo (sin devaluar)" value={formatCOP(totalActual)} color="var(--color-primary)" />
            <SummaryCard label="Valor actual depreciado" value={totalDepreciado != null ? formatCOP(totalDepreciado) : '—'} color="#f59e0b"
              sub={totalDepreciado != null ? `-${porcentajeDevaluado}% por devaluación` : undefined} />
            <SummaryCard label="Devaluación acumulada" value={formatCOP(totalDevaluado)} color="#ef4444" />
            <SummaryCard label="Invertido histórico" value={formatCOP(totalHistorico)} color="#16a34a" />
            <SummaryCard label="Sacado de funcionamiento" value={formatCOP(totalRetirado)} color="#ef4444" />
            <SummaryCard label="Cumplimiento" value={`${cumplimiento}%`} color={colorCumplimiento}
              sub={cumplimiento >= 100 ? 'Al día' : 'Falta por entregar'} />
          </div>
          {totalSinVidaUtil > 0 && (
            <p className="text-xs -mt-2" style={{ color: 'var(--color-text-400)' }}>
              Incluye {formatCOP(totalSinVidaUtil)} en herramientas sin vida útil definida en el catálogo (se muestran a valor nominal, sin devaluar).
            </p>
          )}

          {/* Donut + tendencia */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Cumplimiento del contrato" subtitle="Valor entregado vs. licitado">
              <div className="flex items-center justify-center py-2">
                <div className="relative" style={{ width: 140, height: 140 }}>
                  <PieChart width={140} height={140}>
                    <Pie
                      data={donutData}
                      cx={70} cy={70}
                      innerRadius={48} outerRadius={66}
                      startAngle={90} endAngle={-270}
                      strokeWidth={0}
                      dataKey="value"
                      isAnimationActive={false}
                    />
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
                    <span className="text-2xl font-bold font-display" style={{ color: colorCumplimiento, lineHeight: 1 }}>{cumplimiento}%</span>
                    <span className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--color-text-400)' }}>cumplimiento</span>
                  </div>
                </div>
              </div>
            </ChartCard>

            <div className="lg:col-span-2">
              <ChartCard title="Inversión mensual" subtitle="Valor entregado por mes desde el inicio del servicio">
                {tendenciaData.length === 0 ? (
                  <p className="text-xs py-8 text-center" style={{ color: 'var(--color-text-400)' }}>Sin entregas registradas todavía</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={tendenciaData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-400)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-400)' }} tickFormatter={formatShort} width={64} />
                      <Tooltip formatter={(value) => formatCOP(typeof value === 'number' ? value : 0)} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: 'var(--color-text-900)' }} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: 'var(--color-text-400)' }} />
                      <Line type="monotone" dataKey="Invertido" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-primary)' }} />
                      <Line type="monotone" dataKey="Acumulado" stroke="#16a34a" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: '#16a34a' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </div>

          {/* Licitado vs entregado por herramienta */}
          <ChartCard title="Licitado vs. entregado por herramienta" subtitle="Top 8 herramientas por valor licitado">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barHerramientas} margin={{ top: 4, right: 4, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-400)' }} angle={-30} textAnchor="end" interval={0} height={70} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-400)' }} tickFormatter={formatShort} width={64} />
                <Tooltip formatter={(value) => formatCOP(typeof value === 'number' ? value : 0)} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: 'var(--color-text-900)' }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: 'var(--color-text-400)' }} />
                <Bar dataKey="Licitado" fill="var(--color-text-400)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Entregado" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Distribucion por cuadrilla */}
          <ChartCard title="Valor entregado por cuadrilla" subtitle="Cuánto ha recibido cada cuadrilla en total">
            {barCuadrillas.length === 0 ? (
              <p className="text-xs py-8 text-center" style={{ color: 'var(--color-text-400)' }}>Sin entregas registradas todavía</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(140, barCuadrillas.length * 40)}>
                <BarChart data={barCuadrillas} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-400)' }} tickFormatter={formatShort} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-400)' }} width={110} />
                  <Tooltip formatter={(value) => formatCOP(typeof value === 'number' ? value : 0)} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: 'var(--color-text-900)' }} />
                  <Bar dataKey="valor" fill="var(--color-text-900)" radius={[0, 4, 4, 0]}>
                    {barCuadrillas.map((_, i) => (
                      <Cell key={i} fill={CREW_COLORS[i % CREW_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </>
      ) : (
        <>
          {/* Tabla pivot detallada */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
                    <th className={th} style={{ color: 'var(--color-text-900)' }}>Item</th>
                    <th className={`${th} text-left`} style={{ color: 'var(--color-text-900)', minWidth: 220 }}>Detalle</th>
                    <th className={th} style={{ color: 'var(--color-text-900)' }}>Licitado</th>
                    {crews.map(c => (
                      <th key={c.id} className={th} style={{ color: 'var(--color-text-900)', opacity: c.activa ? 1 : 0.6, minWidth: 90 }}>
                        {c.name}
                        {!c.activa && <span className="block font-normal normal-case" style={{ fontSize: 10 }}>(ya no asignada)</span>}
                      </th>
                    ))}
                    <th className={th} style={{ color: 'var(--color-text-900)' }}>Total HTA Licitada</th>
                    <th className={th} style={{ color: 'var(--color-text-900)' }}>Vr. Unit.</th>
                    <th className={th} style={{ color: 'var(--color-text-900)' }}>Vr. Total Contrato</th>
                    <th className={th} style={{ color: 'var(--color-text-900)' }}>
                      {vista === 'actual' ? 'Total HTA Entregada' : 'Total HTA Entregada (histórico)'}
                    </th>
                    <th className={th} style={{ color: 'var(--color-text-900)' }}>
                      {vista === 'actual' ? 'Vr. Total HTA Entregada' : 'Vr. Total Invertido'}
                    </th>
                    {vista === 'actual' && (
                      <th className={th} style={{ color: 'var(--color-text-900)' }}>Vr. Actual Depreciado</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.herramienta_id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}>
                      <td className={td} style={{ color: 'var(--color-text-600)' }}>{idx + 1}</td>
                      <td className="px-3 py-2 text-sm" style={{ color: 'var(--color-text-900)' }}>
                        <span className="font-medium">{it.herramienta?.descripcion ?? '-'}</span>
                        {it.es_adicional && (
                          <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}>
                            Adicional
                          </span>
                        )}
                        {it.herramienta?.codigo && (
                          <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{it.herramienta.codigo}</span>
                        )}
                      </td>
                      <td className={td} style={{ color: 'var(--color-text-600)' }}>{it.es_adicional ? '-' : it.cantidad_exigida_por_cuadrilla}</td>
                      {crews.map(c => (
                        <td key={c.id} className={td} style={{ color: 'var(--color-text-900)' }}>
                          {it.entregado_por_cuadrilla[c.id] ?? 0}
                        </td>
                      ))}
                      <td className={td} style={{ color: 'var(--color-text-600)' }}>{it.es_adicional ? '-' : it.total_licitado}</td>
                      <td className={td} style={{ color: 'var(--color-text-600)' }}>{formatCOP(it.valor_unitario)}</td>
                      <td className={td} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{it.es_adicional ? '-' : formatCOP(it.valor_total_contrato)}</td>
                      <td className={td} style={{ color: 'var(--color-text-900)', fontWeight: 600 }}>{it.total_entregado}</td>
                      <td className={td} style={{ color: '#16a34a', fontWeight: 700 }}>{formatCOP(it.valor_total_entregado)}</td>
                      {vista === 'actual' && (
                        <td className={td} style={{ color: '#f59e0b', fontWeight: 700 }}>
                          {it.valor_actual_depreciado != null ? formatCOP(it.valor_actual_depreciado) : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                    <td colSpan={3 + crews.length} className="px-3 py-3 text-xs font-bold text-right" style={{ color: 'var(--color-text-700)' }}>TOTAL</td>
                    <td className={td}></td>
                    <td className={td}></td>
                    <td className="text-center px-3 py-3 text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                      {formatCOP(informe?.totales.valor_total_contrato ?? 0)}
                    </td>
                    <td className={td}></td>
                    <td className="text-center px-3 py-3 text-sm font-bold" style={{ color: '#16a34a' }}>
                      {formatCOP(informe?.totales.valor_total_entregado ?? 0)}
                    </td>
                    {vista === 'actual' && (
                      <td className="text-center px-3 py-3 text-sm font-bold" style={{ color: '#f59e0b' }}>
                        {informeActual?.totales.valor_actual_depreciado != null ? formatCOP(informeActual.totales.valor_actual_depreciado) : '—'}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

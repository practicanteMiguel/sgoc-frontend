'use client'

import { useMemo } from 'react'
import { Loader2, MapPinned } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatCOP } from '@/src/lib/utils'
import {
  useInformeGlobalPorCampo, useTendenciaMensualGlobal,
} from '@/src/hooks/servicios/use-entregas-herramientas'
import { SummaryCard, ChartCard, TOOLTIP_STYLE, formatMes, formatShort } from './informe-herramientas-tab'

export function InformeGlobalCampoView() {
  const { data: informe, isLoading: loadingInforme } = useInformeGlobalPorCampo()
  const { data: tendencia = [], isLoading: loadingTendencia } = useTendenciaMensualGlobal()
  const isLoading = loadingInforme || loadingTendencia

  const campos = useMemo(() => informe?.campos ?? [], [informe])
  const totales = informe?.totales

  const colorCumplimiento = (c: number) => c >= 80 ? '#16a34a' : c >= 50 ? '#f59e0b' : '#ef4444'

  const totalDevaluado = totales ? Math.max(0, totales.valor_entregado_actual - totales.valor_actual_depreciado) : 0
  const porcentajeDevaluado = totales && totales.valor_entregado_actual > 0
    ? Math.round((totalDevaluado / totales.valor_entregado_actual) * 100) : 0

  const barCampos = useMemo(() => campos.map(c => ({
    name: c.field_name,
    Licitado: c.valor_licitado,
    Entregado: c.valor_entregado_actual,
  })), [campos])

  const barDevaluacion = useMemo(() => campos.map(c => ({
    name: c.field_name,
    'Sin devaluar': c.valor_entregado_actual,
    Depreciado: c.valor_actual_depreciado,
  })), [campos])

  const tendenciaData = useMemo(
    () => tendencia.map(t => ({ name: formatMes(t.mes), Invertido: t.valor_invertido, Acumulado: t.valor_acumulado })),
    [tendencia],
  )

  const th = "text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
  const td = "text-center px-3 py-2 text-sm whitespace-nowrap"

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
      </div>
    )
  }

  if (campos.length === 0 || !totales) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 rounded-xl gap-2"
        style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
      >
        <MapPinned size={28} style={{ color: 'var(--color-text-400)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>Todavía no hay cuadrillas ni herramientas registradas</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPI globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <SummaryCard label="Total licitado (todos los campos)" value={formatCOP(totales.valor_licitado)} color="var(--color-text-900)" />
        <SummaryCard label="Actual en campo (sin devaluar)" value={formatCOP(totales.valor_entregado_actual)} color="var(--color-primary)" />
        <SummaryCard label="Valor actual depreciado" value={formatCOP(totales.valor_actual_depreciado)} color="#f59e0b"
          sub={`-${porcentajeDevaluado}% por devaluación`} />
        <SummaryCard label="Devaluación acumulada" value={formatCOP(totalDevaluado)} color="#ef4444" />
        <SummaryCard label="Invertido histórico" value={formatCOP(totales.valor_entregado_historico)} color="#16a34a" />
        <SummaryCard label="Sacado de funcionamiento" value={formatCOP(totales.valor_retirado)} color="#ef4444" />
        <SummaryCard label="Cumplimiento global" value={`${totales.cumplimiento}%`} color={colorCumplimiento(totales.cumplimiento)}
          sub={`${totales.num_cuadrillas} cuadrilla${totales.num_cuadrillas !== 1 ? 's' : ''}`} />
      </div>
      {totales.valor_sin_vida_util_definida > 0 && (
        <p className="text-xs -mt-2" style={{ color: 'var(--color-text-400)' }}>
          Incluye {formatCOP(totales.valor_sin_vida_util_definida)} en herramientas sin vida útil definida en el catálogo (se muestran a valor nominal, sin devaluar).
        </p>
      )}

      {/* Sin devaluar vs depreciado por campo */}
      <ChartCard title="Valor sin devaluar vs. depreciado por campo" subtitle="Cuánto vale realmente hoy lo que hay en campo, aplicando la devaluación por antigüedad">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barDevaluacion} margin={{ top: 4, right: 4, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-400)' }} angle={-30} textAnchor="end" interval={0} height={70} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-400)' }} tickFormatter={formatShort} width={64} />
            <Tooltip formatter={(value) => formatCOP(typeof value === 'number' ? value : 0)} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: 'var(--color-text-900)' }} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: 'var(--color-text-400)' }} />
            <Bar dataKey="Sin devaluar" fill="var(--color-text-400)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Depreciado" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Licitado vs entregado por campo */}
      <ChartCard title="Licitado vs. entregado por campo" subtitle="Valor actual en campo frente a lo licitado, por campo">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barCampos} margin={{ top: 4, right: 4, bottom: 40, left: 0 }}>
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

      {/* Tendencia mensual global */}
      <ChartCard title="Inversión mensual global" subtitle="Valor entregado por mes, en todos los servicios">
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

      {/* Tabla detallada por campo */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
                <th className={`${th} text-left`} style={{ color: 'var(--color-text-900)' }}>Campo</th>
                <th className={th} style={{ color: 'var(--color-text-900)' }}>Cuadrillas</th>
                <th className={th} style={{ color: 'var(--color-text-900)' }}>Licitado</th>
                <th className={th} style={{ color: 'var(--color-text-900)' }}>Actual en campo</th>
                <th className={th} style={{ color: 'var(--color-text-900)' }}>Actual depreciado</th>
                <th className={th} style={{ color: 'var(--color-text-900)' }}>Invertido histórico</th>
                <th className={th} style={{ color: 'var(--color-text-900)' }}>Sacado de funcionamiento</th>
                <th className={th} style={{ color: 'var(--color-text-900)' }}>Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {campos.map((c, idx) => (
                <tr key={c.field_id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}>
                  <td className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>{c.field_name}</td>
                  <td className={td} style={{ color: 'var(--color-text-600)' }}>{c.num_cuadrillas}</td>
                  <td className={td} style={{ color: 'var(--color-text-600)' }}>{formatCOP(c.valor_licitado)}</td>
                  <td className={td} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{formatCOP(c.valor_entregado_actual)}</td>
                  <td className={td} style={{ color: '#f59e0b', fontWeight: 600 }}>{formatCOP(c.valor_actual_depreciado)}</td>
                  <td className={td} style={{ color: '#16a34a', fontWeight: 600 }}>{formatCOP(c.valor_entregado_historico)}</td>
                  <td className={td} style={{ color: '#ef4444' }}>{formatCOP(c.valor_retirado)}</td>
                  <td className={td} style={{ color: colorCumplimiento(c.cumplimiento), fontWeight: 700 }}>{c.cumplimiento}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                <td className="px-3 py-3 text-xs font-bold" style={{ color: 'var(--color-text-700)' }}>TOTAL GENERAL</td>
                <td className="text-center px-3 py-3 text-sm font-bold" style={{ color: 'var(--color-text-900)' }}>{totales.num_cuadrillas}</td>
                <td className="text-center px-3 py-3 text-sm font-bold" style={{ color: 'var(--color-text-900)' }}>{formatCOP(totales.valor_licitado)}</td>
                <td className="text-center px-3 py-3 text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{formatCOP(totales.valor_entregado_actual)}</td>
                <td className="text-center px-3 py-3 text-sm font-bold" style={{ color: '#f59e0b' }}>{formatCOP(totales.valor_actual_depreciado)}</td>
                <td className="text-center px-3 py-3 text-sm font-bold" style={{ color: '#16a34a' }}>{formatCOP(totales.valor_entregado_historico)}</td>
                <td className="text-center px-3 py-3 text-sm font-bold" style={{ color: '#ef4444' }}>{formatCOP(totales.valor_retirado)}</td>
                <td className="text-center px-3 py-3 text-sm font-bold" style={{ color: colorCumplimiento(totales.cumplimiento) }}>{totales.cumplimiento}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

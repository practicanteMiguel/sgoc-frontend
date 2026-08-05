'use client'

import { useMemo, useState } from 'react'
import { formatCOP, formatDateShort } from '@/src/lib/utils'
import { ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useEmployees } from '@/src/hooks/reports/use-employees'
import type { Employee } from '@/src/types/reports.types'
import { useCensoValores, useCensoValorEmpleadoDetalle } from '@/src/hooks/dotaciones/use-indumentaria'
import { useInformeDotaciones, useInformeDotacionesTendencia, useInformeDotacionesTotalHistorico } from '@/src/hooks/dotaciones/use-dotaciones'
import type { OrigenRqDotacion } from '@/src/types/dotaciones.types'
import { TIPO_ENTREGA_LABELS } from '@/src/types/indumentaria.types'
import { ModalPortal } from '@/src/components/ui/modal-portal'

const MESES_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const ORIGEN_LABELS: Record<OrigenRqDotacion, string> = {
  REPOSICION: 'Reposicion',
  DIRECTA:    'Dotacion inicial / periodica',
}

const ORIGEN_COLORS: Record<OrigenRqDotacion, string> = {
  REPOSICION: '#f59e0b',
  DIRECTA:    '#16a34a',
}

function formatShort(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

function dayKey(iso: string): string {
  return iso.includes('T') ? iso.slice(0, 10) : iso
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
    >
      <span className="text-xs" style={{ color: 'var(--color-text-200)' }}>{label}</span>
      <span className="text-sm font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

function DetalleValorModal({ empleado, onClose }: { empleado: Employee; onClose: () => void }) {
  const { data: detalle = [], isLoading } = useCensoValorEmpleadoDetalle(empleado.id)
  const total = detalle.reduce((s, d) => s + d.valor_total, 0)

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="flex flex-col rounded-2xl w-full max-w-2xl"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--color-text-900)' }}>{empleado.first_name} {empleado.last_name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>Detalle de valor por entrega</p>
          </div>
          <button onClick={onClose} className="hover:opacity-70" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : detalle.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: 'var(--color-text-200)' }}>Sin entregas registradas</p>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Fecha', 'Indumentaria', 'Tipo', 'Cant.', 'V. Unitario', 'Valor total'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-400)', fontSize: 10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalle.map((d, idx) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{formatDateShort(d.fecha_entrega)}</td>
                      <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-text-900)' }}>{d.indumentaria_nombre} <span style={{ color: 'var(--color-text-400)' }}>{d.codigo ? `(${d.codigo})` : ''}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{TIPO_ENTREGA_LABELS[d.tipo]}</td>
                      <td className="px-3 py-2 text-center font-semibold" style={{ color: 'var(--color-text-900)' }}>{d.cantidad}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap" style={{ color: d.valor_unitario != null ? 'var(--color-text-700)' : 'var(--color-border)' }}>{formatCOP(d.valor_unitario)}</td>
                      <td className="px-3 py-2 text-right font-bold whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>{formatCOP(d.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border)' }}>
                    <td colSpan={5} className="px-3 py-2.5 text-xs font-bold text-right" style={{ color: 'var(--color-text-600)' }}>TOTAL</td>
                    <td className="px-3 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>{formatCOP(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

export function InformeDotacionesTab() {
  const now  = new Date()
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [campoId, setCampoId] = useState('')
  const [search,  setSearch]  = useState('')
  const [detalleEmpleado, setDetalleEmpleado] = useState<Employee | null>(null)

  function adjustPeriod(delta: number) {
    let m = mes + delta, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  const periodosTendencia = useMemo(() => {
    const result: { mes: number; anio: number }[] = []
    for (let i = 5; i >= 0; i--) {
      let m = mes - i, a = anio
      while (m < 1) { m += 12; a-- }
      result.push({ mes: m, anio: a })
    }
    return result
  }, [mes, anio])

  const { data: informe, isLoading: loadingInforme } = useInformeDotaciones(mes, anio)
  const { data: tendencia = [] } = useInformeDotacionesTendencia(periodosTendencia)
  const { data: totalHistoricoData } = useInformeDotacionesTotalHistorico()

  const { data: empData, isLoading: loadingEmp } = useEmployees({ limit: 1000 })
  const empleados = (empData?.data ?? []).filter(e => e.is_active !== false)
  const { data: censoValores = [], isLoading: loadingCenso } = useCensoValores()

  const isLoading = loadingInforme || loadingEmp || loadingCenso

  const censoValoresMap = useMemo(() => new Map(censoValores.map(c => [c.empleado_id, c])), [censoValores])
  const totalHistorico = totalHistoricoData?.total_valor ?? 0

  const campos = Array.from(
    new Map(empleados.filter(e => e.field).map(e => [e.field!.id, e.field!.name])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]))

  const filtrados = empleados
    .filter(e => !campoId || e.field?.id === campoId)
    .filter(e => !search.trim() || `${e.first_name} ${e.last_name} ${e.identification_number}`.toLowerCase().includes(search.toLowerCase()))
    .map(e => ({ empleado: e, ...(censoValoresMap.get(e.id) ?? { valor_total: 0, total_entregas: 0, fecha_ultima_entrega: null }) }))
    .sort((a, b) => b.valor_total - a.valor_total)

  const totalFiltrado = filtrados.reduce((s, f) => s + f.valor_total, 0)

  // ── Tendencia (ultimos 6 meses, apilada por origen) ─────────────────────────
  const barData = tendencia.map(t => ({
    name: `${MESES_SHORT[t.mes - 1]} ${String(t.anio).slice(2)}`,
    [ORIGEN_LABELS.REPOSICION]: t.por_origen.REPOSICION,
    [ORIGEN_LABELS.DIRECTA]:    t.por_origen.DIRECTA,
  }))

  // ── Desglose diario del mes activo ──────────────────────────────────────────
  const dailyData = useMemo(() => {
    const rows = informe?.rows ?? []
    const map = new Map<string, number>()
    for (const r of rows) {
      const key = dayKey(r.fecha)
      map.set(key, (map.get(key) ?? 0) + r.valor_total)
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, valor]) => ({ name: key.slice(8, 10), valor }))
  }, [informe])

  // ── Top items por valor del mes activo ──────────────────────────────────────
  const topItems = useMemo(() => {
    const rows = informe?.rows ?? []
    const map = new Map<string, { codigo: string | null; nombre: string; cantidad: number; valor_total: number }>()
    for (const r of rows) {
      const key = r.indumentaria_id ?? r.descripcion
      const entry = map.get(key) ?? { codigo: r.codigo, nombre: r.descripcion, cantidad: 0, valor_total: 0 }
      entry.cantidad += r.solicitado
      entry.valor_total += r.valor_total
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.valor_total - a.valor_total).slice(0, 10)
  }, [informe])

  const totalMes  = informe?.total_valor ?? 0
  const reposicionesMes = informe?.por_origen.REPOSICION ?? 0
  const directaMes      = informe?.por_origen.DIRECTA ?? 0

  return (
    <div className="flex flex-col gap-5">
      {/* Period selector */}
      <div
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 w-fit"
        style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)' }}
      >
        <button
          onClick={() => adjustPeriod(-1)}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-text-400)' }}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold px-2 min-w-36 text-center" style={{ color: 'var(--color-text-900)' }}>
          {MESES_FULL[mes - 1]} {anio}
        </span>
        <button
          onClick={() => adjustPeriod(1)}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-text-400)' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : (
        <>
          <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
            Los valores se toman del precio registrado en cada RQ al momento de generarla, no del precio actual del catalogo.
          </p>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label={`Total ${MESES_FULL[mes - 1]}`}   value={formatCOP(totalMes)}        color="var(--color-text-900)" />
            <SummaryCard label="Reposiciones del mes"              value={formatCOP(reposicionesMes)} color="#f59e0b" />
            <SummaryCard label="Dotacion inicial / periodica"      value={formatCOP(directaMes)}      color="#16a34a" />
            <SummaryCard label="Total historico (todas las RQs)"   value={formatCOP(totalHistorico)}  color="var(--color-primary)" />
          </div>

          {/* Tendencia */}
          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-200)' }}>
              Tendencia ultimos 6 meses
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-400)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-200)' }} tickFormatter={formatShort} width={64} />
                <Tooltip
                  formatter={(value) => formatCOP(typeof value === 'number' ? value : 0)}
                  contentStyle={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--color-text-900)' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: 'var(--color-text-400)' }} />
                <Bar dataKey={ORIGEN_LABELS.REPOSICION} stackId="v" fill={ORIGEN_COLORS.REPOSICION} />
                <Bar dataKey={ORIGEN_LABELS.DIRECTA}    stackId="v" fill={ORIGEN_COLORS.DIRECTA} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Desglose diario */}
            <div
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-200)' }}>
                Valor de RQs por dia · {MESES_FULL[mes - 1]}
              </p>
              {dailyData.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <p className="text-xs" style={{ color: 'var(--color-text-200)' }}>Sin RQs este mes</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-400)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-200)' }} tickFormatter={formatShort} width={56} />
                    <Tooltip
                      formatter={(value) => formatCOP(typeof value === 'number' ? value : 0)}
                      contentStyle={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: 'var(--color-text-900)' }}
                    />
                    <Bar dataKey="valor" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top items */}
            <div
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', height: 'fit-content' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-200)' }}>
                Items de mayor valor · {MESES_FULL[mes - 1]}
              </p>
              {topItems.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <p className="text-xs" style={{ color: 'var(--color-text-200)' }}>Sin RQs este mes</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 236 }}>
                  {topItems.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs px-1 py-1.5" style={{ borderBottom: idx < topItems.length - 1 ? '1px solid var(--color-border)' : undefined }}>
                      <div className="flex flex-col">
                        <span className="font-medium" style={{ color: 'var(--color-text-900)' }}>{it.nombre}</span>
                        <span style={{ color: 'var(--color-text-400)' }}>{it.codigo ?? '-'} · {it.cantidad} und.</span>
                      </div>
                      <span className="font-bold whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>{formatCOP(it.valor_total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Censo en valores */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-700)' }}>Censo en valores (historico)</p>
              <select
                value={campoId}
                onChange={e => setCampoId(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg outline-none cursor-pointer ml-auto"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', minWidth: 160 }}
              >
                <option value="">Todos los campos</option>
                {campos.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-400)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o cedula..."
                  className="pl-8 pr-3 py-2 text-xs rounded-lg outline-none"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', minWidth: 220 }}
                />
              </div>
            </div>
            <p className="text-xs -mt-2" style={{ color: 'var(--color-text-200)' }}>
              El valor de cada entrega se calcula con el precio de RQ mas cercano en el tiempo para ese item.
            </p>

            {filtrados.length === 0 ? (
              <div className="flex items-center justify-center py-10 rounded-xl" style={{ border: '1px dashed var(--color-border)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-200)' }}>Sin empleados para este filtro</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: '#1a3a3a', color: '#fff' }}>
                        {['Nombre', 'Cedula', 'Cargo', 'Campo', 'N. entregas', 'Valor total', 'Ultima entrega'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((f, idx) => (
                        <tr key={f.empleado.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}>
                          <td className="px-4 py-3 font-medium text-sm whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>{f.empleado.first_name} {f.empleado.last_name}</td>
                          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{f.empleado.identification_number}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-700)' }}>{f.empleado.position}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-700)' }}>{f.empleado.field?.name ?? '-'}</td>
                          <td className="px-4 py-3 text-xs text-center" style={{ color: 'var(--color-text-700)' }}>{f.total_entregas}</td>
                          <td className="px-4 py-3 text-xs text-right whitespace-nowrap">
                            <button
                              onClick={() => setDetalleEmpleado(f.empleado)}
                              className="font-bold hover:underline"
                              style={{ color: 'var(--color-primary)' }}
                              title="Ver detalle por indumentaria"
                            >
                              {formatCOP(f.valor_total)}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{f.fecha_ultima_entrega ? formatDateShort(f.fecha_ultima_entrega) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#1a3a3a', color: '#fff', borderTop: '2px solid rgba(255,255,255,0.3)' }}>
                        <td className="px-4 py-3 text-xs font-bold">Total ({filtrados.length})</td>
                        <td colSpan={3} />
                        <td className="px-4 py-3 text-xs text-center font-bold">{filtrados.reduce((s, f) => s + f.total_entregas, 0)}</td>
                        <td className="px-4 py-3 text-xs font-bold text-right whitespace-nowrap">{formatCOP(totalFiltrado)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {detalleEmpleado && (
        <DetalleValorModal empleado={detalleEmpleado} onClose={() => setDetalleEmpleado(null)} />
      )}
    </div>
  )
}

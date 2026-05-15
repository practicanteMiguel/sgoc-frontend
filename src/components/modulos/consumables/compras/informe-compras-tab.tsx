'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, FileText, Loader2, AlertTriangle } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useInformeFacturas, useInformeTendencia } from '@/src/hooks/consumables/use-informe'
import { CATEGORIAS, CATEGORIA_LABELS } from '@/src/types/consumables.types'
import type { CategoriaInsumo, InformeRow } from '@/src/types/consumables.types'

const MESES_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatCOP(value: number | null | undefined) {
  if (value == null) return '-'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}

function formatShort(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

function SummaryCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
    >
      <span className="text-xs" style={{ color: 'var(--color-text-200)' }}>{label}</span>
      <span className="text-sm font-bold" style={{ color }}>{value}</span>
      {sub && <span className="text-xs font-medium" style={{ color }}>{sub}</span>}
    </div>
  )
}

// ── Tabla por planta ────────────────────────────────────────────────────────
function PlantaTabla({ rows, categoria }: { rows: InformeRow[]; categoria: CategoriaInsumo }) {
  const filtered = useMemo(
    () => rows
      .filter((r) => r.categoria === categoria && (r.solicitado ?? 0) > 0)
      .sort((a, b) => (a.codigo ?? '').localeCompare(b.codigo ?? '')),
    [rows, categoria],
  )

  const totalEst  = filtered.reduce((s, r) => r.solicitado != null && r.valor_unitario != null ? s + r.solicitado * r.valor_unitario : s, 0)
  const totalReal = filtered.reduce((s, r) => {
    if (r.solicitado == null || r.precio_real == null) return s
    return s + r.solicitado * r.precio_real
  }, 0)

  if (filtered.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-10 rounded-xl"
        style={{ border: '1px dashed var(--color-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-200)' }}>Sin items en {CATEGORIA_LABELS[categoria]}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
              {['Codigo','Descripcion','Unidad','Prov. Inicial','Prov. Factura','V.Unit. Inicial','V.Unit. Real','Dif. Unit.','Cant.','Total Est.','Total Real'].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: 'var(--color-text-400)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => {
              const tEst  = row.solicitado != null && row.valor_unitario != null ? row.solicitado * row.valor_unitario : null
              const tReal = row.solicitado != null && row.precio_real != null ? row.solicitado * row.precio_real : null
              const difUnit    = row.precio_real != null && row.valor_unitario != null ? row.precio_real - row.valor_unitario : null
              const provCambio = !!row.proveedor_factura && row.proveedor_factura !== row.proveedor_ordinario
              return (
                <tr
                  key={`${row.rq_id}-${row.item_id}`}
                  style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-400)' }}>{row.codigo}</td>
                  <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--color-text-900)', minWidth: 160 }}>{row.descripcion}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-400)' }}>{row.unidad}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-400)' }}>{row.proveedor_ordinario ?? '-'}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                    {row.proveedor_factura ? (
                      <span className="flex items-center gap-1">
                        {provCambio && <AlertTriangle size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />}
                        <span style={{ color: provCambio ? '#b45309' : 'var(--color-text-400)', fontWeight: provCambio ? 600 : 400 }}>
                          {row.proveedor_factura}
                        </span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-border)' }}>-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>{formatCOP(row.valor_unitario)}</td>
                  <td className="px-3 py-2.5 text-xs text-right font-semibold whitespace-nowrap" style={{ color: row.precio_real != null ? 'var(--color-text-900)' : 'var(--color-border)' }}>{formatCOP(row.precio_real)}</td>
                  <td className="px-3 py-2.5 text-xs text-right font-bold whitespace-nowrap">
                    {difUnit != null ? (
                      <span style={{ color: difUnit > 0 ? '#dc2626' : difUnit < 0 ? '#16a34a' : 'var(--color-text-200)' }}>
                        {difUnit > 0 ? '+' : ''}{formatCOP(difUnit)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-border)' }}>-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-center font-bold" style={{ color: 'var(--color-text-900)' }}>{row.solicitado ?? '-'}</td>
                  <td className="px-3 py-2.5 text-xs text-right whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{formatCOP(tEst)}</td>
                  <td className="px-3 py-2.5 text-xs text-right font-semibold whitespace-nowrap" style={{ color: tReal != null ? 'var(--color-text-900)' : 'var(--color-border)' }}>{formatCOP(tReal)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border)' }}>
              <td colSpan={9} className="px-3 py-2.5 text-xs font-bold text-right" style={{ color: 'var(--color-text-600)' }}>
                SUBTOTAL {CATEGORIA_LABELS[categoria].toUpperCase()}
              </td>
              <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>{formatCOP(totalEst)}</td>
              <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap" style={{ color: totalReal > 0 ? 'var(--color-text-900)' : 'var(--color-text-200)' }}>
                {totalReal > 0 ? formatCOP(totalReal) : '-'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Tabla total general ─────────────────────────────────────────────────────
type TotalRow = {
  insumo_id:        string
  codigo:           string
  descripcion:      string
  unidad:           string
  valor_unitario:   number | null
  total_solicitado: number
  total_estimado:   number
  total_real:       number
}

function TotalTabla({ rows, categoria }: { rows: InformeRow[]; categoria: CategoriaInsumo }) {
  const totales: TotalRow[] = useMemo(() => {
    const map = new Map<string, TotalRow>()
    for (const r of rows) {
      if (r.categoria !== categoria || (r.solicitado ?? 0) <= 0) continue
      if (!map.has(r.insumo_id)) {
        map.set(r.insumo_id, {
          insumo_id:        r.insumo_id,
          codigo:           r.codigo,
          descripcion:      r.descripcion,
          unidad:           r.unidad,
          valor_unitario:   r.valor_unitario,
          total_solicitado: 0,
          total_estimado:   0,
          total_real:       0,
        })
      }
      const entry = map.get(r.insumo_id)!
      const cant  = r.solicitado ?? 0
      entry.total_solicitado += cant
      if (r.valor_unitario != null) entry.total_estimado += cant * r.valor_unitario
      if (r.precio_real != null) entry.total_real += cant * r.precio_real
    }
    return Array.from(map.values()).sort((a, b) => (a.codigo ?? '').localeCompare(b.codigo ?? ''))
  }, [rows, categoria])

  const subtotalEst  = totales.reduce((s, r) => s + r.total_estimado, 0)
  const subtotalReal = totales.reduce((s, r) => s + r.total_real, 0)
  const subtotalDif  = subtotalReal - subtotalEst

  if (totales.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-10 rounded-xl"
        style={{ border: '1px dashed var(--color-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-200)' }}>Sin items en {CATEGORIA_LABELS[categoria]}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
              {['Codigo','Descripcion','Unidad','Cant. Total','V. Unitario','Total Estimado','Total Real','Diferencia'].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: 'var(--color-text-400)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {totales.map((row, idx) => {
              const dif = row.total_real - row.total_estimado
              return (
                <tr
                  key={row.insumo_id}
                  style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-400)' }}>{row.codigo}</td>
                  <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--color-text-900)', minWidth: 160 }}>{row.descripcion}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-400)' }}>{row.unidad}</td>
                  <td className="px-3 py-2.5 text-xs text-center font-bold" style={{ color: 'var(--color-text-900)' }}>{row.total_solicitado}</td>
                  <td className="px-3 py-2.5 text-xs text-right font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>{formatCOP(row.valor_unitario)}</td>
                  <td className="px-3 py-2.5 text-xs text-right whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{formatCOP(row.total_estimado)}</td>
                  <td className="px-3 py-2.5 text-xs text-right font-semibold whitespace-nowrap" style={{ color: row.total_real > 0 ? 'var(--color-text-900)' : 'var(--color-border)' }}>
                    {row.total_real > 0 ? formatCOP(row.total_real) : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right font-bold whitespace-nowrap">
                    {row.total_real > 0 ? (
                      <span style={{ color: dif > 0 ? '#dc2626' : dif < 0 ? '#16a34a' : 'var(--color-text-200)' }}>
                        {dif > 0 ? '+' : ''}{formatCOP(dif)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-border)' }}>-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border)' }}>
              <td colSpan={5} className="px-3 py-2.5 text-xs font-bold text-right" style={{ color: 'var(--color-text-600)' }}>
                SUBTOTAL {CATEGORIA_LABELS[categoria].toUpperCase()}
              </td>
              <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>{formatCOP(subtotalEst)}</td>
              <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap" style={{ color: subtotalReal > 0 ? 'var(--color-text-900)' : 'var(--color-text-200)' }}>
                {subtotalReal > 0 ? formatCOP(subtotalReal) : '-'}
              </td>
              <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap">
                {subtotalReal > 0 ? (
                  <span style={{ color: subtotalDif > 0 ? '#dc2626' : subtotalDif < 0 ? '#16a34a' : 'var(--color-text-200)' }}>
                    {subtotalDif > 0 ? '+' : ''}{formatCOP(subtotalDif)}
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-border)' }}>-</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────
type PlantaKey = string

export function InformeComprasTab() {
  const now  = new Date()
  const [mes,           setMes]          = useState(6)
  const [anio,          setAnio]         = useState(now.getFullYear())
  const [catActiva,     setCatActiva]    = useState<CategoriaInsumo>('PAPELERIA')
  const [plantaActiva,  setPlantaActiva] = useState<PlantaKey | 'total'>('total')

  function adjustPeriod(delta: number) {
    let m = mes + delta, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
    setPlantaActiva('total')
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

  const { data: informe, isLoading } = useInformeFacturas(mes, anio)
  const { data: tendencia = []     } = useInformeTendencia(periodosTendencia)

  const allRows: InformeRow[] = useMemo(
    () => (informe?.rows ?? []).filter((r) => (r.solicitado ?? 0) > 0),
    [informe],
  )

  const plantas = useMemo(() => {
    const seen = new Map<PlantaKey, { lugar: string; lote: number }>()
    for (const r of allRows) {
      const key = `${r.lugar}|${r.lote}`
      if (!seen.has(key)) seen.set(key, { lugar: r.lugar, lote: r.lote })
    }
    return Array.from(seen.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => a.lugar.localeCompare(b.lugar) || a.lote - b.lote)
  }, [allRows])

  const plantaRows = useMemo(() => {
    if (plantaActiva === 'total') return allRows
    const [lugar, loteStr] = plantaActiva.split('|')
    const lote = Number(loteStr)
    return allRows.filter((r) => r.lugar === lugar && r.lote === lote)
  }, [allRows, plantaActiva])

  const totalEst = useMemo(
    () => plantaRows.reduce((s, r) => r.solicitado != null && r.valor_unitario != null ? s + r.solicitado * r.valor_unitario : s, 0),
    [plantaRows],
  )
  const totalReal = useMemo(
    () => plantaRows.reduce((s, r) => {
      if (r.solicitado == null || r.precio_real == null) return s
      return s + r.solicitado * r.precio_real
    }, 0),
    [plantaRows],
  )
  const diferencia  = totalReal - totalEst
  const pct         = totalEst > 0 ? (diferencia / totalEst) * 100 : 0
  const hayFacturas = plantaRows.some((r) => r.precio_real != null)

  const lineData = useMemo(() => tendencia.map((t) => {
    let estimado = 0, facturado = 0
    if (plantaActiva === 'total') {
      estimado  = t.total_estimado ?? 0
      facturado = t.total_real     ?? 0
    } else {
      const [lugar, loteStr] = plantaActiva.split('|')
      const lote = Number(loteStr)
      const rows = (t.rows ?? []).filter((r) => r.lugar === lugar && r.lote === lote)
      estimado  = rows.reduce((s, r) => r.solicitado != null && r.valor_unitario != null ? s + r.solicitado * r.valor_unitario : s, 0)
      facturado = rows.reduce((s, r) => r.solicitado != null && r.precio_real != null ? s + r.solicitado * r.precio_real : s, 0)
    }
    return {
      name:      `${MESES_SHORT[t.mes - 1]} ${String(t.anio).slice(2)}`,
      Estimado:  estimado,
      Facturado: facturado,
    }
  }), [tendencia, plantaActiva])

  const catFacturadoStatus = useMemo(() =>
    Object.fromEntries(CATEGORIAS.map((cat) => {
      const rows      = plantaRows.filter((r) => r.categoria === cat && (r.solicitado ?? 0) > 0)
      const facturado = rows.filter((r) => r.precio_real != null).length
      const status    = rows.length === 0       ? 'empty'
                      : facturado === 0          ? 'pending'
                      : facturado === rows.length ? 'complete'
                      : 'partial'
      return [cat, status]
    })) as Record<CategoriaInsumo, 'empty' | 'pending' | 'partial' | 'complete'>,
    [plantaRows],
  )

  const catCounts = useMemo(
    () => Object.fromEntries(CATEGORIAS.map((c) => [c, plantaRows.filter((r) => r.categoria === c).length])) as Record<CategoriaInsumo, number>,
    [plantaRows],
  )

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
      ) : allRows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl"
          style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface-0)' }}
        >
          <FileText size={28} className="mb-3" style={{ color: 'var(--color-border)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin requisiciones para este periodo</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
            Genera las requisiciones del mes para ver el informe comparativo
          </p>
        </div>
      ) : (
        <>
          {/* Plant selector */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPlantaActiva('total')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: plantaActiva === 'total' ? 'var(--color-primary)' : 'var(--color-surface-1)',
                border:     `1px solid ${plantaActiva === 'total' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                color:      plantaActiva === 'total' ? '#fff' : 'var(--color-text-600)',
              }}
            >
              Total general
            </button>
            {plantas.map(({ key, lugar, lote }) => (
              <button
                key={key}
                onClick={() => setPlantaActiva(key)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: plantaActiva === key ? 'var(--color-primary)' : 'var(--color-surface-1)',
                  border:     `1px solid ${plantaActiva === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  color:      plantaActiva === key ? '#fff' : 'var(--color-text-600)',
                }}
              >
                {lugar} - CC {lote}
              </button>
            ))}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Total estimado"  value={formatCOP(totalEst)}  color="var(--color-text-900)" />
            <SummaryCard
              label="Total real"
              value={hayFacturas ? formatCOP(totalReal) : 'Sin facturas'}
              color="var(--color-text-900)"
            />
            <SummaryCard
              label="Diferencia"
              value={hayFacturas ? formatCOP(Math.abs(diferencia)) : '-'}
              color={diferencia > 0 ? '#dc2626' : diferencia < 0 ? '#16a34a' : 'var(--color-text-200)'}
              sub={hayFacturas ? (diferencia > 0 ? 'Sobrecosto' : diferencia < 0 ? 'Ahorro' : 'Sin variacion') : undefined}
            />
            <SummaryCard
              label="% Variacion"
              value={hayFacturas ? `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%` : '-'}
              color={pct > 0 ? '#dc2626' : pct < 0 ? '#16a34a' : 'var(--color-text-200)'}
            />
          </div>

          {/* Tendency chart */}
          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-200)' }}>
              Tendencia ultimos 6 meses
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-400)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-200)' }} tickFormatter={formatShort} width={64} />
                <Tooltip
                  formatter={(value: any) => formatCOP(typeof value === 'number' ? value : 0)}
                  contentStyle={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--color-text-900)' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: 'var(--color-text-400)' }} />
                <Line type="monotone" dataKey="Estimado"  stroke="var(--color-border-strong)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Facturado" stroke="var(--color-primary)"       strokeWidth={2} dot={{ r: 3, fill: 'var(--color-primary)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Category tabs + comparison table */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface-2)' }}>
              {CATEGORIAS.map((cat) => {
                const fStatus   = catFacturadoStatus[cat]
                const dotColor  = fStatus === 'complete' ? '#16a34a' : fStatus === 'partial' ? '#f59e0b' : '#d1d5db'
                return (
                  <button
                    key={cat}
                    onClick={() => setCatActiva(cat)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={
                      catActiva === cat
                        ? { background: 'var(--color-surface-0)', color: 'var(--color-text-900)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
                        : { color: 'var(--color-text-400)' }
                    }
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
                    {CATEGORIA_LABELS[cat]}
                    <span className="text-xs" style={{ color: catActiva === cat ? 'var(--color-text-200)' : 'var(--color-border)' }}>
                      {catCounts[cat]}
                    </span>
                  </button>
                )
              })}
            </div>

            {plantaActiva === 'total' ? (
              <TotalTabla rows={allRows} categoria={catActiva} />
            ) : (
              <PlantaTabla rows={plantaRows} categoria={catActiva} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

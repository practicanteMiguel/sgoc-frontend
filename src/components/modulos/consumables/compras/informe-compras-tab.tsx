'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, FileText, Loader2, AlertTriangle, Upload, X, CheckCircle2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'
import { useInformeFacturas, useInformeTendencia } from '@/src/hooks/consumables/use-informe'
import { parseOCPdf, matchesDesc } from '@/src/lib/parse-oc-pdf'
import type { OCParseResult } from '@/src/lib/parse-oc-pdf'
import { ModalPortal } from '@/src/components/ui/modal-portal'
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

  const totalEst  = filtered.reduce((s, r) => r.solicitado != null && r.valor_unitario != null ? s + Number(r.solicitado) * Number(r.valor_unitario) : s, 0)
  const totalReal = filtered.reduce((s, r) => {
    if (r.solicitado == null || r.precio_real == null) return s
    return s + Number(r.solicitado) * Number(r.precio_real)
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
              const tEst  = row.solicitado != null && row.valor_unitario != null ? Number(row.solicitado) * Number(row.valor_unitario) : null
              const tReal = row.solicitado != null && row.precio_real != null ? Number(row.solicitado) * Number(row.precio_real) : null
              const difUnit    = row.precio_real != null && row.valor_unitario != null ? Number(row.precio_real) - Number(row.valor_unitario) : null
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
                  <td className="px-3 py-2.5 text-xs text-center font-bold" style={{ color: 'var(--color-text-900)' }}>{row.solicitado != null ? Math.round(Number(row.solicitado)) : '-'}</td>
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

// ── Tabla total general (pivot por RQ) ─────────────────────────────────────
type RQCol = { rq_id: string; numero_rq: number; lugar: string; lote: number }

type InsumoConRQs = {
  insumo_id:           string
  codigo:              string
  descripcion:         string
  unidad:              string
  proveedor_ordinario: string | null
  valor_unitario:      number | null
  cantPorRQ:           Record<string, number>
  itemsPorRQ:          Record<string, { item_id: string; numero_factura: string | null; precio_real: number | null; proveedor_factura: string | null }>
  total_solicitado:    number
  total_estimado:      number
}

// ── OC review types ──────────────────────────────────────────────────────────
type OCMatchedItem = {
  insumo:            InsumoConRQs
  pdfDesc:           string
  cantidad_oc:       number
  total_oc:          number
  valor_unitario_oc: number
  diferencia_unit:   number | null  // oc - sistema (positivo = sobrecosto)
}

type OCReview = {
  oc:            OCParseResult
  matched:       OCMatchedItem[]
  unmatched_pdf: string[]  // PDF descriptions with no system match
}

function TotalTabla({ rows, categoria }: { rows: InformeRow[]; categoria: CategoriaInsumo }) {
  const qc = useQueryClient()

  // ── Data derivation ────────────────────────────────────────────────────────
  const rqCols: RQCol[] = useMemo(() => {
    const seen = new Map<string, RQCol>()
    for (const r of rows) {
      if (r.categoria !== categoria || Number(r.solicitado ?? 0) <= 0) continue
      if (!seen.has(r.rq_id))
        seen.set(r.rq_id, { rq_id: r.rq_id, numero_rq: r.numero_rq, lugar: r.lugar, lote: r.lote })
    }
    return Array.from(seen.values()).sort((a, b) => a.lugar.localeCompare(b.lugar) || a.numero_rq - b.numero_rq)
  }, [rows, categoria])

  // numero_rq → rq_id (for OC RQ filtering)
  const rqByNumero = useMemo(() => new Map(rqCols.map((r) => [r.numero_rq, r.rq_id])), [rqCols])

  const insumos: InsumoConRQs[] = useMemo(() => {
    const map = new Map<string, InsumoConRQs>()
    for (const r of rows) {
      if (r.categoria !== categoria || Number(r.solicitado ?? 0) <= 0) continue
      if (!map.has(r.insumo_id)) {
        map.set(r.insumo_id, {
          insumo_id:           r.insumo_id,
          codigo:              r.codigo,
          descripcion:         r.descripcion,
          unidad:              r.unidad,
          proveedor_ordinario: r.proveedor_ordinario,
          valor_unitario:      r.valor_unitario != null ? Number(r.valor_unitario) : null,
          cantPorRQ:           {},
          itemsPorRQ:          {},
          total_solicitado:    0,
          total_estimado:      0,
        })
      }
      const entry = map.get(r.insumo_id)!
      const cant  = Number(r.solicitado ?? 0)
      entry.cantPorRQ[r.rq_id]  = cant
      entry.itemsPorRQ[r.rq_id] = {
        item_id:           r.item_id,
        numero_factura:    r.numero_factura,
        precio_real:       r.precio_real != null ? Number(r.precio_real) : null,
        proveedor_factura: r.proveedor_factura,
      }
      entry.total_solicitado += cant
      if (r.valor_unitario != null) entry.total_estimado += cant * Number(r.valor_unitario)
    }
    return Array.from(map.values()).sort((a, b) => a.codigo.localeCompare(b.codigo))
  }, [rows, categoria])

  // ── OC number manual edit state ───────────────────────────────────────────
  const [ocNums,   setOcNums]   = useState<Record<string, string>>({})
  const [savingOC, setSavingOC] = useState<Record<string, boolean>>({})

  // ── Proveedor filter ──────────────────────────────────────────────────────
  const [filtroProveedor, setFiltroProveedor] = useState<string>('')

  useEffect(() => { setFiltroProveedor('') }, [categoria])

  const proveedores = useMemo(() => {
    const set = new Set<string>()
    for (const ins of insumos) { if (ins.proveedor_ordinario) set.add(ins.proveedor_ordinario) }
    return Array.from(set).sort()
  }, [insumos])

  const insumosFiltrados = useMemo(
    () => filtroProveedor ? insumos.filter((ins) => ins.proveedor_ordinario === filtroProveedor) : insumos,
    [insumos, filtroProveedor],
  )

  useEffect(() => {
    setOcNums((prev) => {
      const next = { ...prev }
      for (const ins of insumos) {
        if (!(ins.insumo_id in next)) {
          next[ins.insumo_id] =
            Object.values(ins.itemsPorRQ).find((i) => i.numero_factura)?.numero_factura ?? ''
        }
      }
      return next
    })
  }, [insumos])

  async function saveOC(insumo: InsumoConRQs, value: string, rqIds?: string[]) {
    setSavingOC((prev) => ({ ...prev, [insumo.insumo_id]: true }))
    const entries = rqIds
      ? Object.entries(insumo.itemsPorRQ).filter(([id]) => rqIds.includes(id))
      : Object.entries(insumo.itemsPorRQ)
    try {
      await Promise.all(
        entries.map(([rq_id, item]) =>
          api.patch(`/requisiciones/${rq_id}/facturas`, {
            items: [{
              id:                item.item_id,
              numero_factura:    value.trim() || null,
              precio_real:       item.precio_real,
              proveedor_factura: item.proveedor_factura,
            }],
          }),
        ),
      )
      qc.invalidateQueries({ queryKey: ['informe'] })
      toast.success('Orden de compra guardada')
    } catch {
      toast.error('Error al guardar orden de compra')
    } finally {
      setSavingOC((prev) => ({ ...prev, [insumo.insumo_id]: false }))
    }
  }

  // ── PDF OC upload state ───────────────────────────────────────────────────
  const fileInputRef                    = { current: null as HTMLInputElement | null }
  const [parsandoOC,  setParsandoOC]   = useState(false)
  const [reviewing,   setReviewing]    = useState<OCReview[] | null>(null)
  const [confirmando, setConfirmando]  = useState(false)

  async function handleOCFiles(files: FileList) {
    if (!files.length) return
    setParsandoOC(true)
    try {
      const results: OCReview[] = []
      for (const file of Array.from(files)) {
        const oc = await parseOCPdf(file)
        const matched: OCMatchedItem[]  = []
        const unmatched_pdf: string[]  = []

        for (const pdfItem of oc.items) {
          const found = insumos.find((ins) => matchesDesc(pdfItem.descripcion, ins.descripcion))
          if (found) {
            matched.push({
              insumo:            found,
              pdfDesc:           pdfItem.descripcion,
              cantidad_oc:       pdfItem.cantidad,
              total_oc:          pdfItem.total_linea,
              valor_unitario_oc: pdfItem.valor_unitario,
              diferencia_unit:   found.valor_unitario != null
                ? pdfItem.valor_unitario - found.valor_unitario
                : null,
            })
          } else {
            unmatched_pdf.push(pdfItem.descripcion)
          }
        }
        results.push({ oc, matched, unmatched_pdf })
      }
      setReviewing(results)
    } catch (e) {
      toast.error('Error al leer los PDFs')
      console.error(e)
    } finally {
      setParsandoOC(false)
    }
  }

  async function confirmOC() {
    if (!reviewing) return
    setConfirmando(true)
    try {
      for (const rev of reviewing) {
        for (const match of rev.matched) {
          // Only update RQs mentioned in the OC observations (if any)
          const targetIds = rev.oc.rqs_mencionadas.length > 0
            ? rev.oc.rqs_mencionadas
                .map((n) => rqByNumero.get(n))
                .filter((id): id is string => !!id)
            : Object.keys(match.insumo.itemsPorRQ)

          await Promise.all(
            Object.entries(match.insumo.itemsPorRQ)
              .filter(([rq_id]) => targetIds.includes(rq_id))
              .map(([rq_id, item]) =>
                api.patch(`/requisiciones/${rq_id}/facturas`, {
                  items: [{
                    id:                item.item_id,
                    numero_factura:    rev.oc.serial,
                    precio_real:       match.valor_unitario_oc,
                    proveedor_factura: rev.oc.proveedor || item.proveedor_factura,
                  }],
                }),
              ),
          )
          // Sync manual OC field
          setOcNums((prev) => ({ ...prev, [match.insumo.insumo_id]: rev.oc.serial }))
        }
      }
      qc.invalidateQueries({ queryKey: ['informe'] })
      toast.success('Órdenes de compra aplicadas')
      setReviewing(null)
    } catch {
      toast.error('Error al guardar órdenes de compra')
    } finally {
      setConfirmando(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const grandCant = insumosFiltrados.reduce((s, r) => s + r.total_solicitado, 0)
  const grandEst  = insumosFiltrados.reduce((s, r) => s + r.total_estimado,   0)

  if (insumos.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 rounded-xl" style={{ border: '1px dashed var(--color-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-200)' }}>Sin items en {CATEGORIA_LABELS[categoria]}</p>
      </div>
    )
  }

  const thCls = 'px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap'

  return (
    <>
      {/* ── Cargar OC button ── */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-200)' }}>
          Total general · {CATEGORIA_LABELS[categoria]}
        </span>
        {proveedores.length > 0 && (
          <select
            value={filtroProveedor}
            onChange={(e) => setFiltroProveedor(e.target.value)}
            className="text-xs rounded-lg px-2 py-1.5 ml-auto"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-700)', outline: 'none', maxWidth: 260 }}
          >
            <option value="">Todos los proveedores</option>
            {proveedores.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={parsandoOC}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          {parsandoOC ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {parsandoOC ? 'Leyendo PDFs...' : 'Cargar OC (PDF)'}
        </button>
        <input
          ref={(el) => { fileInputRef.current = el }}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleOCFiles(e.target.files)}
        />
      </div>

      {/* ── Pivot table ── */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                <th className={`${thCls} text-left`}  style={{ color: 'var(--color-text-400)' }}>Codigo</th>
                <th className={`${thCls} text-left`}  style={{ color: 'var(--color-text-400)', minWidth: 180 }}>Descripcion</th>
                <th className={`${thCls} text-left`}  style={{ color: 'var(--color-text-400)' }}>Unidad</th>
                <th className={`${thCls} text-left`}  style={{ color: 'var(--color-text-400)', minWidth: 130 }}>Proveedor</th>
                <th className={`${thCls} text-right`} style={{ color: 'var(--color-text-400)' }}>V. Unitario</th>
                {rqCols.map((rq) => (
                  <th key={rq.rq_id} className={`${thCls} text-center`} style={{ color: 'var(--color-text-400)', minWidth: 72 }}>
                    <div style={{ fontSize: 9, fontWeight: 500, lineHeight: 1.3 }}>{rq.lugar} CC{rq.lote}</div>
                    <div style={{ color: 'var(--color-primary)', fontSize: 10, fontWeight: 700 }}>RQ-{rq.numero_rq}</div>
                  </th>
                ))}
                <th className={`${thCls} text-center`} style={{ color: 'var(--color-text-400)' }}>Total</th>
                <th className={`${thCls} text-right`}  style={{ color: 'var(--color-text-400)' }}>Total Est.</th>
                <th className={`${thCls} text-right`}  style={{ color: 'var(--color-text-400)' }}>V. Unit. OC</th>
                <th className={`${thCls} text-right`}  style={{ color: 'var(--color-text-400)' }}>Diferencia</th>
                <th className={`${thCls} text-left`}   style={{ color: 'var(--color-text-400)', minWidth: 160 }}>N° Orden Compra</th>
              </tr>
            </thead>
            <tbody>
              {insumosFiltrados.map((ins, idx) => {
                const precioReal = Object.values(ins.itemsPorRQ).find((i) => i.precio_real != null)?.precio_real ?? null
                const difUnit    = precioReal != null && ins.valor_unitario != null ? precioReal - ins.valor_unitario : null
                return (
                  <tr
                    key={ins.insumo_id}
                    style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}
                  >
                    <td className="px-3 py-2 font-mono text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-400)' }}>{ins.codigo}</td>
                    <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-900)' }}>{ins.descripcion}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-400)' }}>{ins.unidad}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-400)' }}>{ins.proveedor_ordinario ?? '-'}</td>
                    <td className="px-3 py-2 text-xs text-right font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>{formatCOP(ins.valor_unitario)}</td>
                    {rqCols.map((rq) => {
                      const cant = ins.cantPorRQ[rq.rq_id]
                      return (
                        <td key={rq.rq_id} className="px-3 py-2 text-xs text-center font-bold whitespace-nowrap"
                          style={{ color: cant != null ? 'var(--color-text-900)' : 'var(--color-border)' }}>
                          {cant != null ? Math.round(cant) : '-'}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-xs text-center font-bold" style={{ color: 'var(--color-text-900)' }}>
                      {Math.round(ins.total_solicitado)}
                    </td>
                    <td className="px-3 py-2 text-xs text-right whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                      {formatCOP(ins.total_estimado)}
                    </td>
                    <td className="px-3 py-2 text-xs text-right whitespace-nowrap" style={{ color: precioReal != null ? 'var(--color-text-900)' : 'var(--color-border)' }}>
                      {formatCOP(precioReal)}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-bold whitespace-nowrap">
                      {difUnit != null ? (
                        <span style={{ color: difUnit > 0 ? '#dc2626' : difUnit < 0 ? '#16a34a' : 'var(--color-text-200)' }}>
                          {difUnit > 0 ? '+' : ''}{formatCOP(difUnit)}
                        </span>
                      ) : <span style={{ color: 'var(--color-border)' }}>-</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={ocNums[ins.insumo_id] ?? ''}
                          onChange={(e) => setOcNums((prev) => ({ ...prev, [ins.insumo_id]: e.target.value }))}
                          onBlur={(e) => saveOC(ins, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                          placeholder="N° OC"
                          className="w-full rounded-md px-2 py-1 text-xs"
                          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-900)', outline: 'none', minWidth: 110 }}
                        />
                        {savingOC[ins.insumo_id] && (
                          <Loader2 size={11} className="animate-spin shrink-0" style={{ color: 'var(--color-text-400)' }} />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border)' }}>
                <td colSpan={5 + rqCols.length} className="px-3 py-2.5 text-xs font-bold text-right" style={{ color: 'var(--color-text-600)' }}>
                  SUBTOTAL {CATEGORIA_LABELS[categoria].toUpperCase()}{filtroProveedor ? ` · ${filtroProveedor}` : ''}
                </td>
                <td className="px-3 py-2.5 text-xs font-bold text-center whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>
                  {Math.round(grandCant)}
                </td>
                <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap" style={{ color: 'var(--color-text-900)' }}>
                  {formatCOP(grandEst)}
                </td>
                <td colSpan={3} />
              </tr>
              <tr style={{ background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
                <td colSpan={5 + rqCols.length + 1} className="px-3 py-2 text-xs font-semibold text-right" style={{ color: 'var(--color-text-400)' }}>
                  IVA 19%
                </td>
                <td className="px-3 py-2 text-xs font-semibold text-right whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>
                  {formatCOP(grandEst * 0.19)}
                </td>
                <td colSpan={3} />
              </tr>
              <tr style={{ background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
                <td colSpan={5 + rqCols.length + 1} className="px-3 py-3 text-sm font-bold text-right" style={{ color: 'var(--color-text-900)' }}>
                  TOTAL CON IVA
                </td>
                <td className="px-3 py-3 text-sm font-bold text-right whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>
                  {formatCOP(grandEst * 1.19)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── OC Review modal ── */}
      {reviewing && (
        <ModalPortal onClose={() => setReviewing(null)}>
          <div
            className="flex flex-col rounded-2xl w-full max-w-3xl"
            style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', maxHeight: '85vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-900)' }}>
                  Revisión de Órdenes de Compra · {CATEGORIA_LABELS[categoria]}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                  {reviewing.length} PDF{reviewing.length !== 1 ? 's' : ''} cargados
                </p>
              </div>
              <button onClick={() => setReviewing(null)} className="hover:opacity-70" style={{ color: 'var(--color-text-400)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
              {reviewing.map((rev, ri) => (
                <div key={ri}>
                  {/* OC title */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                      OC {rev.oc.serial}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-600)' }}>{rev.oc.proveedor}</span>
                    {rev.oc.rqs_mencionadas.length > 0 && (
                      <span className="text-xs" style={{ color: 'var(--color-text-200)' }}>
                        RQs: {rev.oc.rqs_mencionadas.map((n) => `RQ-${n}`).join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Matched items */}
                  {rev.matched.length > 0 && (
                    <div className="rounded-xl overflow-hidden mb-2" style={{ border: '1px solid var(--color-border)' }}>
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                            {['Insumo (sistema)', 'Cant. OC', 'V.Unit. OC', 'V.Unit. Sistema', 'Diferencia'].map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-400)', fontSize: 10 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rev.matched.map((m, mi) => (
                            <tr key={mi} style={{ borderBottom: '1px solid var(--color-border)', background: mi % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 size={11} style={{ color: '#16a34a', flexShrink: 0 }} />
                                  <span style={{ color: 'var(--color-text-900)', fontWeight: 500 }}>{m.insumo.descripcion}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center font-bold" style={{ color: 'var(--color-text-900)' }}>{Math.round(m.cantidad_oc)}</td>
                              <td className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--color-text-900)' }}>{formatCOP(m.valor_unitario_oc)}</td>
                              <td className="px-3 py-2 text-right" style={{ color: 'var(--color-text-600)' }}>{formatCOP(m.insumo.valor_unitario)}</td>
                              <td className="px-3 py-2 text-right font-bold">
                                {m.diferencia_unit != null ? (
                                  <span style={{ color: m.diferencia_unit > 0 ? '#dc2626' : m.diferencia_unit < 0 ? '#16a34a' : 'var(--color-text-200)' }}>
                                    {m.diferencia_unit > 0 ? '+' : ''}{formatCOP(m.diferencia_unit)}
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Unmatched from PDF */}
                  {rev.unmatched_pdf.length > 0 && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
                      <AlertTriangle size={13} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#b45309' }}>Sin coincidencia en el sistema:</p>
                        {rev.unmatched_pdf.map((d, i) => (
                          <p key={i} className="text-xs mt-0.5" style={{ color: '#92400e' }}>{d}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* System insumos without any OC */}
              {(() => {
                const matched_ids = new Set(reviewing.flatMap((r) => r.matched.map((m) => m.insumo.insumo_id)))
                const sinOC = insumos.filter((ins) => !matched_ids.has(ins.insumo_id))
                if (sinOC.length === 0) return null
                return (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(107,114,128,0.06)', border: '1px solid var(--color-border)' }}>
                    <AlertTriangle size={13} style={{ color: 'var(--color-text-200)', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-text-400)' }}>Insumos sin OC en estos PDFs:</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-200)' }}>{sinOC.map((i) => i.descripcion).join(' · ')}</p>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setReviewing(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-70 transition-opacity"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmOC}
                disabled={confirmando || reviewing.every((r) => r.matched.length === 0)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                {confirmando && <Loader2 size={12} className="animate-spin" />}
                Confirmar y guardar
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
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
    () => plantaRows.reduce((s, r) => r.solicitado != null && r.valor_unitario != null ? s + Number(r.solicitado) * Number(r.valor_unitario) : s, 0),
    [plantaRows],
  )
  const totalReal = useMemo(
    () => plantaRows.reduce((s, r) => {
      if (r.solicitado == null || r.precio_real == null) return s
      return s + Number(r.solicitado) * Number(r.precio_real)
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
      estimado  = rows.reduce((s, r) => r.solicitado != null && r.valor_unitario != null ? s + Number(r.solicitado) * Number(r.valor_unitario) : s, 0)
      facturado = rows.reduce((s, r) => r.solicitado != null && r.precio_real != null ? s + Number(r.solicitado) * Number(r.precio_real) : s, 0)
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

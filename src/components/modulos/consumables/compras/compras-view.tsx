'use client'

import { useState } from 'react'
import {
  ShoppingCart, Package, FileText,
  Plus, Search, Loader2, Trash2, AlertTriangle, ChevronLeft, ChevronRight,
  XCircle, Lock, Bell, Clock,
} from 'lucide-react'
import { useInsumos, useCreateInsumo, useDeleteInsumo, useCerrarMes, usePeriodosCerrados, useBorradores, useGuardarBorrador } from '@/src/hooks/consumables/use-insumos'
import { useRequisiciones, useRequisicion, useCambiarEstadoRQ } from '@/src/hooks/consumables/use-requisiciones'
import { InsumoModal } from '@/src/components/modulos/consumables/insumos/insumo-modal'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { CATEGORIAS, CATEGORIA_LABELS, ESTADO_COLORS, ESTADO_LABELS } from '@/src/types/consumables.types'
import type { Insumo, CategoriaInsumo, CerrarMesResult, InsumoBorrador } from '@/src/types/consumables.types'

// Override CSS variables for light-mode-safe rendering on a public page
const CSS_VARS: React.CSSProperties = {
  '--color-surface-0':   '#ffffff',
  '--color-surface-1':   '#f8fafc',
  '--color-surface-2':   '#f1f5f9',
  '--color-surface-3':   '#e4eaf2',
  '--color-border':      '#d1d5db',
  '--color-text-900':    '#111827',
  '--color-text-700':    '#374151',
  '--color-text-600':    '#4b5563',
  '--color-text-400':    '#9ca3af',
  '--color-primary':     '#1a6b6b',
  '--color-primary-muted': 'rgba(26,107,107,0.08)',
  '--color-secundary':   '#1a3a3a',
  '--color-secondary':   '#1a6b6b',
  '--color-danger':      '#dc2626',
  '--color-danger-bg':   '#fef2f2',
} as React.CSSProperties

function formatCOP(value: number | null) {
  if (value === null) return '-'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}

// ── Delete confirm overlay ──────────────────────────────────────────────────
function DeleteConfirm({ insumo, onClose }: { insumo: Insumo; onClose: () => void }) {
  const del = useDeleteInsumo()
  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-sm rounded-xl overflow-hidden bg-white"
        style={{ border: '1px solid #d1d5db', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <AlertTriangle size={22} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h3 className="font-semibold text-base text-gray-900">Eliminar insumo</h3>
            <p className="text-sm mt-1 text-gray-500">{insumo.codigo} - {insumo.descripcion}</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ background: '#f1f5f9', border: '1px solid #d1d5db', color: '#4b5563' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => del.mutate(insumo.id, { onSuccess: onClose })}
            disabled={del.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#ef4444', color: '#fff', opacity: del.isPending ? 0.75 : 1 }}
          >
            {del.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {del.isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Borrador modal ─────────────────────────────────────────────────────────
function BorradorModal({
  insumo,
  borrador,
  mes,
  anio,
  onClose,
}: {
  insumo: Insumo
  borrador: InsumoBorrador | undefined
  mes: number
  anio: number
  onClose: () => void
}) {
  const save = useGuardarBorrador()

  const [valorUnitario, setValorUnitario] = useState(
    borrador?.valor_unitario != null
      ? String(borrador.valor_unitario)
      : insumo.valor_unitario != null
      ? String(insumo.valor_unitario)
      : ''
  )
  const [provOrd, setProvOrd] = useState(borrador?.proveedor_ordinario ?? insumo.proveedor_ordinario ?? '')
  const [provExt, setProvExt] = useState(borrador?.proveedor_extraordinario ?? insumo.proveedor_extraordinario ?? '')
  const [activo,  setActivo]  = useState<boolean>(borrador?.activo ?? insumo.activo)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    save.mutate(
      {
        id: insumo.id,
        mes,
        anio,
        valor_unitario:           valorUnitario !== '' ? Number(valorUnitario) : null,
        proveedor_ordinario:      provOrd || null,
        proveedor_extraordinario: provExt || null,
        activo,
      },
      { onSuccess: onClose },
    )
  }

  const INPUT: React.CSSProperties = {
    border: '1.5px solid #d1d5db', borderRadius: '8px',
    background: '#fff', color: '#111827', outline: 'none',
    padding: '10px 14px', fontSize: '13px', width: '100%',
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-sm rounded-xl overflow-hidden bg-white"
        style={{ border: '1px solid #d1d5db', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-gray-400">{insumo.codigo}</p>
              <h3 className="font-semibold text-sm text-gray-900 mt-0.5 leading-snug">{insumo.descripcion}</h3>
            </div>
            {borrador && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                style={{ background: 'rgba(234,179,8,0.12)', color: '#92400e' }}
              >
                Pendiente
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Los cambios se aplicaran al cerrar {MESES[mes - 1]} {anio}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Valor unitario (COP)</label>
              <input
                type="number"
                min="0"
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value)}
                placeholder="Sin valor"
                style={INPUT}
              />
              {insumo.valor_unitario != null && String(insumo.valor_unitario) !== valorUnitario && (
                <p className="text-xs text-gray-400">Actual: {formatCOP(insumo.valor_unitario)}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Proveedor ordinario</label>
              <input
                type="text"
                value={provOrd}
                onChange={(e) => setProvOrd(e.target.value)}
                placeholder="Sin proveedor"
                style={INPUT}
              />
              {insumo.proveedor_ordinario && insumo.proveedor_ordinario !== provOrd && (
                <p className="text-xs text-gray-400">Actual: {insumo.proveedor_ordinario}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Proveedor extraordinario</label>
              <input
                type="text"
                value={provExt}
                onChange={(e) => setProvExt(e.target.value)}
                placeholder="Sin proveedor"
                style={INPUT}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Estado</label>
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#f1f5f9' }}>
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setActivo(val)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={
                      activo === val
                        ? { background: '#fff', color: val ? '#16a34a' : '#dc2626', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
                        : { color: '#9ca3af' }
                    }
                  >
                    {val ? 'Activo' : 'Inactivo'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid #e5e7eb' }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ background: '#f1f5f9', border: '1px solid #d1d5db', color: '#4b5563' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
              style={{ background: '#1a6b6b', opacity: save.isPending ? 0.75 : 1 }}
            >
              {save.isPending && <Loader2 size={14} className="animate-spin" />}
              {save.isPending ? 'Guardando...' : 'Guardar borrador'}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  )
}

// ── Cerrar mes modal ───────────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function CerrarMesModal({ mes, anio, onClose }: { mes: number; anio: number; onClose: () => void }) {
  const cerrar = useCerrarMes()
  const { data: periodos = [] } = usePeriodosCerrados()
  const [result, setResult] = useState<CerrarMesResult | null>(null)

  const yaCerrado = periodos.some((p) => p.mes === mes && p.anio === anio)

  if (result) {
    return (
      <ModalPortal onClose={onClose}>
        <div
          className="w-full max-w-sm rounded-xl overflow-hidden bg-white"
          style={{ border: '1px solid #d1d5db', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Bell size={22} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <p className="font-semibold text-base text-gray-900">Notificacion enviada</p>
              <p className="text-sm mt-1 text-gray-500">
                {result.notificados} encargado{result.notificados !== 1 ? 's' : ''} notificado{result.notificados !== 1 ? 's' : ''}
              </p>
            </div>
            {result.usuarios.length > 0 && (
              <ul className="w-full text-left text-sm text-gray-700 flex flex-col gap-1">
                {result.usuarios.map((u) => (
                  <li key={u} className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">{u}</li>
                ))}
              </ul>
            )}
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white mt-2"
              style={{ background: '#1a6b6b' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </ModalPortal>
    )
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-sm rounded-xl overflow-hidden bg-white"
        style={{ border: '1px solid #d1d5db', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(26,107,107,0.1)' }}>
            <Bell size={22} style={{ color: '#1a6b6b' }} />
          </div>
          <div>
            <h3 className="font-semibold text-base text-gray-900">Cerrar {MESES[mes - 1]} {anio}</h3>
            <p className="text-sm mt-1 text-gray-500">
              Se aplicaran los cambios pendientes y se notificara a los encargados que el catalogo esta listo.
            </p>
          </div>
          {yaCerrado && (
            <div
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}
            >
              <XCircle size={14} className="shrink-0" />
              {MESES[mes - 1]} {anio} ya fue cerrado. No se puede cerrar dos veces.
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ background: '#f1f5f9', border: '1px solid #d1d5db', color: '#4b5563' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => cerrar.mutate({ mes, anio }, { onSuccess: (data) => setResult(data) })}
            disabled={cerrar.isPending || yaCerrado}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
            style={{ background: yaCerrado ? '#9ca3af' : '#1a6b6b', opacity: cerrar.isPending ? 0.75 : 1, cursor: yaCerrado ? 'not-allowed' : 'pointer' }}
          >
            {cerrar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            {cerrar.isPending ? 'Cerrando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Insumos tab with borrador system ───────────────────────────────────────
function InsumosComprasTab() {
  const now = new Date()
  const [mes,           setMes]          = useState(now.getMonth() + 1)
  const [anio,          setAnio]         = useState(now.getFullYear())
  const [showCerrarMes, setShowCerrarMes] = useState(false)
  const [categoria,     setCategoria]    = useState<CategoriaInsumo | ''>('')
  const [search,        setSearch]       = useState('')
  const [activoFilter,  setActivoFilter] = useState<boolean | undefined>(undefined)
  const [page,          setPage]         = useState(1)
  const [showCreate,    setShowCreate]   = useState(false)
  const [editInsumo,    setEditInsumo]   = useState<Insumo | null>(null)
  const [deleteInsumo,  setDeleteInsumo] = useState<Insumo | null>(null)

  function adjustPeriod(delta: number) {
    let m = mes + delta, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  function resetPage() { setPage(1) }

  const { data, isLoading } = useInsumos({
    categoria: categoria || undefined,
    search:    search    || undefined,
    activo:    activoFilter,
    page,
  })
  const { data: borradores = [] } = useBorradores(mes, anio)
  const borradorMap = new Map(borradores.map((b) => [b.insumo_id, b]))

  const insumos = data?.data  ?? []
  const total   = data?.total ?? 0
  const pages   = data?.pages ?? 1

  return (
    <div className="flex flex-col gap-4">
      {/* Period nav + Cerrar mes */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-1 rounded-lg px-2 py-1.5"
          style={{ border: '1px solid #d1dede', background: '#fff' }}
        >
          <button
            onClick={() => adjustPeriod(-1)}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: '#1a3a3a' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-[#1a3a3a] px-2 min-w-32 text-center">
            {MESES[mes - 1]} {anio}
          </span>
          <button
            onClick={() => adjustPeriod(1)}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: '#1a3a3a' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <button
          onClick={() => setShowCerrarMes(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: '#1a3a3a', color: '#fff' }}
        >
          <Bell size={15} /> Cerrar mes
        </button>
      </div>

      {/* Pending changes banner */}
      {borradores.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', color: '#92400e' }}
        >
          <Clock size={13} className="shrink-0" />
          {borradores.length} cambio{borradores.length !== 1 ? 's' : ''} pendiente{borradores.length !== 1 ? 's' : ''} para {MESES[mes - 1]} {anio} — se aplicaran al cerrar el mes
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage() }}
            placeholder="Buscar por codigo, descripcion o proveedor..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ border: '1.5px solid #d1d5db', background: '#fff', color: '#111827' }}
            onFocus={(e) => { e.target.style.borderColor = '#1a6b6b' }}
            onBlur={(e)  => { e.target.style.borderColor = '#d1d5db' }}
          />
        </div>

        <select
          value={categoria}
          onChange={(e) => { setCategoria(e.target.value as CategoriaInsumo | ''); resetPage() }}
          className="px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{ border: '1.5px solid #d1d5db', background: '#fff', color: '#111827', minWidth: 140 }}
        >
          <option value="">Todas las categorias</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>)}
        </select>

        <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#f1f5f9' }}>
          {([undefined, true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => { setActivoFilter(val); resetPage() }}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={
                activoFilter === val
                  ? { background: '#fff', color: '#1a3a3a', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
                  : { color: '#9ca3af' }
              }
            >
              {val === undefined ? 'Todos' : val ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: '#1a6b6b', color: '#fff' }}
        >
          <Plus size={15} /> Nuevo insumo
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin text-[#1a6b6b]" />
        </div>
      ) : insumos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl bg-white" style={{ border: '1px dashed #d1d5db' }}>
          <Package size={28} className="mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">Sin insumos</p>
          <p className="text-xs mt-1 text-gray-400">Agrega el primer insumo al catalogo</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #d1d5db' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a3a3a] text-white">
                  {['Codigo', 'Descripcion', 'Unidad', 'Valor Unitario', 'Categoria', 'Proveedor Ord.', 'Estado', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {insumos.map((insumo, idx) => {
                  const b = borradorMap.get(insumo.id)
                  const valorDisplay  = b?.valor_unitario  != null ? b.valor_unitario  : insumo.valor_unitario
                  const valorChanged  = b != null && b.valor_unitario  != null
                  const provDisplay   = b?.proveedor_ordinario != null ? b.proveedor_ordinario : insumo.proveedor_ordinario
                  const provChanged   = b != null && b.proveedor_ordinario != null
                  const activoDisplay = b?.activo != null ? b.activo : insumo.activo
                  const activoChanged = b != null && b.activo != null

                  return (
                    <tr
                      key={insumo.id}
                      className="hover:opacity-90 transition-opacity cursor-pointer"
                      style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}
                      onClick={() => setEditInsumo(insumo)}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-500">{insumo.codigo}</td>
                      <td className="px-4 py-3 font-medium max-w-48 truncate text-gray-900">{insumo.descripcion}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{insumo.unidad}</td>
                      <td
                        className="px-4 py-3 text-xs font-semibold text-right"
                        style={{ color: valorChanged ? '#d97706' : '#111827' }}
                      >
                        {formatCOP(valorDisplay)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {CATEGORIA_LABELS[insumo.categoria]}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: provChanged ? '#d97706' : '#6b7280' }}
                      >
                        {provDisplay ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: activoDisplay ? `${ESTADO_COLORS.COMPLETADA}22` : `${ESTADO_COLORS.ABIERTA}22`,
                            color:      activoChanged ? '#d97706' : (activoDisplay ? ESTADO_COLORS.COMPLETADA : ESTADO_COLORS.ABIERTA),
                          }}
                        >
                          {activoDisplay ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {b && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#f59e0b' }} />}
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteInsumo(insumo) }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 flex items-center justify-between gap-3" style={{ borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
            <span className="text-xs text-gray-400">{total} insumo{total !== 1 ? 's' : ''}</span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-md flex items-center justify-center border border-gray-200 bg-white text-gray-500 transition-opacity"
                  style={{ opacity: page === 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-medium text-gray-600">{page} / {pages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="w-7 h-7 rounded-md flex items-center justify-center border border-gray-200 bg-white text-gray-500 transition-opacity"
                  style={{ opacity: page === pages ? 0.4 : 1 }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <InsumoModal insumo={null} onClose={() => setShowCreate(false)} />
      )}
      {editInsumo && (
        <BorradorModal
          insumo={editInsumo}
          borrador={borradorMap.get(editInsumo.id)}
          mes={mes}
          anio={anio}
          onClose={() => setEditInsumo(null)}
        />
      )}
      {deleteInsumo && (
        <DeleteConfirm insumo={deleteInsumo} onClose={() => setDeleteInsumo(null)} />
      )}
      {showCerrarMes && (
        <CerrarMesModal mes={mes} anio={anio} onClose={() => setShowCerrarMes(false)} />
      )}
    </div>
  )
}

// ── Detalle RQ compras ─────────────────────────────────────────────────────
function ComprasDetailModal({ rqId, onClose }: { rqId: string; onClose: () => void }) {
  const { data: rq, isLoading } = useRequisicion(rqId)

  if (isLoading) {
    return (
      <ModalPortal onClose={onClose}>
        <div
          className="w-full max-w-6xl rounded-xl flex items-center justify-center py-24 bg-white"
          style={{ border: '1px solid #d1d5db', boxShadow: '0 24px 64px rgba(4,24,24,0.25)' }}
        >
          <Loader2 size={24} className="animate-spin text-[#1a6b6b]" />
        </div>
      </ModalPortal>
    )
  }

  if (!rq) return null

  const estadoColor = ESTADO_COLORS[rq.estado] ?? '#6b7280'

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-6xl rounded-xl overflow-hidden flex flex-col bg-white"
        style={{ border: '1px solid #d1d5db', boxShadow: '0 24px 64px rgba(4,24,24,0.25)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base text-gray-900">RQ #{rq.numero_rq}</h3>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${estadoColor}22`, color: estadoColor }}
              >
                {ESTADO_LABELS[rq.estado]}
              </span>
            </div>
            <p className="text-xs mt-0.5 text-gray-400">
              {CATEGORIA_LABELS[rq.categoria]} &middot; CC {rq.lote} &middot; {rq.lugar}
              {rq.nombre_solicitante && ` · ${rq.nombre_solicitante}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg font-medium shrink-0"
            style={{ background: '#f1f5f9', color: '#4b5563' }}
          >
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a3a3a] text-white">
                  {['Codigo', 'Descripcion', 'Unidad', 'Proveedor Ord.', 'Proveedor Ext.', 'V. Unitario', 'Solicitado', 'Total'].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rq.items.map((item, idx) => {
                  const itemTotal = item.valor_unitario != null && item.solicitado != null
                    ? item.valor_unitario * item.solicitado
                    : null
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gray-500">{item.codigo}</td>
                      <td className="px-3 py-2.5 text-xs font-medium text-gray-900">{item.descripcion}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{item.unidad}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{item.proveedor_ordinario ?? '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{item.proveedor_extraordinario ?? '-'}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-right text-gray-900">
                        {item.valor_unitario != null ? formatCOP(item.valor_unitario) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-center font-bold text-gray-900">
                        {item.solicitado ?? '-'}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-right text-gray-900">
                        {itemTotal != null ? formatCOP(itemTotal) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f3f4f6', borderTop: '2px solid #e5e7eb' }}>
                  <td colSpan={7} className="px-3 py-3 text-xs font-bold text-right text-gray-700">
                    TOTAL ESTIMADO
                  </td>
                  <td className="px-3 py-3 text-sm font-bold text-right" style={{ color: '#1a3a3a' }}>
                    {formatCOP(rq.items.reduce((sum, item) => {
                      if (item.valor_unitario == null || item.solicitado == null) return sum
                      return sum + item.valor_unitario * item.solicitado
                    }, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Requisiciones compras tab ──────────────────────────────────────────────
function RQsComprasTab() {
  const now = new Date()
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())

  function adjustPeriod(delta: number) {
    let m = mes + delta, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  const { data: requisiciones = [], isLoading } = useRequisiciones({ mes, anio })
  const cambiar = useCambiarEstadoRQ()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const rqs = Array.isArray(requisiciones) ? requisiciones : []

  const BADGE_COLORS: Record<string, string> = {
    ABIERTA: '#6b7280', COMPLETADA: '#22c55e', APROBADA: '#3b82f6',
    PEDIDO_REALIZADO: '#f59e0b', EN_BODEGA: '#0891b2', ENTREGADO: '#16a34a', PENDIENTE: '#f59e0b',
  }
  const BADGE_LABELS: Record<string, string> = {
    ABIERTA: 'Abierta', COMPLETADA: 'Completada', APROBADA: 'Aprobada',
    PEDIDO_REALIZADO: 'Pedido realizado', EN_BODEGA: 'En bodega', ENTREGADO: 'Entregado', PENDIENTE: 'Pendiente',
  }
  const NEXT_ESTADO: Record<string, string> = {
    APROBADA: 'PEDIDO_REALIZADO', PEDIDO_REALIZADO: 'EN_BODEGA', EN_BODEGA: 'ENTREGADO',
  }
  const NEXT_LABEL: Record<string, string> = {
    APROBADA: 'Pedido realizado', PEDIDO_REALIZADO: 'Confirmar en bodega', EN_BODEGA: 'Confirmar entrega',
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-1 rounded-lg px-2 py-1.5"
          style={{ border: '1px solid #d1dede', background: '#fff' }}
        >
          <button
            onClick={() => adjustPeriod(-1)}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: '#1a3a3a' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-[#1a3a3a] px-2 min-w-32 text-center">
            {MESES[mes - 1]} {anio}
          </span>
          <button
            onClick={() => adjustPeriod(1)}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: '#1a3a3a' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <p className="text-xs text-gray-400">{rqs.length} requisicion{rqs.length !== 1 ? 'es' : ''}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin text-[#1a6b6b]" />
        </div>
      ) : rqs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl bg-white" style={{ border: '1px dashed #d1d5db' }}>
          <FileText size={28} className="mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">Sin requisiciones</p>
          <p className="text-xs mt-1 text-gray-400">Aun no se han generado requisiciones</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #d1d5db' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a3a3a] text-white">
                  {['Numero RQ', 'Categoria', 'C. Costo', 'Lugar', 'Estado', 'Fecha', 'Acciones'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rqs.map((rq, idx) => {
                  const color      = BADGE_COLORS[rq.estado] ?? '#6b7280'
                  const nextEstado = NEXT_ESTADO[rq.estado]
                  return (
                    <tr
                      key={rq.id}
                      style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}
                    >
                      <td className="px-4 py-3 font-bold text-gray-900">#{rq.numero_rq}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {CATEGORIA_LABELS[rq.categoria]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{rq.lote}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 max-w-36 truncate">{rq.lugar}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${color}22`, color }}
                        >
                          {BADGE_LABELS[rq.estado] ?? rq.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(rq.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedId(rq.id)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-70 transition-opacity"
                            style={{ background: '#f1f5f9', border: '1px solid #e5e7eb', color: '#374151' }}
                          >
                            Ver
                          </button>
                          {nextEstado && (
                            <button
                              onClick={() => cambiar.mutate({ id: rq.id, estado: nextEstado as any })}
                              disabled={cambiar.isPending}
                              className="text-xs px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                              style={{ background: '#1a6b6b', color: '#fff', opacity: cambiar.isPending ? 0.7 : 1 }}
                            >
                              {NEXT_LABEL[rq.estado]}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedId && <ComprasDetailModal rqId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

// ── Main ComprasView ────────────────────────────────────────────────────────
interface Props {
  valid: boolean
}

type Tab = 'insumos' | 'requisiciones'

export function ComprasView({ valid }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('insumos')

  if (!valid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f0f4f4] px-6 text-center">
        <Lock size={40} className="text-gray-400" />
        <p className="text-lg font-semibold text-[#1a3a3a]">Enlace no valido</p>
        <p className="text-sm text-gray-500">Este enlace no existe o ha expirado.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f4f4] py-8 px-4" style={CSS_VARS}>
      <div className="max-w-6xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="rounded-2xl bg-white border border-[#d1dede] p-5 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#1a6b6b' }}>
            <ShoppingCart size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#1a6b6b] mb-0.5">
              Panel de Gestion
            </p>
            <h1 className="text-xl font-bold text-[#1a3a3a]">Area de Compras</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gestion de insumos y visualizacion de requisiciones
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#e4eaf2' }}>
          {([
            { id: 'insumos'       as Tab, label: 'Insumos',      icon: Package  },
            { id: 'requisiciones' as Tab, label: 'Requisiciones', icon: FileText },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={
                activeTab === id
                  ? { background: '#fff', color: '#1a3a3a', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
                  : { color: '#9ca3af' }
              }
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="animate-fade-in">
          {activeTab === 'insumos'       && <InsumosComprasTab />}
          {activeTab === 'requisiciones' && <RQsComprasTab />}
        </div>
      </div>
    </div>
  )
}

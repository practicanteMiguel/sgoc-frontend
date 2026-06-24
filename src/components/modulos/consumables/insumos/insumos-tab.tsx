'use client'

import { useState } from 'react'
import { Search, Loader2, Package, ChevronLeft, ChevronRight, GitCompare, ArrowRight, CheckCircle2, Send, Bell } from 'lucide-react'
import { useInsumos, useCambiosInsumos, usePeriodosCerrados } from '@/src/hooks/consumables/use-insumos'
import { formatCOP } from '@/src/lib/utils'
import { useEnviarPlantillas, useSolicitudes } from '@/src/hooks/consumables/use-solicitudes'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { CATEGORIAS, CATEGORIA_LABELS, ESTADO_COLORS } from '@/src/types/consumables.types'
import type { Insumo, CategoriaInsumo, CambioInsumo, EnviarPlantillasResult } from '@/src/types/consumables.types'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CAMPO_LABELS: Record<string, string> = {
  valor_unitario:          'Valor unitario',
  proveedor_ordinario:     'Proveedor ordinario',
  proveedor_extraordinario:'Proveedor extraordinario',
  activo:                  'Estado',
  descripcion:             'Descripcion',
  unidad:                  'Unidad',
}


function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

function updatedThisMonth(insumo: Insumo, mes: number, anio: number) {
  if (!insumo.updated_at) return false
  const d = new Date(insumo.updated_at)
  return d.getMonth() + 1 === mes && d.getFullYear() === anio
}

function formatValor(campo: string, valor: string | number | null): string {
  if (valor === null || valor === undefined || valor === '') return 'Sin valor'
  if (campo === 'valor_unitario') {
    const n = typeof valor === 'number' ? valor : Number(valor)
    return isNaN(n) ? String(valor) : formatCOP(n)
  }
  if (campo === 'activo') return valor ? 'Activo' : 'Inactivo'
  return String(valor)
}

// ── Modal de cambios del mes ─────────────────────────────────────────────────
function CambiosModal({ mes, anio, onClose }: { mes: number; anio: number; onClose: () => void }) {
  const { data: cambios = [], isLoading } = useCambiosInsumos(mes, anio, true)

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-xl rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 24px 64px rgba(4,24,24,0.25)',
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--color-text-900)' }}>
              Cambios de {MESES[mes - 1]} {anio}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              Comparado con el mes anterior
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
          >
            Cerrar
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : cambios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle2 size={32} style={{ color: '#22c55e' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                Todo sigue igual
              </p>
              <p className="text-xs text-center" style={{ color: 'var(--color-text-400)' }}>
                No hubo cambios en el catalogo durante {MESES[mes - 1]} {anio}
              </p>
            </div>
          ) : (
            cambios.map((item: CambioInsumo) => (
              <div
                key={item.id}
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--color-border)' }}
              >
                {/* Insumo header */}
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}
                >
                  <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-text-400)' }}>
                    {item.codigo}
                  </span>
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>
                    {item.descripcion}
                  </span>
                </div>

                {/* Cambios */}
                <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {item.cambios.map((c, i) => (
                    <div key={i} className="px-4 py-3 flex items-start gap-3">
                      <span
                        className="text-xs font-semibold shrink-0 mt-0.5 px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', minWidth: 130 }}
                      >
                        {CAMPO_LABELS[c.campo] ?? c.campo}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span
                          className="text-xs px-2 py-1 rounded-lg font-medium line-through"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}
                        >
                          {formatValor(c.campo, c.anterior)}
                        </span>
                        <ArrowRight size={12} className="shrink-0" style={{ color: 'var(--color-text-400)' }} />
                        <span
                          className="text-xs px-2 py-1 rounded-lg font-semibold"
                          style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}
                        >
                          {formatValor(c.campo, c.nuevo)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Modal enviar plantillas ──────────────────────────────────────────────────
function EnviarPlantillasModal({ mes, anio, onClose }: { mes: number; anio: number; onClose: () => void }) {
  const enviar = useEnviarPlantillas()
  const [result, setResult] = useState<EnviarPlantillasResult | null>(null)

  if (result) {
    return (
      <ModalPortal onClose={onClose}>
        <div
          className="w-full max-w-md rounded-xl overflow-hidden flex flex-col"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.25)', maxHeight: '80vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-5 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Bell size={22} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <p className="font-semibold text-base" style={{ color: 'var(--color-text-900)' }}>
                Plantillas enviadas
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-400)' }}>
                {result.enviadas} planta{result.enviadas !== 1 ? 's' : ''} notificada{result.enviadas !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {result.solicitudes.length > 0 && (
            <div className="overflow-y-auto flex-1 px-6 pb-4 flex flex-col gap-2">
              {result.solicitudes.map((s) => {
                const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/consumables/solicitudes/${s.id}`
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg"
                    style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-900)' }}>{s.lugar}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>CC {s.lote}</p>
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 hover:opacity-80 transition-opacity"
                      style={{ background: 'var(--color-primary)', color: '#fff' }}
                    >
                      Ver
                    </a>
                  </div>
                )
              })}
            </div>
          )}
          <div className="px-6 pb-5 pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--color-primary)' }}
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
        className="w-full max-w-sm rounded-xl overflow-hidden"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(26,107,107,0.1)' }}>
            <Send size={22} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--color-text-900)' }}>
              Enviar plantilla de {MESES[mes - 1]} {anio}
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-400)' }}>
              Cada planta activa recibira la lista de insumos del mes con el campo &quot;solicitado&quot; en blanco para que indiquen sus necesidades.
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => enviar.mutate({ mes, anio }, { onSuccess: (data) => setResult(data) })}
            disabled={enviar.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
            style={{ background: 'var(--color-primary)', color: '#fff', opacity: enviar.isPending ? 0.75 : 1 }}
          >
            {enviar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {enviar.isPending ? 'Enviando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Tab principal ─────────────────────────────────────────────────────────────
export function InsumosTab() {
  const now  = new Date()
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())

  const [categoria,    setCategoria]    = useState<CategoriaInsumo | ''>('')
  const [search,       setSearch]       = useState('')
  const [activoFilter, setActivoFilter] = useState<boolean | undefined>(undefined)
  const [page,         setPage]         = useState(1)
  const [showCambios,  setShowCambios]  = useState(false)
  const [showEnviar,   setShowEnviar]   = useState(false)

  const { data: periodos = [] }    = usePeriodosCerrados()
  const { data: solicitudes = [] } = useSolicitudes(mes, anio)
  const yaEnviadas = solicitudes.length > 0

  const nextM = mes === 12 ? 1    : mes + 1
  const nextA = mes === 12 ? anio + 1 : anio
  const canGoNext = periodos.some((p) => p.mes === nextM && p.anio === nextA)

  function resetPage() { setPage(1) }

  function prevMonth() {
    if (mes === 1) { setMes(12); setAnio((a) => a - 1) } else setMes((m) => m - 1)
    resetPage()
  }
  function nextMonth() {
    if (!canGoNext) return
    if (mes === 12) { setMes(1); setAnio((a) => a + 1) } else setMes((m) => m + 1)
    resetPage()
  }

  const { data, isLoading } = useInsumos({
    categoria: categoria || undefined,
    search:    search    || undefined,
    activo:    activoFilter,
    mes,
    anio,
    page,
  })

  const insumos = data?.data  ?? []
  const total   = data?.total ?? 0
  const pages   = data?.pages ?? 1

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-400)' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage() }}
            placeholder="Buscar por codigo, descripcion o proveedor..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
          />
        </div>

        <select
          value={categoria}
          onChange={(e) => { setCategoria(e.target.value as CategoriaInsumo | ''); resetPage() }}
          className="px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)', minWidth: 140 }}
        >
          <option value="" style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}>Todas las categorias</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c} style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}>
              {CATEGORIA_LABELS[c]}
            </option>
          ))}
        </select>

        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          {([undefined, true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => { setActivoFilter(val); resetPage() }}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={
                activoFilter === val
                  ? { background: 'var(--color-surface-0)', color: 'var(--color-secundary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                  : { color: 'var(--color-text-400)' }
              }
            >
              {val === undefined ? 'Todos' : val ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>

        {/* Month navigator + Ver cambios */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-lg px-2 py-1.5"
            style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)' }}
          >
            <button
              onClick={prevMonth}
              className="w-6 h-6 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-400)' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span
              className="text-xs font-semibold px-2 whitespace-nowrap"
              style={{ color: 'var(--color-text-900)', minWidth: 100, textAlign: 'center' }}
            >
              {MESES[mes - 1]} {anio}
            </span>
            <button
              onClick={nextMonth}
              disabled={!canGoNext}
              className="w-6 h-6 flex items-center justify-center rounded transition-opacity"
              style={{ color: 'var(--color-text-400)', opacity: canGoNext ? 1 : 0.3, cursor: canGoNext ? 'pointer' : 'not-allowed' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            onClick={() => setShowCambios(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-surface-2)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-700)' }}
            title="Ver que cambio este mes"
          >
            <GitCompare size={13} />
            Ver cambios
          </button>
          <button
            onClick={() => !yaEnviadas && setShowEnviar(true)}
            disabled={yaEnviadas}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity"
            style={{
              background: yaEnviadas ? 'var(--color-surface-2)' : 'var(--color-primary)',
              color: yaEnviadas ? 'var(--color-text-400)' : '#fff',
              border: yaEnviadas ? '1.5px solid var(--color-border)' : 'none',
              cursor: yaEnviadas ? 'not-allowed' : 'pointer',
            }}
            title={yaEnviadas ? 'Ya se enviaron plantillas para este mes' : 'Enviar plantilla del mes a las plantas'}
          >
            <Send size={13} />
            {yaEnviadas ? 'Ya enviadas' : 'Enviar a plantas'}
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : insumos.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <Package size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin insumos</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
            No hay insumos para {MESES[mes - 1]} {anio}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Codigo', 'Descripcion', 'Unidad', 'Valor Unitario', 'Categoria', 'Proveedor Ord.', 'Estado', 'Actualizado'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--color-text-400)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {insumos.map((insumo) => {
                  const modified = updatedThisMonth(insumo, mes, anio)
                  return (
                    <tr
                      key={insumo.id}
                      style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--color-text-600)' }}>
                        {insumo.codigo}
                      </td>
                      <td className="px-4 py-3 font-medium max-w-48 truncate" style={{ color: 'var(--color-text-900)' }}>
                        {insumo.descripcion}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-600)' }}>
                        {insumo.unidad}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--color-text-900)' }}>
                        {formatCOP(insumo.valor_unitario)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
                        >
                          {CATEGORIA_LABELS[insumo.categoria]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-600)' }}>
                        {insumo.proveedor_ordinario ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: insumo.activo ? `${ESTADO_COLORS.COMPLETADA}22` : `${ESTADO_COLORS.ABIERTA}22`,
                            color:      insumo.activo ? ESTADO_COLORS.COMPLETADA : ESTADO_COLORS.ABIERTA,
                          }}
                        >
                          {insumo.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {insumo.updated_at ? (
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={
                              modified
                                ? { background: '#22c55e22', color: '#16a34a' }
                                : { color: 'var(--color-text-400)' }
                            }
                          >
                            {modified ? `Mod. ${fmtDate(insumo.updated_at)}` : fmtDate(insumo.updated_at)}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div
            className="px-4 py-2.5 flex items-center justify-between gap-3"
            style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
              {total} insumo{total !== 1 ? 's' : ''}
            </span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-600)', opacity: page === 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-600)' }}>
                  {page} / {pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-600)', opacity: page === pages ? 0.4 : 1 }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showCambios && (
        <CambiosModal mes={mes} anio={anio} onClose={() => setShowCambios(false)} />
      )}
      {showEnviar && (
        <EnviarPlantillasModal mes={mes} anio={anio} onClose={() => setShowEnviar(false)} />
      )}
    </div>
  )
}

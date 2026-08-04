'use client'

import { useState } from 'react'
import { formatDateShort as formatDate } from '@/src/lib/utils'
import {
  Loader2, Search, Eye, X, PackagePlus, FileDown, Image as ImageIcon, PenLine,
} from 'lucide-react'
import { toast } from 'sonner'
import { useEmployees } from '@/src/hooks/reports/use-employees'
import type { Employee } from '@/src/types/reports.types'
import {
  useIndumentariaCatalog, useTallasBulk, useCensoResumen, useTallasEmpleado,
  useIndumentariaHistorialEmpleado, useRegistrarEntregaBatch,
} from '@/src/hooks/dotaciones/use-indumentaria'
import type { IndumentariaEntrega, TipoEntrega, CensoItemResumen, EmpleadoTallaRow, TallaCategoria } from '@/src/types/indumentaria.types'
import { TIPO_ENTREGA_LABELS } from '@/src/types/indumentaria.types'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import {
  TallaPicker, useSignatureCanvas, inferTipoTalla, categoriaParaItem, INP_STYLE,
  type TipoTalla,
} from './entrega-shared'

// ── Agrupar entregas planas en "eventos" (una firma = una entrega real) ────
interface EventoEntregaItem {
  indumentaria_id: string
  nombre: string
  cantidad: number
  talla: string | null
}

interface EventoEntrega {
  key: string
  fecha_entrega: string
  tipo: TipoEntrega
  firma_url: string | null
  items: EventoEntregaItem[]
}

function agruparEventos(entregas: IndumentariaEntrega[]): EventoEntrega[] {
  const map = new Map<string, EventoEntrega>()
  for (const e of entregas) {
    const key = e.entrega_batch_id ?? e.id
    if (!map.has(key)) {
      map.set(key, { key, fecha_entrega: e.fecha_entrega, tipo: e.tipo, firma_url: e.firma_url ?? null, items: [] })
    }
    map.get(key)!.items.push({
      indumentaria_id: e.indumentaria_id,
      nombre: e.indumentaria?.nombre ?? 'Item',
      cantidad: e.cantidad,
      talla: e.talla ?? null,
    })
  }
  return Array.from(map.values())
}

// ── Formato fisico HQ-FO-27 (replica): grupos fijos de EPP con icono ────────
const GRUPOS_EPP: { icono: string; nombre: string; items: string[] }[] = [
  { icono: 'protecccion-cabeza.png',      nombre: 'Proteccion cabeza',      items: ['Casco de seguridad', 'Capuchon soldadura'] },
  { icono: 'proteccion-visual.png',       nombre: 'Proteccion visual',      items: ['Gafa clara', 'Gafa oscura'] },
  { icono: 'proteccion-respiratoria.png', nombre: 'Proteccion respiratoria', items: ['Careta gases', 'Cartuchos gases'] },
  { icono: 'proteccion-auditiva.png',     nombre: 'Proteccion auditiva',    items: ['Tipo copa'] },
  { icono: 'ropa-trabajo.png',            nombre: 'Ropa de trabajo',        items: ['Blue jean', 'Camisa M.L.', 'Overol'] },
  { icono: 'calzado-seguridad.png',       nombre: 'Calzado de seguridad',   items: ['Botas de cuero', 'Botas de caucho'] },
  { icono: 'ropa-invierno.png',           nombre: 'Ropa de invierno',       items: ['Impermeable 3 piezas'] },
  { icono: 'careta-soldador.png',         nombre: 'Otros EPP',              items: ['Careta soldador'] },
]

const TALLA_CATEGORIAS: { categoria: TallaCategoria; label: string }[] = [
  { categoria: 'PANTALON', label: 'Pantalon' },
  { categoria: 'CAMISA',   label: 'Camisa' },
  { categoria: 'OVEROL',   label: 'Overol' },
  { categoria: 'CALZADO',  label: 'Calzado' },
]

const ENTREGA_TIPOS: { tipo: TipoEntrega; label: string }[] = [
  { tipo: 'TOCACION',  label: 'INICIAL' },
  { tipo: 'PERIODICA', label: 'PERIODICA' },
  { tipo: 'REPOSICION', label: 'REPOSICION' },
]

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function buscarTalla(tallas: EmpleadoTallaRow[], categoria: TallaCategoria): string {
  return tallas.find(t => t.categoria === categoria)?.talla ?? '-'
}

function buscarCantidad(items: EventoEntregaItem[], nombre: string): number | null {
  const fila = items.find(it => norm(it.nombre) === norm(nombre))
  return fila ? fila.cantidad : null
}

// Texto rotado -90deg (se lee de abajo hacia arriba), para encabezados angostos.
function vText(text: string, heightPx = 26): string {
  return `<div style="height:${heightPx}px;display:flex;align-items:center;justify-content:center;overflow:visible;">
    <span style="display:inline-block;white-space:nowrap;font-size:6px;font-weight:600;transform:rotate(-90deg);">${text}</span>
  </div>`
}

// Texto horizontal normal, una palabra por linea (sin ensanchar la celda).
function hWords(text: string): string {
  return text.split(' ').map(w => `<div style="font-size:6px;font-weight:600;line-height:1.2;white-space:nowrap;">${w}</div>`).join('')
}

// ── Exportar formato de entrega (PDF, replica del formato fisico HQ-FO-27) ──
async function exportFormatoEntregaPdf(
  empleado: Employee,
  eventos: EventoEntrega[],
  tallasActuales: EmpleadoTallaRow[],
) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const eventosAsc = [...eventos].sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega))
  const th = 'border:1px solid #000;padding:1px 1px 6px;text-align:center;vertical-align:middle;line-height:1.2;'
  const td = 'border:1px solid #000;padding:2px;text-align:center;vertical-align:middle;font-size:7px;line-height:1.2;'
  // Estilo con mas aire vertical para el encabezado y las tablas de datos (no la grilla principal).
  const tdInfo = 'border:1px solid #000;padding:6px 4px;text-align:center;vertical-align:middle;font-size:8px;line-height:1.3;'

  const headerHtml = `
    <table style="width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:4px;">
      <tr>
        <td style="border:1px solid #000;padding:6px;width:18%;text-align:center;">
          <img src="${origin}/assets/logo-full.png" style="height:42px;width:auto;object-fit:contain;" onerror="this.style.visibility='hidden'" />
        </td>
        <td style="border:1px solid #000;padding:4px;width:64%;text-align:center;">
          <div style="font-size:12px;font-weight:bold;">HSEQ</div>
          <div style="font-size:11px;font-weight:bold;">FORMATO</div>
          <div style="font-size:9px;font-weight:600;">ENTREGA DE DOTACION Y EPP MANTENIMIENTO</div>
        </td>
        <td style="border:1px solid #000;width:18%;padding:0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="${tdInfo}text-align:left;font-weight:bold;">CODIGO:</td><td style="${tdInfo}text-align:left;">HQ-FO-27</td></tr>
            <tr><td style="${tdInfo}text-align:left;font-weight:bold;">VIGENCIA:</td><td style="${tdInfo}text-align:left;">1/09/2022</td></tr>
            <tr><td style="${tdInfo}text-align:left;font-weight:bold;">VERSION:</td><td style="${tdInfo}text-align:left;">12</td></tr>
          </table>
        </td>
      </tr>
    </table>`

  const infoHtml = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
      <tr>
        <td style="width:70%;border:1px solid #000;padding:0;vertical-align:top;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="${tdInfo}text-align:left;font-weight:bold;width:20%;">NOMBRE DEL TRABAJADOR:</td>
              <td style="${tdInfo}text-align:left;width:40%;">${empleado.first_name} ${empleado.last_name}</td>
              <td style="${tdInfo}text-align:left;font-weight:bold;width:12%;">CEDULA:</td>
              <td style="${tdInfo}text-align:left;width:14%;">${empleado.identification_number}</td>
              <td style="${tdInfo}text-align:left;font-weight:bold;width:6%;">RH:</td>
              <td style="${tdInfo}text-align:left;width:8%;"></td>
            </tr>
            <tr>
              <td style="${tdInfo}text-align:left;font-weight:bold;">CARGO:</td>
              <td style="${tdInfo}text-align:left;">${empleado.position}</td>
              <td style="${tdInfo}text-align:left;font-weight:bold;">CONTRATO:</td>
              <td style="${tdInfo}text-align:left;">CW286091</td>
              <td colspan="2" style="${tdInfo}text-align:left;font-weight:bold;">AREA DE TRABAJO: ${empleado.field?.name ?? '-'}</td>
            </tr>
          </table>
        </td>
        <td style="width:30%;border:1px solid #000;border-left:none;padding:0;vertical-align:top;">
          <table style="width:100%;height:100%;border-collapse:collapse;">
            <tr>
              <td style="${tdInfo}font-weight:bold;">DESCRIPCION</td><td style="${tdInfo}font-weight:bold;">TALLA</td>
              <td style="${tdInfo}font-weight:bold;">DESCRIPCION</td><td style="${tdInfo}font-weight:bold;">TALLA</td>
            </tr>
            <tr>
              <td style="${tdInfo}text-align:left;">PANTALON</td><td style="${tdInfo}">${buscarTalla(tallasActuales, 'PANTALON')}</td>
              <td style="${tdInfo}text-align:left;">OVEROL</td><td style="${tdInfo}">${buscarTalla(tallasActuales, 'OVEROL')}</td>
            </tr>
            <tr>
              <td style="${tdInfo}text-align:left;">CAMISA</td><td style="${tdInfo}">${buscarTalla(tallasActuales, 'CAMISA')}</td>
              <td style="${tdInfo}text-align:left;">CALZADO</td><td style="${tdInfo}">${buscarTalla(tallasActuales, 'CALZADO')}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`

  const grupoTh = 'border:1px solid #000;padding:2px 2px 6px;text-align:center;vertical-align:middle;line-height:1;font-size:6px;font-weight:bold;'
  const grupoHeadRow = GRUPOS_EPP.map(g => `<th colspan="${g.items.length}" style="${grupoTh}">${g.nombre.toUpperCase()}</th>`).join('')
  const grupoIconRow = GRUPOS_EPP.map(g => `<td colspan="${g.items.length}" style="${td}padding:1px;">
    <div style="display:flex;align-items:center;justify-content:center;width:100%;">
      <img src="${origin}/assets/dotaciones-entrega/${g.icono}" style="height:24px;width:auto;object-fit:contain;display:block;margin:0 auto;" onerror="this.style.visibility='hidden'" />
    </div>
  </td>`).join('')
  const itemHeadRow = GRUPOS_EPP.flatMap(g => g.items.map(i => `<th style="${th}">${hWords(i)}</th>`)).join('')

  const totalItemCols = GRUPOS_EPP.reduce((s, g) => s + g.items.length, 0)
  const colgroupHtml = `
    <colgroup>
      <col style="width:2%"><col style="width:2%"><col style="width:2%">
      ${ENTREGA_TIPOS.map(() => '<col style="width:2.5%">').join('')}
      <col style="width:8%">
      ${Array.from({ length: totalItemCols }, () => `<col style="width:${(78.5 / totalItemCols).toFixed(2)}%">`).join('')}
    </colgroup>`

  const rows = eventosAsc.map(ev => {
    const [y, m, d] = ev.fecha_entrega.split('-')
    const marcaEntrega = ENTREGA_TIPOS.map(e => `<td style="${td}font-weight:bold;">${e.tipo === ev.tipo ? 'X' : ''}</td>`).join('')
    const firmaCell = ev.firma_url
      ? `<td style="${td}padding:1px;"><img src="${ev.firma_url}" crossorigin="anonymous" style="height:22px;width:90%;object-fit:fill;display:block;margin:0 auto;" /></td>`
      : `<td style="${td}"></td>`
    const itemCells = GRUPOS_EPP.flatMap(g => g.items.map(nombre => {
      const cant = buscarCantidad(ev.items, nombre)
      return `<td style="${td}">${cant ?? ''}</td>`
    })).join('')
    return `<tr>
      <td style="${td}">${d}</td><td style="${td}">${m}</td><td style="${td}">${y}</td>
      ${marcaEntrega}
      ${firmaCell}
      ${itemCells}
    </tr>`
  }).join('')

  const totalCols = 3 + ENTREGA_TIPOS.length + 1 + GRUPOS_EPP.reduce((s, g) => s + g.items.length, 0)

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;table-layout:fixed;">
      ${colgroupHtml}
      <thead>
        <tr>
          <th colspan="3" style="${th}font-size:6.5px;font-weight:bold;">FECHA</th>
          <th colspan="${ENTREGA_TIPOS.length}" style="${th}font-size:6.5px;font-weight:bold;">ENTREGA</th>
          <th rowspan="3" style="${th}font-size:6.5px;font-weight:bold;">FIRMA DE RECIBO DEL TRABAJADOR</th>
          ${grupoHeadRow}
        </tr>
        <tr>
          <td rowspan="2" style="${td}">DIA</td><td rowspan="2" style="${td}">MES</td><td rowspan="2" style="${td}">A&Ntilde;O</td>
          ${ENTREGA_TIPOS.map(e => `<th rowspan="2" style="${th}">${vText(e.label)}</th>`).join('')}
          ${grupoIconRow}
        </tr>
        <tr>
          ${itemHeadRow}
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="${totalCols}" style="padding:14px;text-align:center;font-size:9px;color:#555;border:1px solid #000;">Sin entregas registradas</td></tr>`}</tbody>
    </table>`

  const html = `<div style="font-family:Arial,sans-serif;padding:10px;color:#000;background:#fff;">${headerHtml}${infoHtml}${tableHtml}</div>`
  const { default: html2pdf } = await import('html2pdf.js')
  await html2pdf().set({
    margin:      6,
    filename:    `Formato-Entrega-${empleado.identification_number}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'landscape' },
  }).from(html).save()
}

// ── Modal: registrar entrega (inicial o periodica, sin RQ) ──────────────────
interface EntregaGeneralItemRow {
  _id: string
  indumentaria_id: string
  cantidad: string
  tipoTalla: TipoTalla
  talla: string
}

function makeItem(): EntregaGeneralItemRow {
  return { _id: Math.random().toString(36).slice(2), indumentaria_id: '', cantidad: '1', tipoTalla: '', talla: '' }
}

function EntregaGeneralModal({ empleado, onClose }: { empleado: Employee; onClose: () => void }) {
  const { data: catalogRaw } = useIndumentariaCatalog()
  const catalogo = (Array.isArray(catalogRaw) ? catalogRaw : []).filter(i => i.activo)
  const { data: tallasActuales = [] } = useTallasEmpleado(empleado.id)
  const registrar = useRegistrarEntregaBatch()

  const [fase, setFase]   = useState<'seleccion' | 'resumen' | 'firma'>('seleccion')
  const [tipo, setTipo]   = useState<TipoEntrega>('PERIODICA')
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [obs, setObs]     = useState('')
  const [items, setItems] = useState<EntregaGeneralItemRow[]>(() => [makeItem()])
  const { canvasRef, hasStrokes, setHasStrokes, startDraw, draw, endDraw, limpiar } = useSignatureCanvas(fase === 'firma')

  function requiereTalla(indumentariaId: string): boolean {
    return catalogo.find(c => c.id === indumentariaId)?.requiere_talla ?? false
  }

  function tallaSugerida(indumentariaId: string): string | null {
    const item = catalogo.find(c => c.id === indumentariaId)
    const categoria = item ? categoriaParaItem(item.nombre) : null
    if (!categoria) return null
    return tallasActuales.find(t => t.categoria === categoria)?.talla ?? null
  }

  function setItemField(id: string, field: keyof Omit<EntregaGeneralItemRow, '_id'>, val: string) {
    setItems(prev => prev.map(it => it._id === id ? { ...it, [field]: val } : it))
  }

  function selectItem(id: string, indumentariaId: string) {
    const sugerida = tallaSugerida(indumentariaId)
    setItems(prev => prev.map(it => it._id === id
      ? { ...it, indumentaria_id: indumentariaId, cantidad: '1', tipoTalla: sugerida ? inferTipoTalla(sugerida) : '', talla: sugerida ?? '' }
      : it))
  }

  function setTipoTalla(id: string, tipoTalla: TipoTalla) {
    setItems(prev => prev.map(it => it._id === id ? { ...it, tipoTalla, talla: '' } : it))
  }

  function irAResumen() {
    const invalid = items.find(it => !it.indumentaria_id || !it.cantidad || Number(it.cantidad) < 1)
    if (invalid) { toast.error('Seleccione el item y la cantidad de todos los registros'); return }
    const sinTalla = items.find(it => requiereTalla(it.indumentaria_id) && !it.talla)
    if (sinTalla) { toast.error('Indique la talla de todos los items que la requieren'); return }
    setFase('resumen')
  }

  function handleConfirmar() {
    if (!canvasRef.current || !hasStrokes) return
    canvasRef.current.toBlob(blob => {
      if (!blob) return
      registrar.mutate({
        empleadoId: empleado.id,
        tipo,
        fechaEntrega: fecha,
        observacion: obs.trim() || undefined,
        items: items.map(it => ({
          indumentaria_id: it.indumentaria_id,
          cantidad: parseInt(it.cantidad) || 1,
          talla: it.talla || null,
        })),
        firmaBlob: blob,
      }, { onSuccess: () => onClose() })
    }, 'image/png')
  }

  const itemsUsados = new Set(items.map(it => it.indumentaria_id).filter(Boolean))

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
              {empleado.first_name} {empleado.last_name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {empleado.position} &middot; {empleado.field?.name ?? '-'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        {fase === 'seleccion' && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Tipo de entrega</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value as TipoEntrega)} style={{ ...INP_STYLE, appearance: 'none' as const }}>
                    <option value="TOCACION">Dotacion inicial</option>
                    <option value="PERIODICA">Periodica</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Fecha de entrega</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={INP_STYLE} />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-400)' }}>Items a entregar</p>
                <div className="flex flex-col gap-2">
                  {items.map((item, idx) => {
                    const necesitaTalla = item.indumentaria_id && requiereTalla(item.indumentaria_id)
                    const opciones = catalogo.filter(c => c.id === item.indumentaria_id || !itemsUsados.has(c.id))
                    return (
                      <div key={item._id} className="rounded-xl p-3 flex flex-col gap-2"
                        style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--color-text-400)', minWidth: 16 }}>{idx + 1}</span>
                          <select
                            value={item.indumentaria_id}
                            onChange={e => selectItem(item._id, e.target.value)}
                            className="flex-1"
                            style={{ ...INP_STYLE, appearance: 'none' as const }}
                          >
                            <option value="">Seleccionar item...</option>
                            {opciones.map(c => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={item.cantidad}
                            onChange={e => setItemField(item._id, 'cantidad', String(Math.max(1, parseInt(e.target.value) || 1)))}
                            min={1}
                            disabled={!item.indumentaria_id}
                            placeholder="Cant."
                            style={{ ...INP_STYLE, width: 72 }}
                          />
                          {items.length > 1 && (
                            <button onClick={() => setItems(prev => prev.filter(it => it._id !== item._id))}
                              className="p-0.5 rounded transition-opacity hover:opacity-70 shrink-0" style={{ color: '#ef4444' }}>
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        {necesitaTalla && (
                          <div className="pl-6">
                            <TallaPicker
                              tipoTalla={item.tipoTalla}
                              talla={item.talla}
                              onChangeTipo={t => setTipoTalla(item._id, t)}
                              onChangeTalla={v => setItemField(item._id, 'talla', v)}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {items.length < catalogo.length && (
                    <button
                      onClick={() => setItems(prev => [...prev, makeItem()])}
                      className="mt-1 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
                    >
                      <PackagePlus size={13} /> Agregar item
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-400)' }}>Observacion (opcional)</label>
                <textarea
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                  rows={2}
                  style={{ ...INP_STYLE, resize: 'none' as const }}
                />
              </div>
            </div>

            <div className="px-5 py-4 flex gap-3 justify-end shrink-0"
              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
                Cancelar
              </button>
              <button onClick={irAResumen}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
                style={{ background: '#1a3a3a', color: '#fff' }}>
                Continuar
              </button>
            </div>
          </>
        )}

        {fase === 'resumen' && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                Esto es lo que va a recibir {empleado.first_name} {empleado.last_name}:
              </p>
              <div className="flex flex-col gap-2">
                {items.map(item => {
                  const c = catalogo.find(i => i.id === item.indumentaria_id)
                  return (
                    <div key={item._id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                      style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                        {c?.nombre ?? '-'}
                        {item.talla && <span style={{ color: 'var(--color-text-400)' }}> &middot; Talla {item.talla}</span>}
                      </span>
                      <span className="text-sm font-bold" style={{ color: 'var(--color-secundary)' }}>{item.cantidad}</span>
                    </div>
                  )
                })}
              </div>
              {obs.trim() && (
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Observacion: {obs.trim()}</p>
              )}
            </div>
            <div className="px-5 py-4 flex gap-3 justify-end shrink-0"
              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <button onClick={() => setFase('seleccion')}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
                Corregir
              </button>
              <button onClick={() => { setHasStrokes(false); setFase('firma') }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
                style={{ background: '#1a3a3a', color: '#fff' }}>
                De acuerdo
              </button>
            </div>
          </>
        )}

        {fase === 'firma' && (
          <>
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                Firma de {empleado.first_name} {empleado.last_name} confirmando que recibio lo anterior.
              </p>
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="w-full rounded-xl touch-none"
                style={{ border: '1.5px solid var(--color-border)', background: '#fff' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            <div className="px-5 py-4 flex gap-3 justify-between shrink-0"
              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
              <button onClick={limpiar} disabled={registrar.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
                Limpiar
              </button>
              <button onClick={handleConfirmar} disabled={!hasStrokes || registrar.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
                style={{ background: '#1a3a3a', color: '#fff', opacity: (!hasStrokes || registrar.isPending) ? 0.6 : 1 }}>
                {registrar.isPending ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                Confirmar entrega
              </button>
            </div>
          </>
        )}
      </div>
    </ModalPortal>
  )
}

// ── Modal: historial completo de un empleado ────────────────────────────────
function EmpleadoHistorialModal({ empleado, onClose }: { empleado: Employee; onClose: () => void }) {
  const { data: entregas = [], isLoading } = useIndumentariaHistorialEmpleado(empleado.id)
  const { data: tallasActuales = [] } = useTallasEmpleado(empleado.id)
  const [showEntrega, setShowEntrega] = useState(false)
  const [lightbox, setLightbox]       = useState<string | null>(null)
  const [loadingPdf, setLoadingPdf]   = useState(false)

  const eventos = agruparEventos(entregas).sort((a, b) => b.fecha_entrega.localeCompare(a.fecha_entrega))

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
              {empleado.first_name} {empleado.last_name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              CC {empleado.identification_number} &middot; {empleado.position} &middot; {empleado.field?.name ?? '-'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 flex gap-2 shrink-0" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <button
            onClick={() => setShowEntrega(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ background: '#1a3a3a', color: '#fff' }}
          >
            <PackagePlus size={13} /> Entregar
          </button>
          <button
            onClick={async () => { setLoadingPdf(true); try { await exportFormatoEntregaPdf(empleado, eventos, tallasActuales) } finally { setLoadingPdf(false) } }}
            disabled={loadingPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
          >
            {loadingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
            Exportar formato
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-2" style={{ maxHeight: 420 }}>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : eventos.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: 'var(--color-text-400)' }}>Sin entregas registradas todavia.</p>
          ) : (
            eventos.map(ev => (
              <div key={ev.key} className="rounded-xl p-3 flex flex-col gap-2" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>{formatDate(ev.fecha_entrega)}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)' }}>
                      {TIPO_ENTREGA_LABELS[ev.tipo]}
                    </span>
                  </div>
                  {ev.firma_url && (
                    <button onClick={() => setLightbox(ev.firma_url)} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--color-secundary)' }}>
                      <ImageIcon size={12} /> Ver firma
                    </button>
                  )}
                </div>
                <ul className="text-sm flex flex-col gap-0.5" style={{ color: 'var(--color-text-700)' }}>
                  {ev.items.map((it, i) => (
                    <li key={i}>{it.cantidad} x {it.nombre}{it.talla && ` (talla ${it.talla})`}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>

      {showEntrega && <EntregaGeneralModal empleado={empleado} onClose={() => setShowEntrega(false)} />}

      {lightbox && (
        <div
          className="fixed inset-0 z-999 flex items-center justify-center p-4"
          style={{ background: 'rgba(4,24,24,0.85)', backdropFilter: 'blur(4px)' }}
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="firma" className="max-w-full max-h-full rounded-xl" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </ModalPortal>
  )
}

// ── Tab: Historial general (censo de todos los empleados) ──────────────────
export function HistorialGeneralTab() {
  const { data: empData, isLoading: loadingEmp } = useEmployees({ limit: 1000 })
  const empleados = (empData?.data ?? []).filter(e => e.is_active !== false)
  const { data: catalogRaw, isLoading: loadingCat } = useIndumentariaCatalog()
  const catalogo = (Array.isArray(catalogRaw) ? catalogRaw : []).filter(i => i.activo)
  const { data: tallasBulk = [] } = useTallasBulk()
  const { data: censoBulk = [] } = useCensoResumen()

  const [campoId, setCampoId] = useState('')
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState<Employee | null>(null)

  const isLoading = loadingEmp || loadingCat

  const tallasMap = new Map<string, Map<TallaCategoria, string | null>>()
  for (const t of tallasBulk) {
    if (!tallasMap.has(t.empleado_id)) tallasMap.set(t.empleado_id, new Map())
    tallasMap.get(t.empleado_id)!.set(t.categoria, t.talla)
  }

  const censoMap = new Map<string, Map<string, CensoItemResumen>>()
  const fechaUltimaMap = new Map<string, string | null>()
  for (const c of censoBulk) {
    const m = new Map<string, CensoItemResumen>()
    for (const it of c.items) m.set(it.indumentaria_id, it)
    censoMap.set(c.empleado_id, m)
    fechaUltimaMap.set(c.empleado_id, c.fecha_ultima_entrega)
  }

  const campos = Array.from(
    new Map(empleados.filter(e => e.field).map(e => [e.field!.id, e.field!.name])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]))

  const filtrados = empleados
    .filter(e => !campoId || e.field?.id === campoId)
    .filter(e => !search.trim() || `${e.first_name} ${e.last_name} ${e.identification_number}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.first_name.localeCompare(b.first_name))

  const totalesPorItem = new Map<string, number>()
  for (const emp of filtrados) {
    const censoEmp = censoMap.get(emp.id)
    for (const item of catalogo) {
      const cant = censoEmp?.get(item.id)?.cantidad ?? 0
      totalesPorItem.set(item.id, (totalesPorItem.get(item.id) ?? 0) + cant)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={campoId}
          onChange={e => setCampoId(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg outline-none cursor-pointer"
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

      {isLoading ? (
        <div className="flex justify-center py-14">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface-1)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-700)' }}>Sin empleados para mostrar</p>
        </div>
      ) : (
        <div className="rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
          <div style={{ overflow: 'auto', maxHeight: '70vh' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#1a3a3a', color: '#fff' }}>
                  <th rowSpan={2} className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap align-bottom" style={{ position: 'sticky', top: 0, zIndex: 2, background: '#1a3a3a' }}>Cedula</th>
                  <th
                    rowSpan={2}
                    className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap align-bottom"
                    style={{ position: 'sticky', top: 0, left: 0, zIndex: 3, background: '#1a3a3a', boxShadow: '2px 0 4px rgba(0,0,0,0.15)' }}
                  >
                    Nombre
                  </th>
                  <th rowSpan={2} className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap align-bottom" style={{ position: 'sticky', top: 0, zIndex: 2, background: '#1a3a3a' }}>Cargo</th>
                  <th rowSpan={2} className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap align-bottom" style={{ position: 'sticky', top: 0, zIndex: 2, background: '#1a3a3a' }}>Campo</th>
                  <th colSpan={TALLA_CATEGORIAS.length} className="text-center px-3 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', position: 'sticky', top: 0, zIndex: 2, background: '#1a3a3a', height: 33 }}>
                    Tallas
                  </th>
                  {catalogo.map(item => (
                    <th key={item.id} rowSpan={2} className="text-center px-3 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap align-bottom" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', position: 'sticky', top: 0, zIndex: 2, background: '#1a3a3a' }}>
                      {item.nombre}
                    </th>
                  ))}
                  <th rowSpan={2} className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap align-bottom" style={{ position: 'sticky', top: 0, zIndex: 2, background: '#1a3a3a' }}>Fecha ultima entrega</th>
                  <th rowSpan={2} className="px-3 py-2 align-bottom" style={{ position: 'sticky', top: 0, zIndex: 2, background: '#1a3a3a' }}></th>
                </tr>
                <tr style={{ background: '#1a3a3a', color: '#fff' }}>
                  {TALLA_CATEGORIAS.map(c => (
                    <th key={c.categoria} className="text-center px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider whitespace-nowrap" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', position: 'sticky', top: 33, zIndex: 2, background: '#1a3a3a' }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((emp, idx) => {
                  const tallasEmp = tallasMap.get(emp.id)
                  const censoEmp  = censoMap.get(emp.id)
                  const fechaUlt  = fechaUltimaMap.get(emp.id) ?? null
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)' }}>
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{emp.identification_number}</td>
                      <td
                        className="px-3 py-2 font-medium text-sm whitespace-nowrap"
                        style={{
                          color: 'var(--color-text-900)',
                          position: 'sticky', left: 0, zIndex: 1,
                          background: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)',
                          boxShadow: '2px 0 4px rgba(0,0,0,0.08)',
                        }}
                      >
                        {emp.first_name} {emp.last_name}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{emp.position}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{emp.field?.name ?? '-'}</td>
                      {TALLA_CATEGORIAS.map(c => (
                        <td key={c.categoria} className="px-2 py-2 text-xs text-center whitespace-nowrap" style={{ color: 'var(--color-text-700)', borderLeft: '1px solid var(--color-border)' }}>
                          {tallasEmp?.get(c.categoria) ?? '-'}
                        </td>
                      ))}
                      {catalogo.map(item => {
                        const resumen = censoEmp?.get(item.id)
                        return (
                          <td key={item.id} className="px-2 py-2 text-xs text-center whitespace-nowrap" style={{ color: 'var(--color-text-700)', borderLeft: '1px solid var(--color-border)' }}>
                            {resumen?.cantidad ?? '-'}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-600)' }}>{fechaUlt ? formatDate(fechaUlt) : '-'}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setSelected(emp)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                          title="Ver historial"
                          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}>
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#1a3a3a', color: '#fff' }}>
                  <td className="px-3 py-2" style={{ position: 'sticky', bottom: 0, zIndex: 2, background: '#1a3a3a', borderTop: '2px solid rgba(255,255,255,0.3)' }}></td>
                  <td
                    className="px-3 py-2 text-xs font-semibold whitespace-nowrap"
                    style={{ position: 'sticky', bottom: 0, left: 0, zIndex: 3, background: '#1a3a3a', borderTop: '2px solid rgba(255,255,255,0.3)', boxShadow: '2px 0 4px rgba(0,0,0,0.15)' }}
                  >
                    Total ({filtrados.length})
                  </td>
                  <td className="px-3 py-2" style={{ position: 'sticky', bottom: 0, zIndex: 2, background: '#1a3a3a', borderTop: '2px solid rgba(255,255,255,0.3)' }}></td>
                  <td className="px-3 py-2" style={{ position: 'sticky', bottom: 0, zIndex: 2, background: '#1a3a3a', borderTop: '2px solid rgba(255,255,255,0.3)' }}></td>
                  {TALLA_CATEGORIAS.map(c => (
                    <td key={c.categoria} className="px-2 py-2" style={{ position: 'sticky', bottom: 0, zIndex: 2, background: '#1a3a3a', borderLeft: '1px solid rgba(255,255,255,0.2)', borderTop: '2px solid rgba(255,255,255,0.3)' }}></td>
                  ))}
                  {catalogo.map(item => (
                    <td key={item.id} className="px-2 py-2 text-xs text-center font-semibold whitespace-nowrap" style={{ position: 'sticky', bottom: 0, zIndex: 2, background: '#1a3a3a', borderLeft: '1px solid rgba(255,255,255,0.2)', borderTop: '2px solid rgba(255,255,255,0.3)' }}>
                      {totalesPorItem.get(item.id) ?? 0}
                    </td>
                  ))}
                  <td className="px-3 py-2" style={{ position: 'sticky', bottom: 0, zIndex: 2, background: '#1a3a3a', borderTop: '2px solid rgba(255,255,255,0.3)' }}></td>
                  <td className="px-3 py-2" style={{ position: 'sticky', bottom: 0, zIndex: 2, background: '#1a3a3a', borderTop: '2px solid rgba(255,255,255,0.3)' }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {selected && <EmpleadoHistorialModal empleado={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

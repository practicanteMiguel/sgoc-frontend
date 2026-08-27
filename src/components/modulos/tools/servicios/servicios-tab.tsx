'use client'

import { useState } from 'react'
import {
  Search, Loader2, Plus, Trash2, Briefcase, Users, Pencil, Wrench, Repeat, UserSearch,
} from 'lucide-react'
import { usePermissions } from '@/src/hooks/auth/use-permissions'
import {
  useServicios, useDeleteServicio, useCuadrillasServicio,
  useHerramientasServicio, useQuitarHerramientaServicio,
} from '@/src/hooks/servicios/use-servicios'
import { ServicioModal } from './servicio-modal'
import { AsignarCuadrillasModal } from './asignar-cuadrillas-modal'
import { CuadrillaServicioModal } from './cuadrilla-servicio-modal'
import { HerramientaServicioModal } from './herramienta-servicio-modal'
import { AsignarHerramientasModal } from './asignar-herramientas-modal'
import { BovedaHerramientaModal } from './boveda-herramienta-modal'
import { BuscarCuadrillaModal } from './buscar-cuadrilla-modal'
import type { Servicio, ServicioHerramienta } from '@/src/types/servicios.types'

export function ServiciosTab() {
  const { canCreate, canEdit, canDelete } = usePermissions('tools')

  const [search,       setSearch]       = useState('')
  const [activoFilter, setActivoFilter] = useState<boolean | undefined>(undefined)
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [showNuevo,    setShowNuevo]    = useState(false)
  const [editItem,     setEditItem]     = useState<Servicio | null>(null)
  const [showAsignar,  setShowAsignar]  = useState(false)
  const [cuadrillaModalCrewId, setCuadrillaModalCrewId] = useState<string | null>(null)
  const [showAgregarHerramienta, setShowAgregarHerramienta] = useState(false)
  const [editHerramienta,        setEditHerramienta]        = useState<ServicioHerramienta | null>(null)
  const [bovedaItemId, setBovedaItemId] = useState<string | null>(null)
  const [showBuscarCuadrilla, setShowBuscarCuadrilla] = useState(false)

  const { data, isLoading } = useServicios({ search: search || undefined, activo: activoFilter })
  const eliminar = useDeleteServicio()

  const servicios = data?.data ?? []
  const selected  = servicios.find(s => s.id === selectedId) ?? null

  const { data: cuadrillas = [], isLoading: loadingCuadrillas } = useCuadrillasServicio(selectedId)
  const cuadrillaModalCrew = cuadrillas.find(c => c.id === cuadrillaModalCrewId) ?? null

  const { data: herramientas = [], isLoading: loadingHerramientas } = useHerramientasServicio(selectedId)
  const quitarHerramienta = useQuitarHerramientaServicio()
  const herramientasNormales  = herramientas.filter(h => !h.es_rotativa)
  const herramientasRotativas = herramientas.filter(h => h.es_rotativa)

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Lista de servicios */}
      <div className="flex flex-col gap-3 lg:w-80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-400)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar servicio..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none"
              style={{ border: '1.5px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-900)' }}
            />
          </div>
          <button
            onClick={() => setShowBuscarCuadrilla(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
            title="Buscar cuadrilla"
          >
            <UserSearch size={15} />
          </button>
          {canCreate && (
            <button
              onClick={() => setShowNuevo(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
              title="Nuevo servicio"
            >
              <Plus size={15} />
            </button>
          )}
        </div>

        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          {([undefined, true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => setActivoFilter(val)}
              className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={
                activoFilter === val
                  ? { background: 'var(--color-surface-0)', color: 'var(--color-primary)', boxShadow: '0 1px 4px rgba(13,59,88,0.12)' }
                  : { color: 'var(--color-text-400)' }
              }
            >
              {val === undefined ? 'Todos' : val ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>

        <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: '1px solid var(--color-border)' }}>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
            </div>
          ) : servicios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 px-4 text-center">
              <Briefcase size={22} style={{ color: 'var(--color-text-400)' }} />
              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin servicios en el catalogo</p>
            </div>
          ) : (
            servicios.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors w-full"
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  background: selectedId === s.id ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'var(--color-surface-0)',
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{s.nombre}</p>
                  {s.descripcion && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-400)' }}>{s.descripcion}</p>
                  )}
                </div>
                {!s.activo && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: '#6b728022', color: '#6b7280' }}>
                    Inactivo
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detalle del servicio seleccionado */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div
            className="flex flex-col items-center justify-center py-24 rounded-xl gap-2"
            style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
          >
            <Briefcase size={28} style={{ color: 'var(--color-text-400)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>Selecciona un servicio para ver sus cuadrillas</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Header del servicio */}
            <div className="rounded-xl p-4 flex items-start justify-between gap-3" style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-900)' }}>{selected.nombre}</h3>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={selected.activo ? { background: '#16a34a22', color: '#16a34a' } : { background: '#6b728022', color: '#6b7280' }}
                  >
                    {selected.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {selected.descripcion && (
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-400)' }}>{selected.descripcion}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canEdit && (
                  <button
                    onClick={() => setEditItem(selected)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => { if (confirm('Eliminar este servicio?')) { eliminar.mutate(selected.id); setSelectedId(null) } }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                    style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Cuadrillas asignadas */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                <div className="flex items-center gap-2">
                  <Users size={14} style={{ color: 'var(--color-text-400)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                    Cuadrillas asignadas ({cuadrillas.length})
                  </span>
                </div>
                {canEdit && (
                  <button
                    onClick={() => setShowAsignar(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                  >
                    <Plus size={13} /> Asignar cuadrillas
                  </button>
                )}
              </div>

              {loadingCuadrillas ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                </div>
              ) : cuadrillas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Users size={22} style={{ color: 'var(--color-text-400)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin cuadrillas asignadas a este servicio</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {cuadrillas.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCuadrillaModalCrewId(c.id)}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-left w-full hover:opacity-90 transition-opacity"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                          {c.name}
                          {c.is_soldadura && (
                            <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}>
                              Soldadura
                            </span>
                          )}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{c.field.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Herramientas exigidas (no rotativas) */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                <div className="flex items-center gap-2">
                  <Wrench size={14} style={{ color: 'var(--color-text-400)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                    Herramientas exigidas ({herramientasNormales.length})
                  </span>
                </div>
                {canEdit && (
                  <button
                    onClick={() => setShowAgregarHerramienta(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                  >
                    <Plus size={13} /> Agregar herramienta
                  </button>
                )}
              </div>

              {loadingHerramientas ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
                </div>
              ) : herramientasNormales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Wrench size={22} style={{ color: 'var(--color-text-400)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin herramientas exigidas para este servicio</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {herramientasNormales.map((sh) => (
                    <div key={sh.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <button
                        onClick={() => canEdit && setEditHerramienta(sh)}
                        className="min-w-0 text-left flex-1"
                        disabled={!canEdit}
                      >
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                          {sh.herramienta.descripcion}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                          {sh.herramienta.codigo} &middot; Cantidad exigida: {sh.cantidad_exigida} {sh.herramienta.unidad}
                          {sh.herramienta.marca_modelo && (
                            <span style={{ color: 'var(--color-secondary)' }}> &middot; {sh.herramienta.marca_modelo}</span>
                          )}
                        </p>
                      </button>
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditHerramienta(sh)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => { if (confirm('Quitar esta herramienta del servicio?')) quitarHerramienta.mutate({ servicioId: selected.id, itemId: sh.id }) }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
                            style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', opacity: quitarHerramienta.isPending ? 0.5 : 1 }}
                            title="Quitar del servicio"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Boveda / espacio comun (rotativas) */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
                <Repeat size={14} style={{ color: 'var(--color-text-400)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
                  Bóveda / espacio común ({herramientasRotativas.length})
                </span>
              </div>

              {herramientasRotativas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Repeat size={22} style={{ color: 'var(--color-text-400)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin herramientas rotativas para este servicio</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {herramientasRotativas.map((sh) => (
                    <button
                      key={sh.id}
                      onClick={() => setBovedaItemId(sh.id)}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-left w-full hover:opacity-90 transition-opacity"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{sh.herramienta.descripcion}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
                          {sh.herramienta.codigo} &middot; Exigido: {sh.cantidad_exigida} {sh.herramienta.unidad}
                          {sh.ubicacion && <span> &middot; {sh.ubicacion}</span>}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showNuevo && <ServicioModal onClose={() => setShowNuevo(false)} />}
      {editItem  && <ServicioModal item={editItem} onClose={() => setEditItem(null)} />}
      {showAsignar && selected && <AsignarCuadrillasModal servicio={selected} onClose={() => setShowAsignar(false)} />}
      {showAgregarHerramienta && selected && (
        <AsignarHerramientasModal
          servicio={selected}
          existingIds={herramientas.map(h => h.herramienta_id)}
          onClose={() => setShowAgregarHerramienta(false)}
        />
      )}
      {editHerramienta && selected && (
        <HerramientaServicioModal
          servicio={selected}
          item={editHerramienta}
          onClose={() => setEditHerramienta(null)}
        />
      )}
      {cuadrillaModalCrew && selected && (
        <CuadrillaServicioModal
          servicio={selected}
          crew={cuadrillaModalCrew}
          onClose={() => setCuadrillaModalCrewId(null)}
        />
      )}
      {bovedaItemId && selected && (
        <BovedaHerramientaModal
          servicio={selected}
          itemId={bovedaItemId}
          onClose={() => setBovedaItemId(null)}
        />
      )}
      {showBuscarCuadrilla && (
        <BuscarCuadrillaModal onClose={() => setShowBuscarCuadrilla(false)} />
      )}
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { MapPin, Loader2, Users, Clock3, ChevronRight, Inbox } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '@/src/stores/auth.store'
import { useField } from '@/src/hooks/reports/use-fields'
import { useCuadrillasCampoSupervisor, useEstadisticasCampoSupervisor, useSolicitudesHerramienta } from '@/src/hooks/servicios/use-solicitudes-herramienta'
import { formatDateShort as formatDate } from '@/src/lib/utils'
import { CATEGORIA_HERRAMIENTA_LABELS } from '@/src/types/herramientas.types'
import { TIPO_SOLICITUD_LABELS, ESTADO_SOLICITUD_LABELS, ESTADO_SOLICITUD_COLORS } from '@/src/types/solicitudes-herramienta.types'
import { CuadrillaSupervisorModal } from './cuadrilla-supervisor-modal'
import type { CuadrillaCampoSupervisor } from '@/src/types/solicitudes-herramienta.types'

const TOOLTIP_STYLE = { background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }

function SummaryCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
      <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>{label}</span>
      <span className="text-lg font-bold font-display" style={{ color }}>{value}</span>
      {sub && <span className="text-xs font-medium" style={{ color }}>{sub}</span>}
    </div>
  )
}

export function SupervisorToolsView() {
  const { user } = useAuthStore()
  const fieldId = user?.field_id ?? null

  const { data: field, isLoading: loadingField } = useField(fieldId)
  const { data: cuadrillas = [], isLoading: loadingCuadrillas } = useCuadrillasCampoSupervisor(fieldId)
  const { data: stats, isLoading: loadingStats } = useEstadisticasCampoSupervisor(fieldId)
  const { data: solicitudes = [], isLoading: loadingSolicitudes } = useSolicitudesHerramienta({ fieldId })

  const [cuadrillaSel, setCuadrillaSel] = useState<CuadrillaCampoSupervisor | null>(null)

  const barCategorias = useMemo(
    () => (stats?.por_categoria ?? []).map(c => ({ name: CATEGORIA_HERRAMIENTA_LABELS[c.categoria] ?? c.categoria, Cantidad: c.cantidad })),
    [stats],
  )

  if (!fieldId) {
    return (
      <div className="flex flex-col items-center py-20 rounded-xl"
        style={{ background: 'var(--color-surface-1)', border: '1px dashed var(--color-border)' }}>
        <MapPin size={28} className="mb-3" style={{ color: 'var(--color-text-400)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>Sin campo asignado</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>Contacta al administrador para que te asigne un campo.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-text-900)' }}>
          {loadingField ? '...' : (field?.name ?? 'Mi campo')}
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
          Herramientas de las cuadrillas de tu campo — repórtalas si se dañan o solicita una nueva.
        </p>
      </div>

      {/* Estadisticas propias del campo (sin valores) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Cuadrillas" value={loadingStats ? '...' : String(stats?.num_cuadrillas ?? 0)} color="var(--color-text-900)" />
        <SummaryCard label="Herramientas en campo" value={loadingStats ? '...' : String(stats?.total_herramientas ?? 0)} color="var(--color-primary)" />
        <SummaryCard label="Solicitudes pendientes" value={loadingStats ? '...' : String(stats?.solicitudes_pendientes ?? 0)} color="#f59e0b" />
        <SummaryCard label="Categorías con herramientas" value={loadingStats ? '...' : String(stats?.por_categoria.length ?? 0)} color="#16a34a" />
      </div>

      {/* Distribucion por categoria (cantidades, no valores) */}
      {barCategorias.length > 0 && (
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Herramientas por categoría</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>Cantidad de unidades que tienen tus cuadrillas hoy</p>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(140, barCategorias.length * 36)}>
            <BarChart data={barCategorias} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-text-400)' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-400)' }} width={130} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: 'var(--color-text-900)' }} itemStyle={{ color: 'var(--color-text-900)' }} />
              <Bar dataKey="Cantidad" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cuadrillas del campo */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <Users size={14} style={{ color: 'var(--color-text-400)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Cuadrillas ({cuadrillas.length})</span>
        </div>
        {loadingCuadrillas ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
          </div>
        ) : cuadrillas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Users size={22} style={{ color: 'var(--color-text-400)' }} />
            <p className="text-xs text-center" style={{ color: 'var(--color-text-400)' }}>Todavía no hay cuadrillas registradas en tu campo</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {cuadrillas.map(c => (
              <button
                key={c.id}
                onClick={() => setCuadrillaSel(c)}
                className="flex items-center justify-between gap-3 px-4 py-3 text-left w-full hover:opacity-90 transition-opacity"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>{c.name}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-400)' }}>
                    {c.num_integrantes} integrante{c.num_integrantes !== 1 ? 's' : ''} &middot; {c.herramientas.length} herramienta{c.herramientas.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--color-text-400)' }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mis solicitudes */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <Clock3 size={14} style={{ color: 'var(--color-text-400)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Solicitudes de tu campo ({solicitudes.length})</span>
        </div>
        {loadingSolicitudes ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Inbox size={22} style={{ color: 'var(--color-text-400)' }} />
            <p className="text-xs text-center" style={{ color: 'var(--color-text-400)' }}>
              Sin solicitudes todavía — repórtalas desde cada cuadrilla arriba.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {solicitudes.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                    {s.herramienta.descripcion} <span className="font-normal" style={{ color: 'var(--color-text-400)' }}>&middot; {s.crew.name}</span>
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-400)' }}>
                    {TIPO_SOLICITUD_LABELS[s.tipo]} &middot; {formatDate(s.created_at)}
                    {s.respuesta && <span> &middot; {s.respuesta}</span>}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: `${ESTADO_SOLICITUD_COLORS[s.estado]}22`, color: ESTADO_SOLICITUD_COLORS[s.estado] }}>
                  {ESTADO_SOLICITUD_LABELS[s.estado]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {cuadrillaSel && <CuadrillaSupervisorModal cuadrilla={cuadrillaSel} onClose={() => setCuadrillaSel(null)} />}
    </div>
  )
}

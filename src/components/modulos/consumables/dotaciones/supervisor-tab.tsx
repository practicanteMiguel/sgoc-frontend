'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Loader2, Link2, Copy, Check, Plus, ChevronDown, ChevronUp, User, Calendar, FileText, Eye, X, Image as ImageIcon, FileDown, FileSpreadsheet } from 'lucide-react'
import { useMyDotacionSpace, useCreateOrGetDotacionSpace, useDotacionSolicitudesByToken } from '@/src/hooks/dotaciones/use-dotaciones'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { ESTADO_DOTACION_LABELS, ESTADO_DOTACION_COLORS } from '@/src/types/dotaciones.types'
import type { DotacionSolicitud, Reposicion } from '@/src/types/dotaciones.types'
import { exportDotacionPdf, exportDotacionExcel } from '@/src/lib/dotacion-export'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Reposicion detail row ──────────────────────────────────────────────────
function ReposicionRow({ rep, index }: { rep: Reposicion; index: number }) {
  const [open, setOpen] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{ background: 'var(--color-surface-1)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
            style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-600)' }}
          >
            {index + 1}
          </span>
          <div className="text-left">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
              {rep.empleado.first_name} {rep.empleado.last_name}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>{rep.empleado.position}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {rep.imagenes.length > 0 && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-400)' }}>
              <ImageIcon size={12} />
              {rep.imagenes.length}
            </span>
          )}
          {open ? <ChevronUp size={15} style={{ color: 'var(--color-text-400)' }} /> : <ChevronDown size={15} style={{ color: 'var(--color-text-400)' }} />}
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 flex flex-col gap-3" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-400)' }}>Condicion encontrada</p>
            <p className="text-sm" style={{ color: 'var(--color-text-700)' }}>{rep.condicion_encontrada}</p>
          </div>
          {rep.fecha_entrega && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-400)' }}>Fecha de entrega</p>
              <p className="text-sm" style={{ color: 'var(--color-text-700)' }}>{formatDate(rep.fecha_entrega)}</p>
            </div>
          )}
          {rep.imagenes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-400)' }}>Fotos</p>
              <div className="flex flex-wrap gap-2">
                {rep.imagenes.map(img => (
                  <button
                    key={img.id}
                    onClick={() => setLightbox(img.url)}
                    className="relative overflow-hidden rounded-lg"
                    style={{ width: 72, height: 72, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                  >
                    <Image src={img.url} alt={img.original_name} fill className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-999 flex items-center justify-center p-4"
          style={{ background: 'rgba(4,24,24,0.85)', backdropFilter: 'blur(4px)' }}
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            onClick={() => setLightbox(null)}
          >
            <X size={18} color="#fff" />
          </button>
          <Image
            src={lightbox}
            alt="foto"
            width={1200}
            height={900}
            className="max-w-full max-h-full rounded-xl"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
            unoptimized
          />
        </div>
      )}
    </div>
  )
}

// ── Solicitud detail modal ─────────────────────────────────────────────────
function SolicitudModal({ solicitud, onClose }: { solicitud: DotacionSolicitud; onClose: () => void }) {
  const [loadingPdf, setLoadingPdf]   = useState(false)
  const [loadingXlsx, setLoadingXlsx] = useState(false)

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl flex flex-col overflow-hidden"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(4,24,24,0.25)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: ESTADO_DOTACION_COLORS[solicitud.estado] + '22', color: ESTADO_DOTACION_COLORS[solicitud.estado] }}
              >
                {ESTADO_DOTACION_LABELS[solicitud.estado]}
              </span>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>
              {solicitud.campo?.name ?? 'Solicitud'} - {formatDate(solicitud.fecha)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {solicitud.inspeccion_realizada_por} &middot; {solicitud.cargo_inspector}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Meta */}
        <div className="px-5 py-3 flex gap-6 shrink-0" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <div className="flex items-center gap-1.5">
            <FileText size={13} style={{ color: 'var(--color-text-400)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-600)' }}>Contrato: <strong>{solicitud.contrato}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} style={{ color: 'var(--color-text-400)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-600)' }}>Emitida: <strong>{formatDate(solicitud.created_at)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <User size={13} style={{ color: 'var(--color-text-400)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-600)' }}>{solicitud.reposiciones.length} reposicion{solicitud.reposiciones.length !== 1 ? 'es' : ''}</span>
          </div>
        </div>

        {/* Reposiciones */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-400)' }}>
            Reposiciones ({solicitud.reposiciones.length})
          </p>
          {solicitud.reposiciones.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>Sin reposiciones registradas.</p>
          ) : (
            solicitud.reposiciones.map((rep, i) => (
              <ReposicionRow key={rep.id} rep={rep} index={i} />
            ))
          )}
        </div>

        {/* Export */}
        <div
          className="px-5 py-3 flex gap-2 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <button
            onClick={async () => { setLoadingPdf(true); try { await exportDotacionPdf(solicitud) } finally { setLoadingPdf(false) } }}
            disabled={loadingPdf || loadingXlsx}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
          >
            {loadingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
            PDF
          </button>
          <button
            onClick={async () => { setLoadingXlsx(true); try { await exportDotacionExcel(solicitud) } finally { setLoadingXlsx(false) } }}
            disabled={loadingPdf || loadingXlsx}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}
          >
            {loadingXlsx ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
            Excel
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Main supervisor tab ────────────────────────────────────────────────────
export function SupervisorDotacionTab() {
  const { data: space, isLoading, status } = useMyDotacionSpace()
  const create = useCreateOrGetDotacionSpace()
  const hasSpace = !!(space?.vault_token)
  const { data: solicitudes, isLoading: loadingSols } = useDotacionSolicitudesByToken(hasSpace ? space!.vault_token : null)
  const [copied, setCopied] = useState(false)
  const [selected, setSelected] = useState<DotacionSolicitud | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const hseLink = hasSpace ? `${origin}/dotaciones/${space!.vault_token}` : ''

  function copyLink() {
    if (!hseLink) return
    navigator.clipboard.writeText(hseLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Muestra spinner solo mientras carga por primera vez
  if (isLoading && status === 'pending') return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
    </div>
  )

  // Sin espacio aun (error 404 del backend o data sin vault_token)
  if (!hasSpace) return (
    <div
      className="rounded-xl p-6 flex flex-col gap-4"
      style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <Link2 size={22} style={{ color: 'var(--color-text-400)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Sin espacio generado</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-400)' }}>
            Genera tu espacio para obtener el enlace que compartes con el HSE del campo.
          </p>
        </div>
      </div>
      <button
        onClick={() => create.mutate()}
        disabled={create.isPending}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity w-fit"
        style={{ background: '#1a3a3a', color: '#fff', opacity: create.isPending ? 0.7 : 1 }}
      >
        {create.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        {create.isPending ? 'Generando...' : 'Generar mi espacio'}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Space info card */}
      <div
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-400)' }}>
              Tu espacio - {space!.field?.name ?? ''}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-600)' }}>
              Comparte este enlace con el HSE del campo para que registre las solicitudes de reposicion.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--color-surface-0)', border: '1.5px solid var(--color-border)' }}>
            <Link2 size={14} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
            <span className="text-xs font-mono truncate" style={{ color: 'var(--color-text-600)' }}>{hseLink}</span>
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={
              copied
                ? { background: '#22c55e22', color: '#16a34a', border: '1.5px solid #22c55e44' }
                : { background: 'var(--color-surface-0)', color: 'var(--color-text-600)', border: '1.5px solid var(--color-border)' }
            }
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Solicitudes list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-700)' }}>
            Solicitudes recibidas
          </p>
          {loadingSols && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />}
        </div>

        {!loadingSols && (!solicitudes || solicitudes.length === 0) ? (
          <div
            className="rounded-xl flex flex-col items-center justify-center py-12 text-center gap-2"
            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
          >
            <FileText size={24} style={{ color: 'var(--color-text-400)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
              Aun no hay solicitudes. El HSE debe usar el enlace para registrarlas.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(solicitudes ?? []).map(sol => (
              <div
                key={sol.id}
                className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: ESTADO_DOTACION_COLORS[sol.estado] }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-900)' }}>
                      {sol.inspeccion_realizada_por}
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-400)' }}>
                        {sol.cargo_inspector}
                      </span>
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                      {formatDate(sol.fecha)} &middot; {sol.reposiciones.length} reposicion{sol.reposiciones.length !== 1 ? 'es' : ''} &middot; Contrato {sol.contrato}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: ESTADO_DOTACION_COLORS[sol.estado] + '22', color: ESTADO_DOTACION_COLORS[sol.estado] }}
                  >
                    {ESTADO_DOTACION_LABELS[sol.estado]}
                  </span>
                  <button
                    onClick={() => setSelected(sol)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)' }}
                  >
                    <Eye size={13} />
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <SolicitudModal solicitud={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

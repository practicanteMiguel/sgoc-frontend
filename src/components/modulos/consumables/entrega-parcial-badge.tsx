'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Package } from 'lucide-react'
import { CATEGORIA_LABELS } from '@/src/types/consumables.types'
import type { CategoriaInsumo } from '@/src/types/consumables.types'

export function diasDesde(fechaISO: string): number {
  const start = new Date(fechaISO.includes('T') ? fechaISO : fechaISO + 'T00:00:00')
  if (isNaN(start.getTime())) return 0
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000))
}

export function colorDiasFaltante(dias: number): string {
  if (dias <= 5) return '#16a34a'
  if (dias <= 10) return '#f59e0b'
  return '#ef4444'
}

const FADE_MS = 250
const HOLD_MS = 3000

export function EntregaParcialBadge({
  fechaPrimeraEntrega,
  categoria,
  itemsPendientes,
}: {
  fechaPrimeraEntrega?: string | null
  categoria?: CategoriaInsumo
  itemsPendientes?: number
}) {
  const hasConteo = !!categoria && !!itemsPendientes && itemsPendientes > 0
  const [mostrarDias, setMostrarDias] = useState(true)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!hasConteo) return
    let fadeTimeout: ReturnType<typeof setTimeout>
    const intervalo = setInterval(() => {
      setVisible(false)
      fadeTimeout = setTimeout(() => {
        setMostrarDias((v) => !v)
        setVisible(true)
      }, FADE_MS)
    }, HOLD_MS)
    return () => {
      clearInterval(intervalo)
      clearTimeout(fadeTimeout)
    }
  }, [hasConteo])

  if (!fechaPrimeraEntrega) return null

  const dias = diasDesde(fechaPrimeraEntrega)
  const color = colorDiasFaltante(dias)
  const diasLabel = `${dias} dia${dias !== 1 ? 's' : ''} sin entregar`
  const conteoLabel = hasConteo
    ? `${itemsPendientes} ${CATEGORIA_LABELS[categoria as CategoriaInsumo]} pendiente${itemsPendientes !== 1 ? 's' : ''}`
    : diasLabel

  const mostrarDiasAhora = mostrarDias || !hasConteo
  const Icon = mostrarDiasAhora ? AlertTriangle : Package
  const label = mostrarDiasAhora ? diasLabel : conteoLabel

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: `${color}22`,
        color,
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        width: 176,
        overflow: 'hidden',
      }}
      title={diasLabel}
    >
      <Icon size={11} className="shrink-0" />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  )
}

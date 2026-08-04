'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { CSSProperties } from 'react'
import type { TallaCategoria } from '@/src/types/indumentaria.types'

export type TipoTalla = '' | 'LETRA' | 'NUMERO_ROPA' | 'NUMERO_CALZADO'

export const TALLAS_LETRA = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']
export const TALLAS_NUMERO_ROPA = Array.from({ length: 17 }, (_, i) => String(10 + i * 2)) // 10..42 de 2 en 2
export const TALLAS_NUMERO_CALZADO = Array.from({ length: 34 }, (_, i) => String(10 + i)) // 10..43 de 1 en 1

export const INP_STYLE: CSSProperties = {
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-surface-0)',
  color: 'var(--color-text-900)',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
  width: '100%',
}

export function tallasParaTipo(tipoTalla: TipoTalla): string[] {
  if (tipoTalla === 'LETRA') return TALLAS_LETRA
  if (tipoTalla === 'NUMERO_ROPA') return TALLAS_NUMERO_ROPA
  if (tipoTalla === 'NUMERO_CALZADO') return TALLAS_NUMERO_CALZADO
  return []
}

// Dado un valor de talla ya guardado (sin distincion de tipo), adivina que
// selector mostrar. Los pares (ropa) son un subconjunto de los de calzado,
// asi que ante la duda se prefiere calzado (siempre incluye el valor).
export function inferTipoTalla(talla: string): TipoTalla {
  if (!talla) return ''
  if (TALLAS_LETRA.includes(talla)) return 'LETRA'
  return 'NUMERO_CALZADO'
}

// Mapea nombres del catalogo de indumentaria a una de las 4 categorias de
// talla fijas que maneja el formato HQ-FO-27 (pantalon, camisa, overol, calzado).
const NOMBRE_A_TALLA_CATEGORIA: Record<string, TallaCategoria> = {
  'blue jean': 'PANTALON',
  'camisa m.l.': 'CAMISA',
  'overol': 'OVEROL',
  'botas de cuero': 'CALZADO',
  'botas de caucho': 'CALZADO',
}

export function categoriaParaItem(nombre: string): TallaCategoria | null {
  return NOMBRE_A_TALLA_CATEGORIA[nombre.trim().toLowerCase()] ?? null
}

export function TallaPicker({ tipoTalla, talla, onChangeTipo, onChangeTalla, disabled }: {
  tipoTalla: TipoTalla
  talla: string
  onChangeTipo: (t: TipoTalla) => void
  onChangeTalla: (v: string) => void
  disabled?: boolean
}) {
  const opciones = tallasParaTipo(tipoTalla)
  return (
    <div className="flex items-center gap-2">
      <select
        value={tipoTalla}
        onChange={e => onChangeTipo(e.target.value as TipoTalla)}
        disabled={disabled}
        style={{ ...INP_STYLE, appearance: 'none' as const, width: 150 }}
      >
        <option value="">Tipo de talla...</option>
        <option value="LETRA">Letra (XS - 5XL)</option>
        <option value="NUMERO_ROPA">Numero - ropa</option>
        <option value="NUMERO_CALZADO">Numero - calzado</option>
      </select>
      <select
        value={talla}
        onChange={e => onChangeTalla(e.target.value)}
        disabled={disabled || !tipoTalla}
        style={{ ...INP_STYLE, appearance: 'none' as const, width: 100 }}
      >
        <option value="">Talla...</option>
        {opciones.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  )
}

export function useSignatureCanvas(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [active])

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy }
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
  }

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasStrokes(true)
  }, [])

  const endDraw = useCallback(() => { drawing.current = false }, [])

  function limpiar() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  return { canvasRef, hasStrokes, setHasStrokes, startDraw, draw, endDraw, limpiar }
}

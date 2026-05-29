'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'

interface Props {
  cargo: string
  onCargoChange: (v: string) => void
  onGuardar: (dataUrl: string) => void
  onCancelar?: () => void
}

export function FirmaCanvas({ cargo, onCargoChange, onGuardar, onCancelar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#111'
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
  }, [])

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
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

  function handleLimpiar() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  function handleGuardar() {
    if (!hasStrokes || !cargo.trim()) return
    const dataUrl = canvasRef.current!.toDataURL('image/png')
    onGuardar(dataUrl)
  }

  const inputStyle: React.CSSProperties = {
    border: '1.5px solid var(--color-border)',
    background: 'var(--color-surface-1)',
    color: 'var(--color-text-900)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-400)' }}>
          Cargo *
        </label>
        <input
          required
          value={cargo}
          onChange={(e) => onCargoChange(e.target.value)}
          placeholder="Ej: Supervisor de Planta"
          style={inputStyle}
          onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
          onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-400)' }}>
          Firma *
        </label>
        <div
          style={{ border: '1.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: '#fff', touchAction: 'none' }}
        >
          <canvas
            ref={canvasRef}
            width={500}
            height={180}
            style={{ display: 'block', width: '100%', cursor: 'crosshair', touchAction: 'none' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
          >
            <X size={13} />
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleLimpiar}
          className="px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={handleGuardar}
          disabled={!hasStrokes || !cargo.trim()}
          className="flex-1 py-2 rounded-lg text-xs font-bold"
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            opacity: (!hasStrokes || !cargo.trim()) ? 0.5 : 1,
          }}
        >
          Guardar firma
        </button>
      </div>
    </div>
  )
}

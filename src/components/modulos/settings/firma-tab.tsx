'use client'

import { useState, useRef, useEffect } from 'react'
import { PenLine, Upload, RefreshCw, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/src/stores/auth.store'
import { fetchFirmaUrl, uploadFirma, getCargo, saveCargo, clearCargo } from '@/src/lib/firma'
import { FirmaCanvas } from '@/src/components/ui/firma-canvas'

type Mode = 'idle' | 'draw' | 'upload'

export function FirmaTab() {
  const { user } = useAuthStore()
  const [firmaUrl,  setFirmaUrl]  = useState<string | null>(null)
  const [cargo,     setCargo]     = useState('')
  const [mode,      setMode]      = useState<Mode>('idle')
  const [preview,   setPreview]   = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user?.id) return
    const saved = getCargo(user.id)
    setCargo(saved || user.position || '')
    fetchFirmaUrl().then((url) => {
      setFirmaUrl(url)
      setLoading(false)
    })
  }, [user?.id, user?.position])

  async function handleGuardarDibujo(dataUrl: string) {
    if (!user?.id) return
    setUploading(true)
    setError(null)
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const url  = await uploadFirma(blob)
      saveCargo(user.id, cargo.trim())
      setFirmaUrl(url)
      setMode('idle')
    } catch {
      setError('Error al subir la firma. Intentalo de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleGuardarUpload() {
    if (!preview || !user?.id || !cargo.trim()) return
    setUploading(true)
    setError(null)
    try {
      const blob = await (await fetch(preview)).blob()
      const url  = await uploadFirma(blob)
      saveCargo(user.id, cargo.trim())
      setFirmaUrl(url)
      setMode('idle')
      setPreview(null)
    } catch {
      setError('Error al subir la firma. Intentalo de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  function handleEliminarLocal() {
    if (!user?.id) return
    clearCargo(user.id)
    setFirmaUrl(null)
    setCargo(user.position ?? '')
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface-0)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    padding: '20px 24px',
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
    <div className="max-w-2xl flex flex-col gap-6">

      {/* Header */}
      <div style={cardStyle}>
        <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-400)' }}>
          Mi firma
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-600)' }}>
          Esta firma se usara al generar PDFs de solicitudes de insumos. Se guarda en el servidor.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        </div>
      )}

      {/* Firma guardada */}
      {!loading && firmaUrl && mode === 'idle' && (
        <div style={cardStyle} className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-400)' }}>
            Firma guardada
          </p>
          <div
            className="rounded-lg overflow-hidden flex items-center justify-center"
            style={{ background: '#fff', border: '1px solid var(--color-border)', padding: 12 }}
          >
            <img src={firmaUrl} alt="Firma" style={{ maxHeight: 120, objectFit: 'contain' }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>Cargo</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>{cargo || '-'}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => { setMode('draw'); setError(null) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
            >
              <PenLine size={13} />
              Redibujar
            </button>
            <button
              type="button"
              onClick={() => { setMode('upload'); setPreview(null); setError(null) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
            >
              <Upload size={13} />
              Reemplazar imagen
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !firmaUrl && mode === 'idle' && (
        <div
          className="flex flex-col items-center gap-5 py-10 rounded-xl"
          style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface-0)' }}
        >
          <PenLine size={32} style={{ color: 'var(--color-text-400)' }} />
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Sin firma configurada</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
              Dibuja o sube una imagen para usar en los documentos
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setMode('draw'); setError(null) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <PenLine size={15} />
              Dibujar firma
            </button>
            <button
              type="button"
              onClick={() => { setMode('upload'); setPreview(null); setError(null) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-600)', border: '1px solid var(--color-border)' }}
            >
              <Upload size={15} />
              Subir imagen
            </button>
          </div>
        </div>
      )}

      {/* Draw mode */}
      {mode === 'draw' && (
        <div style={cardStyle} className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-400)' }}>
            Dibujar firma
          </p>
          {uploading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
              <span className="text-sm" style={{ color: 'var(--color-text-600)' }}>Subiendo firma...</span>
            </div>
          ) : (
            <FirmaCanvas
              cargo={cargo}
              onCargoChange={setCargo}
              onGuardar={handleGuardarDibujo}
              onCancelar={() => { setMode('idle'); setError(null) }}
            />
          )}
          {error && <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>{error}</p>}
        </div>
      )}

      {/* Upload mode */}
      {mode === 'upload' && (
        <div style={cardStyle} className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-400)' }}>
            Subir imagen de firma
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-400)' }}>
              Cargo *
            </label>
            <input
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ej: Supervisor de Planta"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)' }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)' }}
            />
          </div>

          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg py-8"
            style={{ border: '1.5px dashed var(--color-border)', background: 'var(--color-surface-1)', cursor: 'pointer' }}
            onClick={() => fileRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" style={{ maxHeight: 120, objectFit: 'contain' }} />
            ) : (
              <>
                <Upload size={24} style={{ color: 'var(--color-text-400)' }} />
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Click para seleccionar imagen</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {preview && !uploading && (
            <button
              type="button"
              onClick={() => { setPreview(null); fileRef.current?.click() }}
              className="flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-lg text-xs hover:opacity-75"
              style={{ color: 'var(--color-text-400)' }}
            >
              <RefreshCw size={12} />
              Cambiar imagen
            </button>
          )}

          {error && <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setMode('idle'); setPreview(null); setError(null) }}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--color-surface-0)', border: '1.5px solid var(--color-border)', color: 'var(--color-text-600)', opacity: uploading ? 0.5 : 1 }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardarUpload}
              disabled={!preview || !cargo.trim() || uploading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                opacity: (!preview || !cargo.trim() || uploading) ? 0.5 : 1,
              }}
            >
              {uploading && <Loader2 size={15} className="animate-spin" />}
              {uploading ? 'Subiendo...' : 'Guardar firma'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

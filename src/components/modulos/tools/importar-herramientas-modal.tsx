'use client'

import { useRef, useState } from 'react'
import { X, Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download } from 'lucide-react'
import type { AxiosError } from 'axios'
import { ModalPortal } from '@/src/components/ui/modal-portal'
import { useBulkImportHerramientas } from '@/src/hooks/herramientas/use-herramientas'
import { descargarPlantillaHerramientas } from '@/src/lib/herramientas-excel'

interface ErrorResponse {
  message?: string | string[]
}

export function ImportarHerramientasModal({ onClose }: { onClose: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const importar = useBulkImportHerramientas()

  const mensaje = (importar.error as AxiosError<ErrorResponse> | null)?.response?.data?.message
  // Una fila -> mensaje simple (ej. "El archivo no tiene filas para importar").
  // Varias filas -> el backend manda un string por fila ("Fila 3: ...").
  const erroresFila = Array.isArray(mensaje) ? mensaje : []
  const mensajeError = !erroresFila.length && mensaje
    ? (Array.isArray(mensaje) ? mensaje[0] : mensaje)
    : null

  function elegirArchivo(f: File | null) {
    setArchivo(f)
    importar.reset()
  }

  function submit() {
    if (!archivo) return
    importar.mutate(archivo, { onSuccess: () => setTimeout(onClose, 1200) })
  }

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>Cargar herramientas desde Excel</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>Crea muchas herramientas de una sola vez</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          <button
            onClick={() => descargarPlantillaHerramientas()}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity self-start"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-700)' }}
          >
            <Download size={13} /> Descargar plantilla vacía
          </button>

          <div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={e => elegirArchivo(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl transition-opacity hover:opacity-90"
              style={{ border: '1.5px dashed var(--color-border)', background: 'var(--color-surface-1)' }}
            >
              <FileSpreadsheet size={26} style={{ color: archivo ? 'var(--color-primary)' : 'var(--color-text-400)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-900)' }}>
                {archivo ? archivo.name : 'Selecciona el archivo Excel lleno (.xlsx)'}
              </p>
              {!archivo && (
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Usa la plantilla de arriba como base</p>
              )}
            </button>
          </div>

          {importar.isSuccess && (
            <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: '#16a34a11', border: '1px solid #16a34a' }}>
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: '#16a34a' }} />
              <p className="text-xs" style={{ color: '#16a34a' }}>
                {importar.data.creadas} herramienta{importar.data.creadas !== 1 ? 's' : ''} importada{importar.data.creadas !== 1 ? 's' : ''} correctamente.
              </p>
            </div>
          )}

          {mensajeError && (
            <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)' }}>
              <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
              <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{mensajeError}</p>
            </div>
          )}

          {erroresFila.length > 0 && (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-danger)' }}>
              <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--color-danger-bg)' }}>
                <AlertTriangle size={14} style={{ color: 'var(--color-danger)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>
                  {erroresFila.length} fila{erroresFila.length !== 1 ? 's' : ''} con error. No se importó nada, corrígelas y vuelve a intentar.
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {erroresFila.map((linea, i) => (
                  <div key={i} className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-700)' }}>
                    {linea}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 flex gap-3 justify-end shrink-0"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-700)' }}>
            Cerrar
          </button>
          <button onClick={submit} disabled={!archivo || importar.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: 'var(--color-primary)', color: '#fff', opacity: (!archivo || importar.isPending) ? 0.6 : 1 }}>
            {importar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {importar.isPending ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}

'use client'

import { useState } from 'react'
import { Building2, Loader2, Trash2 } from 'lucide-react'
import { useFields } from '@/src/hooks/reports/use-fields'
import { useAuthStore } from '@/src/stores/auth.store'
import { useClearEvidenceCache } from '@/src/hooks/compliance/use-evidences'
import { EvidencesView } from './evidences-view'

const CONTRACT_FIELD_ID = 'dc9c6e07-e9f9-4184-ad1e-65386a7986be'

export function CoordinatorEvidencesView() {
  const [fieldId, setFieldId]           = useState('')
  const { data: fieldsData, isLoading } = useFields()
  const { user }                        = useAuthStore()
  const clearCache                      = useClearEvidenceCache()
  const fields = (fieldsData?.data ?? []).filter((f) => f.id !== CONTRACT_FIELD_ID)
  const isAdmin = user?.roles?.includes('admin')

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-display font-semibold text-sm" style={{ color: 'var(--color-text-900)' }}>
            Evidencias por Planta
          </h4>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
            Gestiona los archivos subidos por cada planta a Google Drive
          </p>
        </div>

        {/* Admin cache controls */}
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            {fieldId && (
              <button
                onClick={() => clearCache.mutate(fieldId)}
                disabled={clearCache.isPending}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-600)',
                }}
                title="Limpiar cache de esta planta"
              >
                {clearCache.isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Cache planta
              </button>
            )}
            <button
              onClick={() => clearCache.mutate(undefined)}
              disabled={clearCache.isPending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-600)',
              }}
              title="Limpiar cache general de Drive"
            >
              {clearCache.isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Cache general
            </button>
          </div>
        )}
      </div>

      {/* Plant selector */}
      <div className="flex items-center gap-3">
        <Building2 size={15} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-text-400)' }} />
        ) : (
          <select
            value={fieldId}
            onChange={(e) => setFieldId(e.target.value)}
            className="rounded-xl px-4 py-2 text-sm"
            style={{
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-900)',
              minWidth: 220,
            }}
          >
            <option value="">Seleccionar planta...</option>
            {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
      </div>

      {/* Evidences view */}
      {fieldId ? (
        <EvidencesView fieldId={fieldId} canDelete={true} />
      ) : (
        <div
          className="flex flex-col items-center py-12 rounded-xl"
          style={{ background: 'var(--color-surface-1)', border: '1px dashed var(--color-border)' }}
        >
          <Building2 size={22} className="mb-2" style={{ color: 'var(--color-text-400)' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-400)' }}>
            Selecciona una planta para ver sus evidencias
          </p>
        </div>
      )}
    </div>
  )
}

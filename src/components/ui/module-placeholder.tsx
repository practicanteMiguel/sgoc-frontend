'use client';

import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';
import { usePermissions } from '@/src/hooks/auth/use-permissions';

interface Feature {
  label:       string;
  description: string;
}

interface ModulePlaceholderProps {
  moduleSlug:  string;
  icon:        LucideIcon;
  title:       string;
  description: string;
  features:    Feature[];
  phase?:      string;
}

export function ModulePlaceholder({
  moduleSlug,
  icon: Icon,
  title,
  description,
  features,
  phase = 'Fase 2',
}: ModulePlaceholderProps) {
  const { canCreate, canEdit, canDelete, canExport } = usePermissions(moduleSlug);

  return (
    <div className="max-w-8xl p-10 mx-auto animate-fade-in">

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'var(--color-secondary-muted)',
              color:      'var(--color-secondary)',
            }}
          >
            <Icon size={22} strokeWidth={1.8} />
          </div>
          <div>
            <h2
              className="font-display text-xl font-semibold"
             
            >
              {title}
            </h2>
            <p className="text-sm mt-0.5"
               style={{ color: 'var(--color-text-400)' }}>
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'Crear',    active: canCreate },
            { label: 'Editar',    active: canEdit   },
            { label: 'Eliminar',  active: canDelete },
            { label: 'Exportar',  active: canExport },
          ].map((p) => (
            <span
              key={p.label}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: p.active
                  ? 'var(--color-secondary-muted)'
                  : 'var(--color-surface-2)',
                color: p.active
                  ? 'var(--color-secondary)'
                  : 'var(--color-text-200)',
                border: '1px solid',
                borderColor: p.active
                  ? 'rgba(255,95,3,0.2)'
                  : 'var(--color-border)',
              }}
            >
              {p.active ? '✓' : '—'} {p.label}
            </span>
          ))}
        </div>
      </div>

   
      <div
        className="rounded-xl p-6 mb-6 flex items-center gap-4"
        style={{
          background:   'var(--color-surface-0)',
          border:       '1.5px dashed var(--color-border-strong)',
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}
        >
          <Construction size={20} />
        </div>
        <div>
          <p
            className="text-sm font-semibold font-display"
            style={{ color: 'var(--color-text-900)' }}
          >
            Módulo en desarrollo — {phase}
          </p>
          <p className="text-xs mt-0.5"
             style={{ color: 'var(--color-text-400)' }}>
            Este módulo estará disponible próximamente con todas sus funcionalidades.
          </p>
        </div>
        <span
          className="ml-auto text-xs font-mono px-3 py-1.5 rounded-full shrink-0"
          style={{
            background: 'var(--color-warning-bg)',
            color:      'var(--color-warning)',
            border:     '1px solid rgba(217,119,6,0.2)',
          }}
        >
          {phase}
        </span>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
        }}
      >
        <div
          className="px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: 'var(--color-text-400)' }}
          >
            Funcionalidades planificadas
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-5 py-4"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background:  'var(--color-secondary-muted)',
                  color:       'var(--color-secondary)',
                  fontSize:    '10px',
                  fontWeight:  '700',
                }}
              >
                {i + 1}
              </div>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-900)' }}
                >
                  {f.label}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--color-text-400)' }}
                >
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
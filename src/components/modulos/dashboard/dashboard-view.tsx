'use client';

import { useState } from 'react';
import { useAuthStore } from '@/src/stores/auth.store';
import { useHasHydrated } from '@/src/hooks/auth/use-has-hydrated';
import { useMyModules } from '@/src/hooks/dashboard/use-modules';
import { MODULE_CONFIG } from '@/src/config/modules.config';
import { ROLE_LABELS } from '@/src/lib/utils';
import { ReportsDashboardPanel } from './reports-panel';
import { SupervisorDashboardPanel } from './supervisor-panel';
import { ChevronRight } from 'lucide-react';

// Panels available per module slug (grow as modules get dashboards)
const MODULE_PANELS: Partial<Record<string, React.ComponentType>> = {
  reports: ReportsDashboardPanel,
}

export function DashboardView() {
  const hasHydrated                  = useHasHydrated();
  const { user }                     = useAuthStore();
  const { data: modules, isLoading } = useMyModules();
  const [activeSlug, setActiveSlug]  = useState<string | null>(null);

  if (!hasHydrated) return null;

  const isSupervisor = user?.roles?.includes('supervisor') ?? false;
  const roleLabel    = user?.roles?.[0] ? (ROLE_LABELS[user.roles[0]] ?? user.roles[0]) : '';

  // ── Supervisor: full-width personal plant panel ──────────────────────────────
  if (isSupervisor) {
    return (
      <div className="max-w-8xl mx-auto px-6 sm:px-10 py-8">
        <div className="mb-6 animate-fade-in">
          <p className="text-xs font-medium uppercase tracking-widest mb-0.5"
             style={{ color: 'var(--color-secondary)' }}>
            {roleLabel}
          </p>
          <h1 className="font-display text-2xl font-semibold">
            Bienvenido, {user?.first_name}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
            Aqui puedes ver el estado de tu planta de un vistazo
          </p>
        </div>
        <div
          className="rounded-2xl p-5 sm:p-6 animate-fade-in"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
        >
          <SupervisorDashboardPanel />
        </div>
      </div>
    );
  }

  // ── Coordinator / admin / module_manager: module strip + expandable panels ──
  const gridModules = modules?.filter(m => m.slug !== 'dashboard') ?? [];

  function handleCardClick(slug: string) {
    if (MODULE_PANELS[slug]) setActiveSlug(prev => prev === slug ? null : slug);
  }

  const ActivePanel = activeSlug ? MODULE_PANELS[activeSlug] : null;

  return (
    <div className="max-w-8xl mx-auto px-6 sm:px-10 py-8">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <p className="text-xs font-medium uppercase tracking-widest mb-0.5"
           style={{ color: 'var(--color-secondary)' }}>
          {roleLabel}
        </p>
        <h1 className="font-display text-2xl font-semibold">
          Bienvenido, {user?.first_name}
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
          Selecciona un modulo para ver sus estadisticas
        </p>
      </div>

      {/* Compact module strip */}
      {isLoading && (
        <div className="flex flex-wrap gap-2 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-32 rounded-xl animate-pulse"
                 style={{ background: 'var(--color-surface-2)' }} />
          ))}
        </div>
      )}

      {!isLoading && gridModules.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {gridModules.map(mod => {
            const cfg      = MODULE_CONFIG[mod.slug];
            if (!cfg) return null;
            const Icon     = cfg.icon;
            const hasPanel = !!MODULE_PANELS[mod.slug];
            const isActive = activeSlug === mod.slug;
            return (
              <button
                key={mod.slug}
                onClick={() => handleCardClick(mod.slug)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
                style={{
                  background:   isActive ? 'var(--color-secondary)' : 'var(--color-surface-1)',
                  border:       `1px solid ${isActive ? 'var(--color-secondary)' : 'var(--color-border)'}`,
                  color:        isActive ? '#fff' : 'var(--color-text-600)',
                  cursor:       hasPanel ? 'pointer' : 'default',
                  opacity:      hasPanel ? 1 : 0.55,
                }}
              >
                <Icon size={14} strokeWidth={1.8} />
                {cfg.label}
                {hasPanel && (
                  <ChevronRight
                    size={12}
                    style={{
                      transform:  isActive ? 'rotate(90deg)' : 'rotate(0)',
                      transition: 'transform 0.2s',
                      opacity:    0.7,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Active panel */}
      {ActivePanel && (
        <div
          className="rounded-2xl p-5 sm:p-6 animate-fade-in"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
        >
          <ActivePanel />
        </div>
      )}

      {/* Empty state */}
      {!ActivePanel && !isLoading && gridModules.length > 0 && (
        <div
          className="flex flex-col items-center py-20 rounded-2xl"
          style={{ background: 'var(--color-surface-0)', border: '1px dashed var(--color-border)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-400)' }}>
            Selecciona un modulo para ver sus estadisticas
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-400)' }}>
            Los modulos con la flecha tienen panel de datos disponible
          </p>
        </div>
      )}

      {!isLoading && gridModules.length === 0 && (
        <div
          className="flex flex-col items-center py-20 rounded-2xl"
          style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
            Sin modulos asignados. Contacta al administrador.
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useAuthStore } from '@/src/stores/auth.store';
import { useMyModules } from '@/src/hooks/dashboard/use-modules';
import { MODULE_CONFIG } from '@/src/config/modules.config';
import { ROLE_LABELS } from '@/src/lib/utils';

export function DashboardView() {
  const { user }                     = useAuthStore();
  const { data: modules, isLoading } = useMyModules();

  const roleLabel = user?.roles?.[0]
    ? (ROLE_LABELS[user.roles[0]] ?? user.roles[0])
    : '';

  const gridModules = modules?.filter((m) => m.slug !== 'dashboard') ?? [];

  return (
    <div className="max-w-8xl mx-auto p-10">
      <div className="mb-8 animate-fade-in">
        <p className="text-xs font-medium uppercase tracking-widest mb-1"
           style={{ color: 'var(--color-secondary)' }}>
          {roleLabel}
        </p>
        <h1 className="font-display text-2xl font-semibold"
            >
          Bienvenido, {user?.first_name}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-400)' }}>
          Seleccioná un módulo para comenzar a operar
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse"
                 style={{ background: 'var(--color-surface-2)' }} />
          ))}
        </div>
      )}

      {!isLoading && gridModules.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger">
          {gridModules.map((mod) => {
            const cfg = MODULE_CONFIG[mod.slug];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <Link
                key={mod.slug}
                href={mod.route}
                className="group flex flex-col gap-3 p-5 rounded-xl transition-all duration-200 animate-fade-in"
                style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--color-secondary)';
                  el.style.transform   = 'translateY(-2px)';
                  el.style.boxShadow   = '0 4px 16px rgba(255,95,3,0.12)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--color-border)';
                  el.style.transform   = 'translateY(0)';
                  el.style.boxShadow   = 'none';
                }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                     style={{ background: 'var(--color-secondary-muted)', color: 'var(--color-secondary)' }}>
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-semibold"
                     >
                    {cfg.label}
                  </p>
                  <p className="text-xs mt-0.5"
                     style={{ color: 'var(--color-text-400)' }}>
                    {mod.can_create === undefined || mod.can_create ? 'Gestión completa' : 'Solo lectura'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!isLoading && gridModules.length === 0 && (
        <div className="flex flex-col items-center py-20 rounded-xl"
             style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
            Sin módulos asignados. Contactá al administrador.
          </p>
        </div>
      )}
    </div>
  );
}
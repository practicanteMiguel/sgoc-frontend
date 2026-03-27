'use client';

import { useMyModules } from '@/src/hooks/dashboard/use-modules';
import { useHasHydrated } from '@/src/hooks/auth/use-has-hydrated';
import { ShieldOff, Loader2 } from 'lucide-react';
import { MODULE_CONFIG } from '@/src/config/modules.config';

interface ModuleGuardProps {
  slug:     string;        
  children: React.ReactNode;
}

export function ModuleGuard({ slug, children }: ModuleGuardProps) {
  const hasHydrated                          = useHasHydrated();
  const { data: modules, isLoading }         = useMyModules();

  // Esperando hidratación o carga
  if (!hasHydrated || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2
          size={22}
          className="animate-spin"
          style={{ color: 'var(--color-text-400)' }}
        />
      </div>
    );
  }

  const hasAccess = modules?.some((m) => m.slug === slug);

  if (!hasAccess) {
    const cfg = MODULE_CONFIG[slug];
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--color-danger-bg)' }}
          >
            <ShieldOff size={26} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div>
            <p
              className="font-display font-semibold text-lg"
              style={{ color: 'var(--color-primary)' }}
            >
              Acceso restringido
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--color-text-400)' }}
            >
              No tenés permisos para ver
              {cfg ? ` el módulo de ${cfg.label}` : ' este módulo'}.
              Contactá al administrador si creés que es un error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
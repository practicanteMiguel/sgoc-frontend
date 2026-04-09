'use client';

import { Clock } from 'lucide-react';
import { useAuthStore } from '@/src/stores/auth.store';
import { useHasHydrated } from '@/src/hooks/auth/use-has-hydrated';
import { FieldsManagement } from './management/fields-management';

export function ReportsView() {
  const hasHydrated = useHasHydrated();
  const { user }    = useAuthStore();

  if (!hasHydrated) return null;

  if (user?.roles?.includes('supervisor')) {
    return <SupervisorPlaceholder />;
  }

  return <FieldsManagement />;
}

function SupervisorPlaceholder() {
  return (
    <div className="max-w-8xl p-10 mx-auto animate-fade-in">
      <div
        className="flex flex-col items-center justify-center py-24 rounded-xl"
        style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <Clock size={24} style={{ color: 'var(--color-text-400)' }} />
        </div>
        <h3 className="font-display font-semibold text-base mb-1"
            style={{ color: 'var(--color-text-900)' }}>
          Proximamente
        </h3>
        <p
          className="text-sm text-center max-w-xs"
          style={{ color: 'var(--color-text-400)' }}
        >
          El contenido de reportes para supervisores estara disponible en breve.
        </p>
      </div>
    </div>
  );
}

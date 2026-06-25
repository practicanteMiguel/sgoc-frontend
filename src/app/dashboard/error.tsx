'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard]', error);
  }, [error]);

  return (
    <div
      className="flex flex-1 items-center justify-center p-8"
      style={{ background: 'var(--color-surface-1)' }}
    >
      <div className="text-center max-w-sm">
        <p
          className="text-sm font-mono mb-1"
          style={{ color: 'var(--color-danger)' }}
        >
          Error inesperado
        </p>
        <p
          className="text-xs mb-6"
          style={{ color: 'var(--color-text-400)' }}
        >
          {error.message ?? 'Ocurrió un problema al cargar este módulo.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-brand)', color: '#fff' }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

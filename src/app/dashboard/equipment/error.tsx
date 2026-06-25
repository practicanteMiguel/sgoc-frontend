'use client';

import { useEffect } from 'react';

export default function EquipmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error('[equipment]', error); }, [error]);

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
          Error en Equipos
        </p>
        <p
          className="text-xs mb-6"
          style={{ color: 'var(--color-text-400)' }}
        >
          {error.message ?? 'Ocurrio un problema al cargar el modulo de equipos.'}
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

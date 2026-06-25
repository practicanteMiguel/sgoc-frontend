'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[auth]', error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: 'var(--color-surface-0)' }}
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
          {error.message ?? 'Ocurrió un problema al cargar la página de autenticación.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-brand)', color: '#fff' }}
          >
            Reintentar
          </button>
          <button
            onClick={() => router.replace('/auth/login')}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-600)',
            }}
          >
            Ir al login
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="text-center max-w-sm">
        <p className="text-sm font-mono mb-1 text-red-600">Error inesperado</p>
        <p className="text-xs mb-6 text-gray-500">
          {error.message ?? 'Ocurrió un problema. Por favor intenta de nuevo.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

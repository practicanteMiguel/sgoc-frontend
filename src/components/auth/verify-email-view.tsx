'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useVerifyEmail } from '@/src/hooks/auth/use-auth';

export function VerifyEmailView() {
  const params    = useSearchParams();
  const router    = useRouter();
  const token     = params.get('token');
  const verify    = useVerifyEmail(token);

  useEffect(() => {
    if (token) verify.mutate();
  }, [token]);

  useEffect(() => {
    if (verify.isSuccess) {
      const t = setTimeout(() => router.replace('/auth/login'), 3000);
      return () => clearTimeout(t);
    }
  }, [verify.isSuccess, router]);

  return (
    <div className="flex flex-1 items-center justify-center p-8"
         style={{ background: 'var(--color-surface-0)' }}>
      <div className="text-center max-w-sm animate-fade-in">

        {verify.isPending && (
          <>
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                 style={{ background: 'var(--color-brand-muted)' }}>
              <Loader2 size={24} className="animate-spin"
                       style={{ color: 'var(--color-brand)' }} />
            </div>
            <h2 className="text-lg font-bold font-mono mb-2"
                style={{ color: 'var(--color-text-900)' }}>
              Verificando correo...
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
              Estamos validando tu cuenta
            </p>
          </>
        )}

        {verify.isSuccess && (
          <>
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                 style={{ background: 'var(--color-success-bg)' }}>
              <CheckCircle2 size={24} style={{ color: 'var(--color-success)' }} />
            </div>
            <h2 className="text-lg font-bold font-mono mb-2"
                style={{ color: 'var(--color-text-900)' }}>
              ¡Correo verificado!
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-400)' }}>
              {(verify.data as any)?.message}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-200)' }}>
              Redirigiendo al login en 3 segundos...
            </p>
          </>
        )}

        {verify.isError && (
          <>
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                 style={{ background: 'var(--color-danger-bg)' }}>
              <XCircle size={24} style={{ color: 'var(--color-danger)' }} />
            </div>
            <h2 className="text-lg font-bold font-mono mb-2"
                style={{ color: 'var(--color-text-900)' }}>
              Error de verificación
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-400)' }}>
              {(verify.error as any)?.response?.data?.message ?? 'Token inválido o expirado'}
            </p>
            <button
              onClick={() => router.replace('/auth/login')}
              className="px-6 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-brand)', color: '#fff' }}
            >
              Ir al login
            </button>
          </>
        )}

      </div>
    </div>
  );
}
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/stores/auth.store';
import { useHasHydrated } from '@/src/hooks/auth/use-has-hydrated';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const hasHydrated = useHasHydrated(); // 👈

  useEffect(() => {
    if (!hasHydrated) return; 

    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    if (user?.is_first_login &&
        !window.location.pathname.includes('change-password')) {
      router.replace('/auth/change-password');
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  
  if (!hasHydrated) {
    return <Spinner mensaje="Cargando..." />;
  }


  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}


function Spinner({ mensaje }: { mensaje: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'var(--color-surface-1)' }}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-brand)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
          {mensaje}
        </p>
      </div>
    </div>
  );
}
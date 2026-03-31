'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/src/stores/auth.store';
import { useSocket } from '@/src/hooks/sockets/use-socket';


function SocketProvider() {

  useSocket();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime:            60 * 1000,
          retry:                1,
          refetchOnWindowFocus: false,
          gcTime:               0,
        },
      },
    })
  );

  const { theme } = useAuthStore();

  useEffect(() => {
    const root = document.documentElement;
    theme === 'dark'
      ? root.classList.add('dark')
      : root.classList.remove('dark');
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
     
      <SocketProvider />

      {children}

      <Toaster
        position="top-right"
        richColors
        expand
        toastOptions={{
          style: {
            fontFamily: 'var(--font-sans)',
            fontSize:   '14px',
          },
        }}
      />
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
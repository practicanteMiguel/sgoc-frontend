import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/providers/providers';

export const metadata: Metadata = {
  title:       'Plataforma de Gestión',
  description: 'Sistema de gestión operativa de contratos petroleros',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
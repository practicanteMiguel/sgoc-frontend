import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/providers/providers';

export const metadata: Metadata = {
  title:       'Gestión Operativa | Servicios Asociados SAS',
  description: 'Sistema de gestión operativa de contratos petroleros',
  icons: {
    icon:  '/assets/logo-icon.png',
    apple: '/assets/logo-icon.png',
  },
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
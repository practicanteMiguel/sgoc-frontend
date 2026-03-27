'use client';
import { AuthGuard } from '@/src/components/auth/auth-guard';
import { Sidebar } from '@/src/components/layout/sidebar';
import { Header } from '@/src/components/layout/header';
import { useState } from 'react';

function DashboardShell({
  children,
}: {
    children: React.ReactNode;
  }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggle = () => setMobileOpen((v) => !v);
  return (
    <div
      className='flex h-screen overflow-hidden'
      style={{ background: 'var(--color-surface-0)' }}
    >
      <Sidebar mobileOpen={mobileOpen} onMobileToggle={toggle} />
      <div className='flex-1 flex flex-col overflow-hidden'>
        <Header onMenuClick={toggle} />
        <main className='flex-1 overflow-auto'>{children}</main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
     <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  href:       string;
  label:      string;
  icon:       LucideIcon;
  collapsed:  boolean;
  onClick?:   () => void;
}

export function SidebarItem({
  href, label, icon: Icon, collapsed, onClick,
}: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 select-none"
      style={
        isActive
          ? {
              background: 'var(--sidebar-active-bg)',
              color:      'var(--sidebar-active-text)',
            }
          : {
              color: 'var(--sidebar-text)',
            }
      }
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    >
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
          style={{ background: 'rgba(255,255,255,0.5)' }}
        />
      )}
      <Icon
        size={18}
        strokeWidth={isActive ? 2.2 : 1.8}
        className="flex-shrink-0 transition-transform duration-150 group-hover:scale-110"
      />
      {!collapsed && (
        <span className="text-sm font-medium truncate leading-none">
          {label}
        </span>
      )}
    </Link>
  );
}
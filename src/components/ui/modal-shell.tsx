'use client';

import { X } from 'lucide-react';
import { ModalPortal } from './modal-portal';

const MAX_WIDTH = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
} as const;

interface ModalShellProps {
  onClose:    () => void;
  size?:      keyof typeof MAX_WIDTH;
  maxHeight?: string;
  children:   React.ReactNode;
}

export function ModalShell({ onClose, size = 'md', maxHeight, children }: ModalShellProps) {
  return (
    <ModalPortal onClose={onClose}>
      <div
        className={`w-full ${MAX_WIDTH[size]} rounded-2xl overflow-hidden flex flex-col`}
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 24px 64px rgba(0,0,0,0.22)',
          ...(maxHeight ? { maxHeight } : {}),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </ModalPortal>
  );
}

interface ModalHeaderProps {
  title:    string;
  subtitle?: string;
  onClose:  () => void;
}

export function ModalHeader({ title, subtitle, onClose }: ModalHeaderProps) {
  return (
    <div
      className="px-5 py-4 flex items-start justify-between gap-3 shrink-0"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-900)' }}>{title}</p>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>{subtitle}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:opacity-70 transition-opacity shrink-0"
        style={{ color: 'var(--color-text-400)' }}
      >
        <X size={18} />
      </button>
    </div>
  );
}

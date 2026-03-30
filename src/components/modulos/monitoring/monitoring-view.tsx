'use client';

import { Activity } from 'lucide-react';
import { AuditLogsList } from './audit-log-list';

export function MonitoringView() {
  return (
    <div className="max-w-8xl p-10 mx-auto animate-fade-in">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--color-secondary-muted)', color: 'var(--color-secondary)' }}
          >
            <Activity size={18} strokeWidth={1.8} />
          </div>
          <div>
            <h2
              className="font-display text-xl font-semibold"
              style={{ color: 'var(--color-secundary)' }}
            >
              Monitoreo Operativo
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
              Indicadores en tiempo real del estado de la operación
            </p>
          </div>
        </div>
      </div>

      

      {/* Registro de actividad */}
      <div
        className="rounded-xl p-5"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
        }}
      >
        <AuditLogsList />
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, FileX } from 'lucide-react';
import { useAuditLogs } from '@/src/hooks/monitoring/use-audit-log';
import { AuditLogItem } from './audit-log-item';

export function AuditLogsList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useAuditLogs(page);

  const totalPages = data?.pages ?? 1;
  const total      = data?.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-secundary)' }}>
            Registro de actividad
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
            {isLoading ? 'Cargando...' : `${total} eventos registrados en el sistema`}
          </p>
        </div>
        {isFetching && !isLoading && (
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-2)' }} />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="flex flex-col items-center py-16 rounded-xl" style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)' }}>
          <FileX size={24} style={{ color: 'var(--color-text-400)' }} />
          <p className="text-sm mt-3" style={{ color: 'var(--color-text-400)' }}>No hay registros de actividad</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {data?.data.map((log) => <AuditLogItem key={log.id} log={log} />)}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs" style={{ color: 'var(--color-text-400)' }}>
            Pagina {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70 disabled:opacity-30"
              style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
            >
              <ChevronLeft size={14} />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`e-${idx}`} className="text-xs px-1" style={{ color: 'var(--color-text-400)' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      disabled={isFetching}
                      className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                      style={page === p
                        ? { background: 'var(--color-primary)', color: '#fff' }
                        : { background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }
                      }
                    >
                      {p}
                    </button>
                  ),
                )}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70 disabled:opacity-30"
              style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

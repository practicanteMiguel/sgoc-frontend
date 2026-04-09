'use client';

import { useState } from 'react';
import { X, Loader2, UserCheck } from 'lucide-react';
import { useAssignSupervisor } from '@/src/hooks/reports/use-fields';
import { useUsers } from '@/src/hooks/users/use-users';
import { ModalPortal } from '@/src/components/ui/modal-portal';
import { getInitials } from '@/src/lib/utils';
import type { Field } from '@/src/types/reports.types';

interface AssignSupervisorModalProps {
  field:   Field;
  onClose: () => void;
}

export function AssignSupervisorModal({ field, onClose }: AssignSupervisorModalProps) {
  const [selectedId, setSelectedId] = useState<string>(field.supervisor?.id ?? '');
  const assign = useAssignSupervisor();

  const { data: usersData, isLoading } = useUsers(1, 200);

  const supervisors = (usersData?.data ?? []).filter((u) =>
    u.user_roles?.some((r) => r.role?.slug === 'supervisor'),
  );

  const handleSubmit = () => {
    if (!selectedId) return;
    assign.mutate({ fieldId: field.id, user_id: selectedId }, { onSuccess: onClose });
  };

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-md rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
          maxHeight:  '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h3 className="font-display font-semibold text-base"
                style={{ color: 'var(--color-secundary)' }}>
              Asignar supervisor
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              Planta: {field.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-all"
            style={{ color: 'var(--color-text-400)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
            </div>
          ) : supervisors.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-400)' }}>
              No hay usuarios con rol supervisor registrados
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {supervisors.map((u) => {
                const isSelected = selectedId === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className="flex items-center gap-3 p-3 rounded-lg text-left transition-all"
                    style={{
                      background: isSelected ? 'var(--color-secondary-muted)' : 'var(--color-surface-1)',
                      border:     `1.5px solid ${isSelected ? 'var(--color-secondary)' : 'var(--color-border)'}`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
                      style={{
                        background: isSelected ? 'var(--color-secondary)' : 'var(--color-surface-2)',
                        color:      isSelected ? '#fff' : 'var(--color-text-400)',
                      }}
                    >
                      {getInitials(u.first_name, u.last_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate"
                         style={{ color: 'var(--color-text-900)' }}>
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-400)' }}>
                        {u.position} - {u.email}
                      </p>
                    </div>
                    {isSelected && (
                      <UserCheck size={16} style={{ color: 'var(--color-secondary)', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="flex gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
            style={{
              background: 'var(--color-surface-2)',
              border:     '1px solid var(--color-border)',
              color:      'var(--color-text-600)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedId || assign.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: 'var(--color-primary)',
              color:      '#fff',
              opacity:    (!selectedId || assign.isPending) ? 0.6 : 1,
            }}
          >
            {assign.isPending && <Loader2 size={14} className="animate-spin" />}
            {assign.isPending ? 'Asignando...' : 'Asignar supervisor'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

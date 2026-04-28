'use client';

import { useState } from 'react';
import { useAuthStore } from '@/src/stores/auth.store';
import { useHasHydrated } from '@/src/hooks/auth/use-has-hydrated';
import { FieldsManagement } from './management/fields-management';
import { SupervisorComplianceView } from './compliance/supervisor/supervisor-compliance-view';
import { CoordinatorEvidencesView } from './compliance/evidences/coordinator-evidences-view';
import { CoordinatorActivitiesView } from './activities/coordinator-activities-view';
import { CoordinatorViasView } from './vias/coordinator-vias-view';

type CoordTab = 'empleados' | 'evidencias' | 'actividades' | 'vias'

const TAB_LABELS: Record<CoordTab, string> = {
  empleados:   'Empleados',
  evidencias:  'Evidencias',
  actividades: 'Actividades',
  vias:        'Vias',
}

export function ReportsView() {
  const hasHydrated  = useHasHydrated();
  const { user }     = useAuthStore();
  const [tab, setTab] = useState<CoordTab>('empleados');

  if (!hasHydrated) return null;

  if (user?.roles?.includes('supervisor')) {
    return <SupervisorComplianceView />;
  }

  if (user?.roles?.includes('coordinator') || user?.roles?.includes('module_manager') || user?.roles?.includes('admin')) {
    return (
      <>
        <div className="max-w-8xl px-6 sm:px-10 pt-6 sm:pt-8 mx-auto">
          <div
            className="flex items-center gap-1 rounded-xl p-1 w-fit"
            style={{ background: 'var(--color-surface-2)' }}
          >
            {(['empleados', 'evidencias', 'actividades', 'vias'] as CoordTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: tab === t ? 'var(--color-surface-0)' : 'transparent',
                  color:      tab === t ? 'var(--color-text-900)' : 'var(--color-text-400)',
                }}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {tab === 'empleados' && <FieldsManagement />}

        {tab === 'evidencias' && (
          <div className="max-w-8xl px-6 sm:px-10 py-8 mx-auto">
            <CoordinatorEvidencesView />
          </div>
        )}

        {tab === 'actividades' && (
          <div className="max-w-8xl px-6 sm:px-10 py-8 mx-auto">
            <CoordinatorActivitiesView />
          </div>
        )}

        {tab === 'vias' && (
          <div className="max-w-8xl px-6 sm:px-10 py-8 mx-auto">
            <CoordinatorViasView />
          </div>
        )}
      </>
    );
  }

  return <FieldsManagement />;
}

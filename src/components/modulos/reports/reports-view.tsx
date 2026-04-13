'use client';

import { useAuthStore } from '@/src/stores/auth.store';
import { useHasHydrated } from '@/src/hooks/auth/use-has-hydrated';
import { FieldsManagement } from './management/fields-management';
import { SupervisorComplianceView } from './compliance/supervisor/supervisor-compliance-view';

export function ReportsView() {
  const hasHydrated = useHasHydrated();
  const { user }    = useAuthStore();

  if (!hasHydrated) return null;

  if (user?.roles?.includes('supervisor')) {
    return <SupervisorComplianceView />;
  }

  return <FieldsManagement />;
}

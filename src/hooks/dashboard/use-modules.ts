import { useQuery } from '@tanstack/react-query';
import { api } from '@/src/lib/axios';
import { useAuthStore } from '@/src/stores/auth.store';
import type { AppModule } from '@/src/types/module.types';

// Módulos accesibles para el usuario — alimenta el sidebar
export function useMyModules() {
  const { isAuthenticated,user } = useAuthStore();

  return useQuery({
    queryKey: ['modules', 'my-access', user?.id],
    queryFn:   async () => {
      const { data: raw } = await api.get('/modules/my-access');
      const list: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);

      return list.map((m): AppModule => ({
        id:          m.id,
        name:        m.name,
        slug:        m.slug,
        icon:        m.icon,
        route:       m.route,
        order_index: m.order_index ?? 0,
        is_active:   m.is_active   ?? true,
        is_core:     m.is_core     ?? false,
        can_create:  m.can_create,
        can_edit:    m.can_edit,
        can_delete:  m.can_delete,
        can_export:  m.can_export,
      }));
    },
    enabled:  isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, 
  });
}
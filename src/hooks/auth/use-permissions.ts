import { useMyModules } from "../dashboard/use-modules";
import { useAuthStore } from '@/src/stores/auth.store';

// Retorna los flags de acceso para un módulo específico
export function usePermissions(moduleSlug: string) {
  const { data: modules } = useMyModules();
  const { user }          = useAuthStore();

  // Admin tiene acceso total siempre
  const isAdmin = user?.roles?.includes('admin');
  if (isAdmin) {
    return {
    
      canCreate: true,
      canEdit:   true,
      canDelete: true,
      canExport: true,
    };
  }

  const mod = modules?.find((m) => m.slug === moduleSlug);
  if (!mod) {
    return {
      
      canCreate: false,
      canEdit:   false,
      canDelete: false,
      canExport: false,
    };
  }

  return {
   
    canCreate: mod.can_create,
    canEdit:   mod.can_edit,
    canDelete: mod.can_delete,
    canExport: mod.can_export,
  };
}
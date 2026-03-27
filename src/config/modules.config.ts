import {
  LayoutDashboard, Truck, Package, Wrench,
  Settings2, FileBarChart, Activity,
  Users, Settings,
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

export interface ModuleConfig {
  slug:  string;
  icon:  LucideIcon;
  label: string;
 
}

// Mapa de configuración — sincronizado con el seed del backend
export const MODULE_CONFIG: Record<string, ModuleConfig> = {
  dashboard:   { slug: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard'  },
  vehicles:    { slug: 'vehicles',    icon: Truck,           label: 'Vehículos' },
  consumables: { slug: 'consumables', icon: Package,         label: 'Consumibles' },
  tools:       { slug: 'tools',       icon: Wrench,          label: 'Herramientas' },
  equipment:   { slug: 'equipment',   icon: Settings2,       label: 'Equipos'},
  reports:     { slug: 'reports',     icon: FileBarChart,    label: 'Reportes' },
  monitoring:  { slug: 'monitoring',  icon: Activity,        label: 'Monitoreo' },
  users:       { slug: 'users',       icon: Users,           label: 'Usuarios',},
  settings:    { slug: 'settings',    icon: Settings,        label: 'Configuración'  },
};
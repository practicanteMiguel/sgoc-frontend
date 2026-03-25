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
  route: string;
}

// Mapa de configuración — sincronizado con el seed del backend
export const MODULE_CONFIG: Record<string, ModuleConfig> = {
  dashboard:   { slug: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard',     route: '/dashboard'   },
  vehicles:    { slug: 'vehicles',    icon: Truck,           label: 'Vehículos',     route: '/vehicles'    },
  consumables: { slug: 'consumables', icon: Package,         label: 'Consumibles',   route: '/consumables' },
  tools:       { slug: 'tools',       icon: Wrench,          label: 'Herramientas',  route: '/tools'       },
  equipment:   { slug: 'equipment',   icon: Settings2,       label: 'Equipos',       route: '/equipment'   },
  reports:     { slug: 'reports',     icon: FileBarChart,    label: 'Reportes',      route: '/reports'     },
  monitoring:  { slug: 'monitoring',  icon: Activity,        label: 'Monitoreo',     route: '/monitoring'  },
  users:       { slug: 'users',       icon: Users,           label: 'Usuarios',      route: '/users'       },
  settings:    { slug: 'settings',    icon: Settings,        label: 'Configuración', route: '/settings'    },
};
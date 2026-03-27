'use client';

import { Activity } from 'lucide-react';
import { ModulePlaceholder } from '../../ui/module-placeholder';

export function MonitoringView() {
  return (
    <ModulePlaceholder
      moduleSlug="monitoring"
      icon={Activity}
      title="Monitoreo Operativo"
      description="Indicadores en tiempo real del estado de la operación del contrato"
      features={[
        {
          label:       'Dashboard de vehículos',
          description: 'Operativos, en mantenimiento, con daños pendientes y fuera de servicio',
        },
        {
          label:       'Indicadores de consumibles',
          description: 'Solicitudes pendientes, consumo excesivo y alertas de stock bajo',
        },
        {
          label:       'Estado de reportes',
          description: 'Reportes enviados vs pendientes por supervisor y período',
        },
        {
          label:       'Gráficas históricas',
          description: 'Tendencias de uso de recursos por campo y cuadrilla',
        },
        {
          label:       'Alertas automáticas',
          description: 'Notificaciones por vehículos sin mantenimiento, stock crítico y reportes atrasados',
        },
      ]}
    />
  );
}
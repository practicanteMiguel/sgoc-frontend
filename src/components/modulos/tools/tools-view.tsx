'use client';

import { Wrench } from 'lucide-react';
import { ModulePlaceholder } from '../../ui/module-placeholder';

export function ToolsView() {
  return (
    <ModulePlaceholder
      moduleSlug="tools"
      icon={Wrench}
      title="Gestión de Herramientas"
      description="Inventario y trazabilidad de herramientas asignadas a cuadrillas"
      features={[
        {
          label:       'Inventario de herramientas',
          description: 'Registro con tipo, marca, serial, estado y cuadrilla asignada',
        },
        {
          label:       'Asignación y devolución',
          description: 'Control de préstamos con fecha de salida, responsable y devolución esperada',
        },
        {
          label:       'Estado de herramientas',
          description: 'Disponible, en uso, en reparación, dada de baja',
        },
        {
          label:       'Reporte de daños o pérdidas',
          description: 'Registro de incidentes con descripción y responsable',
        },
        {
          label:       'Historial por herramienta',
          description: 'Todas las asignaciones y eventos de una herramienta específica',
        },
      ]}
    />
  );
}
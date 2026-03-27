'use client';

import { FileBarChart } from 'lucide-react';
import { ModulePlaceholder } from '../../ui/module-placeholder';

export function ReportsView() {
  return (
    <ModulePlaceholder
      moduleSlug="reports"
      icon={FileBarChart}
      title="Reportes Operativos"
      description="Reportes mensuales de supervisores y consolidados administrativos"
      features={[
        {
          label:       'Reporte mensual de supervisores',
          description: 'Novedades de personal, horas extras, ausencias y cambios de turno',
        },
        {
          label:       'Plantilla estandarizada',
          description: 'Formulario uniforme para todos los supervisores con campos obligatorios',
        },
        {
          label:       'Consolidado por período',
          description: 'Vista coordinador con todos los reportes del mes en un solo lugar',
        },
        {
          label:       'Historial de reportes',
          description: 'Búsqueda y filtro por supervisor, campo y rango de fechas',
        },
        {
          label:       'Exportación',
          description: 'Descarga de reportes en PDF y Excel para gestión administrativa',
        },
      ]}
    />
  );
}
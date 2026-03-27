'use client';

import { Truck } from 'lucide-react';
import { ModulePlaceholder } from '../../ui/module-placeholder';

export function VehiclesView() {
  return (
    <ModulePlaceholder
      moduleSlug="vehicles"
      icon={Truck}
      title="Gestión de Vehículos"
      description="Control y trazabilidad de vehículos asignados a cuadrillas y supervisores"
      features={[
        {
          label:       'Registro de vehículos',
          description: 'Tipo, placa, modelo, capacidad, campo asignado y supervisor responsable',
        },
        {
          label:       'Asignación a cuadrillas',
          description: 'Asignar vehículo a supervisor, cuadrilla o recorredor con fecha y observaciones',
        },
        {
          label:       'Estados operativos',
          description: 'Operativo, operativo con problemas, en mantenimiento, fuera de servicio, pendiente',
        },
        {
          label:       'Reporte de daños',
          description: 'Registro de daños con descripción, responsable, fecha y evidencia fotográfica',
        },
        {
          label:       'Historial de mantenimiento',
          description: 'Mantenimientos realizados, taller, días en taller, costo y tipo de servicio',
        },
        {
          label:       'Trazabilidad completa',
          description: 'Historial de asignaciones, daños, mantenimientos y cambios de estado por vehículo',
        },
      ]}
    />
  );
}
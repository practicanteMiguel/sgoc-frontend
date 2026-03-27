'use client';

import { Settings2 } from 'lucide-react';
import { ModulePlaceholder } from '../../ui/module-placeholder';

export function EquipmentView() {
  return (
    <ModulePlaceholder
      moduleSlug="equipment"
      icon={Settings2}
      title="Gestión de Equipos"
      description="Control de equipos tecnológicos y de medición asignados a la operación"
      features={[
        {
          label:       'Registro de equipos',
          description: 'Tipo, marca, modelo, serial, campo asignado y supervisor responsable',
        },
        {
          label:       'Asignación a personal',
          description: 'Control de quién tiene cada equipo con fecha y condiciones de entrega',
        },
        {
          label:       'Estado operativo',
          description: 'Operativo, en calibración, en reparación, fuera de servicio',
        },
        {
          label:       'Mantenimiento preventivo',
          description: 'Calendario de mantenimientos, calibraciones y revisiones periódicas',
        },
        {
          label:       'Historial completo',
          description: 'Asignaciones, mantenimientos y eventos de cada equipo',
        },
      ]}
    />
  );
}
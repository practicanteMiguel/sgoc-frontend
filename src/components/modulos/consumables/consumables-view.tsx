'use client';

import { Package } from 'lucide-react';
import { ModulePlaceholder } from '../../ui/module-placeholder';

export function ConsumablesView() {
  return (
    <ModulePlaceholder
      moduleSlug="consumables"
      icon={Package}
      title="Gestión de Consumibles"
      description="Control de entregas y consumo de insumos y EPP por cuadrilla"
      features={[
        {
          label:       'Catálogo de insumos',
          description: 'Registro de consumibles por categoría: EPP, herramientas menores, víveres, etc.',
        },
        {
          label:       'Solicitudes de insumos',
          description: 'Supervisores generan solicitudes formales con insumo, cantidad y cuadrilla solicitante',
        },
        {
          label:       'Registro de entregas',
          description: 'Control de entrega con fecha, responsable y supervisor receptor',
        },
        {
          label:       'Historial de consumo',
          description: 'Consumo por cuadrilla, supervisor y tipo de insumo para detectar uso excesivo',
        },
        {
          label:       'Control de stock',
          description: 'Seguimiento de stock disponible y alertas de reabastecimiento',
        },
      ]}
    />
  );
}
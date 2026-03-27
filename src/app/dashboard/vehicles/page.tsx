import { VehiclesView } from "@/src/components/modulos/vehicles/vehicles-view";
import { ModuleGuard } from "@/src/components/layout/module-guard";

export default function vehiclesPage() {
  return (
    <ModuleGuard slug="vehicles">
 
      <VehiclesView />
    </ModuleGuard>
  );
}

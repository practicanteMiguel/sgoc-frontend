import { EquipmentView } from "@/src/components/modulos/equipment/equipment-view";
import { ModuleGuard } from "@/src/components/layout/module-guard";

export default function EquipmentPage() {
  return (
    <ModuleGuard slug="equipment">
 
      <EquipmentView />
    </ModuleGuard>
  );
}

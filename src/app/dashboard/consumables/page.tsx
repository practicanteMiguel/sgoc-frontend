import { ConsumablesView } from "@/src/components/modulos/consumables/consumables-view";
import { ModuleGuard } from "@/src/components/layout/module-guard";
export default function ConsumablesPage() {
    return (
        <ModuleGuard slug="consumables">
            <ConsumablesView /> 
        </ModuleGuard>
    );
}
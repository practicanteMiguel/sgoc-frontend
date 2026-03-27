import { ToolsView } from "@/src/components/modulos/tools/tools-view";
import { ModuleGuard } from "@/src/components/layout/module-guard";

export default function ToolsPage() {
  return (
    <ModuleGuard slug="tools">
    
      <ToolsView />
    </ModuleGuard>
  );
}

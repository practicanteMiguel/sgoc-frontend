import { MonitoringView } from "@/src/components/modulos/monitoring/monitoring-view";
import { ModuleGuard } from "@/src/components/layout/module-guard";

export default function MonitoringPage() {
  return (
    <ModuleGuard slug="monitoring">
   
      <MonitoringView />
    </ModuleGuard>
  );
}

import { DashboardView } from "@/src/components/modulos/dashboard/dashboard-view";
import { ModuleGuard } from "@/src/components/layout/module-guard";
export default function DashboardPage() {
  return (
    <ModuleGuard slug="dashboard">
      <DashboardView />
    </ModuleGuard>
  );
}

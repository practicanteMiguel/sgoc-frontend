import { ReportsView } from "@/src/components/modulos/reports/reports-view";
import { ModuleGuard } from "@/src/components/layout/module-guard";

export default function ReportsPage() {
  return (
    <ModuleGuard slug="reports">
      {" "}
      <ReportsView />{" "}
    </ModuleGuard>
  );
}

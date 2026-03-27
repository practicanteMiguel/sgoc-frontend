import { UsersView } from "@/src/components/modulos/users/users-view";
import { ModuleGuard } from "@/src/components/layout/module-guard";

export default function UsersPage() {
    return (
        <ModuleGuard slug="users">
            <UsersView />
        </ModuleGuard>
    )
}
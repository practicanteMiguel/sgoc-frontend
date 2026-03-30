import { SidebarItem } from "./sidebar-item";
import { useMyModules } from "@/src/hooks/dashboard/use-modules";
import { useAuthStore } from "@/src/stores/auth.store";
import { MODULE_CONFIG } from "@/src/config/modules.config";
import { Loader2 } from "lucide-react";
import { getInitials, ROLE_LABELS } from "@/src/lib/utils";
export default function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuthStore();
  const { data: modules, isLoading, isError } = useMyModules();

  const roleLabel = user?.roles?.[0]
    ? (ROLE_LABELS[user.roles[0]] ?? user.roles[0])
    : "";

  return (
    <>
      {/* Logo */}
      <div
        className="flex items-center h-14 px-4 gap-3 shrink-0"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div
          className="w-7 h-7 rounded flex items-center justify-center font-display font-bold text-sm shrink-0"
          style={{ background: "var(--sidebar-active-bg)", color: "#fff" }}
        >
          G
        </div>
        {!collapsed && (
          <span
            className="font-display text-sm tracking-widest uppercase truncate"
            style={{ color: "var(--sidebar-logo-text)" }}
          >
            Gestión Op.
          </span>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-0.5 stagger">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2
              size={16}
              className="animate-spin"
              style={{ color: "var(--sidebar-text-muted)" }}
            />
          </div>
        )}
        {isError && (
          <p
            className="text-xs text-center px-2 py-4"
            style={{ color: "var(--sidebar-text-muted)" }}
          >
            Error al cargar módulos
          </p>
        )}
        {!isLoading &&
          !isError &&
          modules?.map((mod) => {
            const cfg = MODULE_CONFIG[mod.slug];
            if (!cfg) return null;
            return (
              <SidebarItem
                key={mod.slug}
                href={mod.route}
                label={cfg.label}
                icon={cfg.icon}
                collapsed={collapsed}
                onClick={onNavigate}
              />
            );
          })}
        {!isLoading && !isError && modules?.length === 0 && (
          <p
            className="text-xs text-center px-2 py-6"
            style={{ color: "var(--sidebar-text-muted)" }}
          >
            Sin módulos asignados
          </p>
        )}
      </nav>

      {/* Usuario */}
      {user && (
        <div
          className="p-3 shrink-0"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-display shrink-0"
              style={{ background: "var(--sidebar-avatar-bg)", color: "#fff" }}
            >
              {getInitials(user.first_name, user.last_name)}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {user.first_name} {user.last_name}
                </p>
                <p
                  className="text-xs truncate mt-0.5"
                  style={{ color: "var(--sidebar-text-muted)" }}
                >
                  {roleLabel}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

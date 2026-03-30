"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Sun, Moon, LogOut, User, Loader2, Menu } from "lucide-react";
import { useAuthStore } from "@/src/stores/auth.store";
import { useLogout } from "@/src/hooks/auth/use-auth";
import { useUnreadCount } from "@/src/hooks/settings/use-notifications";
import { NotificationPanel } from "./notification-panel";
import { MODULE_CONFIG } from "@/src/config/modules.config";
import { getInitials } from "@/src/lib/utils";
import Link from "next/link";
import { useMyModules } from "@/src/hooks/dashboard/use-modules";

interface HeaderProps {
  onMenuClick: () => void;
}
export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { user, theme, toggleTheme } = useAuthStore();
  const logout = useLogout();
  const { data: modules } = useMyModules();
  const { data: unreadData } = useUnreadCount();
  const unread = unreadData?.count ?? 0;

  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setShowProfile(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const currentModule = modules?.find(
    (m) => pathname === m.route || pathname.startsWith(m.route + "/"),
  );
  const currentLabel = currentModule
    ? (MODULE_CONFIG[currentModule.slug]?.label ?? currentModule.name)
    : "Dashboard";

  return (
    <header
      className="flex items-center justify-between px-4 lg:px-5 h-14 shrink-0"
      style={{
        background: "var(--color-surface-0)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: "var(--color-text-400)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-surface-2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>
        )}

        <h1
          className="text-sm font-semibold font-display tracking-wide uppercase"
          
        >
          {currentLabel}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ color: "var(--color-text-400)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--color-surface-2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifs(!showNotifs);
              setShowProfile(false);
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center relative transition-all"
            style={{ color: "var(--color-text-400)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-surface-2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <Bell size={16} />
            {unread > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold animate-pulse-accent"
                style={{
                  background: "var(--color-secondary)",
                  fontSize: "9px",
                }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {showNotifs && (
            <NotificationPanel onClose={() => setShowNotifs(false)} />
          )}
        </div>

        <div className="relative ml-1" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifs(false);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-display transition-all hover:scale-105"
            style={{ background: "var(--color-secondary)", color: "#fff" }}
          >
            {user ? getInitials(user.first_name, user.last_name) : "?"}
          </button>

          {showProfile && (
            <div
              className="absolute right-0 top-10 w-52 rounded-xl overflow-hidden animate-fade-in z-50"
              style={{
                background: "var(--color-surface-0)",
                border: "1px solid var(--color-border)",
                boxShadow: "0 8px 32px rgba(7,44,44,0.12)",
              }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: "var(--color-text-900)" }}
                >
                  {user?.first_name} {user?.last_name}
                </p>
                <p
                  className="text-xs truncate mt-0.5"
                  style={{ color: "var(--color-text-400)" }}
                >
                  {user?.email}
                </p>
              </div>
              <div className="p-1.5 flex flex-col gap-0.5">
                <Link
                  href="/settings"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors"
                  style={{ color: "var(--color-text-600)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--color-surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }}
                >
                  <User size={14} /> Mi perfil
                </Link>
                <button
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs w-full text-left"
                  style={{ color: "var(--color-danger)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--color-danger-bg)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }}
                >
                  {logout.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <LogOut size={14} />
                  )}
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

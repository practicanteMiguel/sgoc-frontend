"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Menu, X, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import SidebarContent from "./sidebar-content";

interface SidebarProps {
  mobileOpen: boolean;
 onMobileToggle: () => void;
}
export function Sidebar({ mobileOpen, onMobileToggle }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
 
  const pathname = usePathname();

  useEffect(() => {
    if (mobileOpen) onMobileToggle();
    
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto" };
    
  }, [mobileOpen]);


  return (
    <>
 
      <aside
        className="hidden lg:flex flex-col h-full flex-shrink-0 relative transition-all duration-300 ease-in-out"
        style={{
          width: collapsed ? "64px" : "224px",
          background: "var(--sidebar-bg)",
        }}
      >
        <SidebarContent collapsed={collapsed} />

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all hover:scale-110"
          style={{
            background: "var(--color-surface-0)",
            border: "1px solid var(--color-border)",
          
            boxShadow: "0 2px 6px rgba(7,44,44,0.15)",
          }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>


   
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{
            background: "rgba(4,24,24,0.6)",
            backdropFilter: "blur(2px)",
          }}
          onClick={onMobileToggle}
        />
      )}

     
      <aside
        className="lg:hidden fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          width: "260px",
          background: "var(--sidebar-bg)",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          boxShadow: mobileOpen ? "4px 0 24px rgba(4,24,24,0.4)" : "none",
        }}
      >
        <SidebarContent
          collapsed={false}
          onNavigate={onMobileToggle}
        />
      </aside>
    </>
  );
}

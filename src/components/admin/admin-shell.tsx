"use client";

import { AdminSidebar } from "./admin-sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { collapsed, toggle } = useSidebar();

  return (
    <div className="min-h-screen">
      <AdminSidebar collapsed={collapsed} onToggle={toggle} />
      <main
        className={cn(
          "transition-all duration-200 min-h-screen",
          collapsed ? "ml-[60px]" : "ml-[220px]"
        )}
      >
        {children}
      </main>
    </div>
  );
}

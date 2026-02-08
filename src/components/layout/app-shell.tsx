"use client";

import { Sidebar } from "./sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed, toggle } = useSidebar();

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
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

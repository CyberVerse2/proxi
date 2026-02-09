"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

export function ChatShell({ children }: { children: React.ReactNode }) {
  const { collapsed, toggle } = useSidebar();

  /* Lock body scroll while chat is mounted */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100dvh";
    body.style.height = "100dvh";
    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.height = "";
      body.style.height = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main
        className={cn(
          "flex-1 h-full overflow-hidden flex",
          collapsed ? "ml-[60px]" : "ml-[220px]"
        )}
      >
        {children}
      </main>
    </div>
  );
}

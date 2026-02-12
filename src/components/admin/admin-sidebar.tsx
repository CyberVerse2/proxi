"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Users,
  Activity,
  MessageSquare,
  Coins,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/proxies", icon: Bot, label: "Proxies" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/ingestion", icon: Activity, label: "Ingestion" },
  { href: "/admin/queue", icon: MessageSquare, label: "Queue" },
  { href: "/admin/tokens", icon: Coins, label: "Tokens" },
];

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-screen bg-dark2/80 backdrop-blur-md border-r border-white/6 flex flex-col z-9999 transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo + Collapse toggle */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/6">
        <div className="flex items-center gap-2">
          {collapsed ? (
            <Image src="/image.png" alt="Proxi" width={20} height={20} className="shrink-0" />
          ) : (
            <>
              <Image src="/logotext.png" alt="Proxi" width={80} height={22} className="shrink-0" />
              <span className="text-[10px] font-bold uppercase text-lime bg-lime/10 px-1.5 py-0.5 rounded">
                Admin
              </span>
            </>
          )}
        </div>
        <button
          onClick={onToggle}
          className="text-gray hover:text-white transition-colors cursor-pointer shrink-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] no-underline transition-colors",
                active
                  ? "bg-lime/10 text-lime"
                  : "text-gray hover:text-white hover:bg-white/4",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Back to app link */}
      <div className="border-t border-white/6 p-2">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] no-underline transition-colors text-gray hover:text-white hover:bg-white/4",
            collapsed && "justify-center px-0"
          )}
        >
          <ArrowLeft size={18} className="shrink-0" />
          {!collapsed && <span>Back to App</span>}
        </Link>
      </div>
    </aside>
  );
}

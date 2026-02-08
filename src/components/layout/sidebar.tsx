"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Compass, Briefcase, Trophy,
  ChevronLeft, ChevronRight, MessageSquare, User, Cog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileMenu } from "./profile-menu";

interface SidebarProps { collapsed: boolean; onToggle: () => void }

const navSections = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/explore", icon: Compass, label: "Explore" },
      { href: "/portfolio", icon: Briefcase, label: "Portfolio" },
      { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    ],
  },
  {
    label: "My Proxy",
    items: [
      { href: "/proxy", icon: User, label: "My Proxy" },
      { href: "/dashboard/queue", icon: MessageSquare, label: "Queue" },
      { href: "/setup", icon: Cog, label: "Setup Wizard" },
    ],
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
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
          <Image src="/tools/proxi-logo.png" alt="Proxi" width={collapsed ? 30 : 40} height={collapsed ? 30 : 40} className="shrink-0" />
          {!collapsed && <span className="font-heading text-white text-lg tracking-tight">proxi</span>}
        </div>
        <button
          onClick={onToggle}
          className="text-gray hover:text-white transition-colors cursor-pointer shrink-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <span className="px-2 text-[10px] font-medium uppercase text-gray/50 tracking-wider">
                {section.label}
              </span>
            )}
            <div className="mt-1.5 space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
            </div>
          </div>
        ))}
      </nav>

      {/* Profile section at bottom */}
      <ProfileMenu collapsed={collapsed} />
    </aside>
  );
}

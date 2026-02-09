"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Settings, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface ProfileMenuProps {
  collapsed: boolean;
}

export function ProfileMenu({ collapsed }: ProfileMenuProps) {
  const { xHandle, xProfileImageUrl, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    // Use setTimeout so the opening click doesn't immediately close it
    const id = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);

    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={menuRef} className="border-t border-white/6 relative">
      {/* Dropdown menu */}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 bg-dark3 border border-white/8 rounded-xl py-1 shadow-xl min-w-[180px]",
            collapsed
              ? "bottom-0 left-full ml-2"
              : "bottom-full left-2 right-2 mb-1"
          )}
        >
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray hover:text-white hover:bg-white/4 no-underline transition-colors"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Settings size={15} />
            Settings
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-400 hover:text-red-300 hover:bg-white/4 w-full cursor-pointer transition-colors"
            role="menuitem"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      )}

      {/* Profile button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-3 cursor-pointer hover:bg-white/4 transition-colors",
          collapsed && "justify-center px-0"
        )}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/8 overflow-hidden shrink-0">
          {xProfileImageUrl ? (
            <img
              src={xProfileImageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={14} className="text-gray" />
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="flex-1 text-left min-w-0">
            <p className="text-white text-[13px] font-medium truncate">
              {xHandle ? `@${xHandle}` : "Account"}
            </p>
          </div>
        )}
      </button>
    </div>
  );
}

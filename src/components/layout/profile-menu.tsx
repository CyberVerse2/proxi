"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Settings, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface ProfileMenuProps {
  collapsed: boolean;
}

export function ProfileMenu({ collapsed }: ProfileMenuProps) {
  const { xHandle, xProfileImageUrl, logout } = useAuth();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Close the menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false;
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="border-t border-white/6">
      <details ref={detailsRef} className="group relative">
        {/* Dropdown — renders above the summary via absolute positioning */}
        <div
          role="menu"
          className="absolute bottom-full left-2 right-2 mb-1 bg-dark3 border border-white/8 rounded-xl py-1 shadow-xl z-50 hidden group-open:block"
        >
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray hover:text-white hover:bg-white/4 no-underline transition-colors"
            role="menuitem"
            onClick={() => {
              if (detailsRef.current) detailsRef.current.open = false;
            }}
          >
            <Settings size={15} />
            Settings
          </Link>
          <button
            onClick={() => {
              if (detailsRef.current) detailsRef.current.open = false;
              logout();
            }}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-400 hover:text-red-300 hover:bg-white/4 w-full cursor-pointer transition-colors"
            role="menuitem"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>

        <summary
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-3 cursor-pointer hover:bg-white/4 transition-colors list-none [&::-webkit-details-marker]:hidden",
            collapsed && "justify-center px-0"
          )}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/8 overflow-hidden shrink-0">
            {xProfileImageUrl ? (
              <img src={xProfileImageUrl} alt="" className="w-full h-full object-cover" />
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
        </summary>
      </details>
    </div>
  );
}

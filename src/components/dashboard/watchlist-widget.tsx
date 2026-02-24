"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { SidebarRow } from "@/components/dashboard/sidebar-row";
import type { Proxy } from "@/lib/db/schema";
import { DEFAULT_AVATAR } from "@/lib/config/constants";

export function WatchlistWidget() {
  const { user, authenticated, ready } = useAuth();
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated || !user?.id) return;
    fetch(`/api/watchlist?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((items) => {
        if (Array.isArray(items)) {
          setProxies(items.map((item: { proxy: Proxy }) => item.proxy));
        }
      })
      .catch(() => {});
  }, [ready, authenticated, user?.id]);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-base">Watchlist</h3>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray hover:text-white cursor-pointer bg-transparent border-none transition-colors"
        >
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>
      {!collapsed && (
        <div className="space-y-2">
          {proxies.length > 0 ? (
            proxies.map((proxy) => (
              <SidebarRow
                key={proxy.id}
                name={proxy.displayName || proxy.xHandle}
                avatar={proxy.avatarUrl || DEFAULT_AVATAR}
                price={proxy.price ?? 0}
                change={proxy.priceChange24h ?? 0}
                href={`/${proxy.xHandle}`}
              />
            ))
          ) : (
            <p className="text-gray text-sm py-2">No proxies on your watchlist</p>
          )}
        </div>
      )}
    </Card>
  );
}

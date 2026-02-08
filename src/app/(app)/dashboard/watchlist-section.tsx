"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ProxyCard } from "@/components/proxy/proxy-card";
import { useAuth } from "@/hooks/use-auth";
import type { Proxy } from "@/lib/db/schema";

export function WatchlistSection() {
  const { user, authenticated, ready } = useAuth();
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user?.id) {
      setLoading(false);
      return;
    }

    fetch(`/api/watchlist?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((items) => {
        if (Array.isArray(items)) {
          setProxies(items.map((i: { proxy: Proxy }) => i.proxy));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authenticated, user?.id, ready]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Your Watchlist</h2>
        <Link href="/explore" className="text-gray text-xs hover:text-white no-underline">
          Add proxies
        </Link>
      </div>
      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-lime/30 border-t-lime rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray text-xs">Loading watchlist...</p>
        </div>
      ) : proxies.length > 0 ? (
        <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-none">
          {proxies.map((p) => <ProxyCard key={p.id} proxy={p} />)}
        </div>
      ) : (
        <div className="text-center py-8">
          <Eye size={32} className="text-gray/30 mx-auto mb-2" />
          <p className="text-gray text-sm">No proxies in your watchlist yet</p>
          <p className="text-gray/60 text-xs mt-1">Browse the explore page to add proxies to watch</p>
        </div>
      )}
    </Card>
  );
}

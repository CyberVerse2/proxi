"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import type { Proxy } from "@/lib/db/schema";

/* ================================================================
   Leaderboard Widget
   ================================================================ */
export function LeaderboardWidget() {
  const { user, authenticated, ready } = useAuth();
  const [rank, setRank] = useState<number | null>(null);
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!ready || !authenticated || !user?.id) return;
    fetch(`/api/leaderboard?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const me = data.find(
            (e: { leaderboard: { userId: string } }) =>
              e.leaderboard?.userId === user?.id
          );
          if (me) {
            setRank(me.leaderboard?.rank ?? null);
            setPoints(me.leaderboard?.points ?? 0);
          }
        }
      })
      .catch(() => {});
  }, [ready, authenticated, user?.id]);

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-white font-semibold text-base">Leaderboard</h3>
        <p className="text-gray text-xs mt-0.5">
          Earn points by being a user of Proxi.
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray text-sm">Rank</span>
          <span className="text-white text-base font-semibold">
            {rank ? `#${rank}` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray text-sm">Points earned</span>
          <span className="text-white text-base font-semibold">
            {points !== null ? points.toLocaleString() : "—"}
          </span>
        </div>
      </div>
      <Link href="/leaderboard" className="block no-underline">
        <Button variant="outline" size="sm" className="w-full rounded-lg text-sm">
          Go to leaderboard
        </Button>
      </Link>
    </Card>
  );
}

/* ================================================================
   Holdings Widget
   ================================================================ */
interface Holding {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  price: number;
  change24h: number;
}

export function HoldingsWidget() {
  const { walletAddress, authenticated, ready } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated || !walletAddress) return;
    fetch(`/api/portfolio?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHoldings(data);
      })
      .catch(() => {});
  }, [ready, authenticated, walletAddress]);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-base">My holdings</h3>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray hover:text-white cursor-pointer bg-transparent border-none transition-colors"
        >
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>
      {!collapsed && (
        <div className="space-y-2">
          {holdings.length > 0 ? (
            holdings.map((h) => (
              <SidebarRow key={h.id} name={h.name} avatar={h.avatar} price={h.price} change={h.change24h} />
            ))
          ) : (
            <p className="text-gray text-sm py-2">No holdings yet</p>
          )}
        </div>
      )}
    </Card>
  );
}

/* ================================================================
   Watchlist Widget
   ================================================================ */
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
          setProxies(items.map((i: { proxy: Proxy }) => i.proxy));
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
            proxies.map((p) => (
              <SidebarRow
                key={p.id}
                name={p.displayName || p.xHandle}
                avatar={p.avatarUrl || "/mock-avatar.jpg"}
                price={p.price ?? 0}
                change={p.priceChange24h ?? 0}
                href={`/${p.xHandle}`}
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

/* ================================================================
   Shared row component
   ================================================================ */
function SidebarRow({
  name, avatar, price, change, href,
}: {
  name: string; avatar: string; price: number; change: number; href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between py-1.5 group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/6">
          <Image src={avatar} alt={name} width={36} height={36} className="object-cover w-full h-full" />
        </div>
        <span className="text-white text-sm font-medium truncate group-hover:text-lime transition-colors">{name}</span>
      </div>
      <div className="text-right shrink-0 ml-3">
        <span className="text-white text-sm block">${price.toFixed(2)}</span>
        <span className="text-gray text-xs">{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="no-underline block">{content}</Link>;
  }
  return content;
}
